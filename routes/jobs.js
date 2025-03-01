"use strict";


const express = require("express");
const jsonschema = require("jsonschema");
const { ensureAdmin } = require("../middleware/auth");
const { BadrequestError } = require("../expressError");
const Job = require("../models/jobs");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");


const router = express.Router();


/* Post /{job} => { job}
Add a new job.requires admin access.
Returns { id, title, salary, equity, company_hamdle }
*/

router.post("/", ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if(!validator.valid) {
            throw new BadrequestError(validator.errors.map( e => e.stack));
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (e) {
        return next(e);
    }
})


/** GET / => { jobs: [{ id, title, salary, equity, company_handle }, ...] }
 * Open to all users.
 * 
 * can filter using:
 * title (case-insensitive, partial match)
 * minSalary (minimum salary requirments)
 * hasEquity (true -> jobs with equity only)
 * 
 * Authorization required: none
 * 
 **/
router.get("/", async function (req, res, next) {
    try {
        let { title, minSalary, hasEquity } = req.query;

        // conver query parameters to correct types
        if (minSalary !== undefined) minSalary = Number(minSalary);
        if (hasEquity !== undefined) hasEquity = hasEquity === "true";

        // Fetch jobs based on filters
        const jobs = await Job.findAll({ title, minSalary, hasEquity });

        // Fetch all technologies at once
        const techMap = await Job.getAllTechnologies();

        // Attach technologies to jobs in one loop
        for (let job of jobs) {
        job.technologies = techMap[job.id] || []; // Default to empty array
        }

        return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
  });



  /** GET /[id] => { job }
 * Returns job by ID.
 * Open to all users.
 **/
router.get("/:id", async function (req, res, next) {
    try {
      const job = await Job.get(req.params.id);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });



  /** PATCH /[id] { job } => { job }
 * Updates job details (excluding company_handle).
 * Requires admin access.
 **/
router.patch("/:id", ensureAdmin, async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        throw new BadRequestError(validator.errors.map(e => e.stack));
      }
  
      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });


  /** DELETE /[id] => { deleted: id }
 * Requires admin access.
 **/
router.delete("/:id", ensureAdmin, async function (req, res, next) {
    try {
      await Job.remove(req.params.id);
      return res.json({ deleted: req.params.id });
    } catch (err) {
      return next(err);
    }
  });
  
  module.exports = router;
  