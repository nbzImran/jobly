"use strict";

/** Routes for authentication. */

const jsonschema = require("jsonschema");

const User = require("../models/user");
const express = require("express");
const router = new express.Router();
const { createToken } = require("../helpers/tokens");
const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const { authenticateJWT, ensureAdmin } = require("../middleware/auth");

/** POST /auth/token:  { username, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/token", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userAuthSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { username, password } = req.body;
    const user = await User.authenticate(username, password);
    const token = createToken(user);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});


/** POST /auth/register:   { user } => { token }
 *
 * user must include { username, password, firstName, lastName, email }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/register", authenticateJWT, async function (req, res, next) {
  try {
    const { username, firstName, lastName, password, email, isAdmin} = req.body

    // ensure required fields are provided
    if (!username || !firstName || !lastName || !password || !email) {
      throw new BadRequestError("Missing required fields.");
    }

    const validator = jsonschema.validate(
      { username, firstName, lastName, password, email, isAdmin },
      userRegisterSchema
      );


    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // Ensure only admins can set isAdmin = true
    if (isAdmin && (!res.locals.user || !res.locals.user.isAdmin)) {
      throw new UnauthorizedError("Only admins can register new admins.");
    }


    
    
    // Default all user to is Admin: false unless an admin explicitly sets it
    const newUser = await User.register({ username, firstName, lastName, password, email, isAdmin: isAdmin || false });

    const token = createToken(newUser);
    return res.status(201).json({ token });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
