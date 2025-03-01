"use strict";

const request = require("supertest");

const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /auth/token */

describe("POST /auth/token", function () {
  test("works", async function () {
    const resp = await request(app)
        .post("/auth/token")
        .send({
          username: "u1",
          password: "password1",
        });
    expect(resp.body).toEqual({
      "token": expect.any(String),
    });
  });

  test("unauth with non-existent user", async function () {
    const resp = await request(app)
        .post("/auth/token")
        .send({
          username: "no-such-user",
          password: "password1",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth with wrong password", async function () {
    const resp = await request(app)
        .post("/auth/token")
        .send({
          username: "u1",
          password: "nope",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/auth/token")
        .send({
          username: "u1",
        });
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/auth/token")
        .send({
          username: 42,
          password: "above-is-a-number",
        });
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** POST /auth/register */

describe("POST /auth/register", function () {
  test("works for anon", async function () {
    const resp = await request(app)
        .post("/auth/register")
        .send({
          username: "new",
          firstName: "first",
          lastName: "last",
          password: "password",
          email: "new@email.com",
        });
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      "token": expect.any(String),
    });
  });

  test("unauthorized for normal users registering as admin", async function () {
    const resp = await request(app)
      .post("/auth/register")
      .send({
        username: "hacker",
        firstName: "Hacker",
        lastName: "User",
        password: "password",
        email: "hacker@email.com",
        isAdmin: true, // Trying to register as an admin
      })
      .set("authorization", `Bearer ${userToken}`); // Normal user token
    expect(resp.statusCode).toEqual(401);
  });

  test("works for admins registering another admin", async function () {
    const resp = await request(app)
      .post("/auth/register")
      .send({
        username: "adminuser",
        firstName: "Admin",
        lastName: "User",
        password: "password",
        email: "adminuser@email.com",
        isAdmin: true, // Admin user
      })
      .set("authorization", `Bearer ${adminToken}`); // Admin token
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      token: expect.any(String),
    });
  });

  test("bad request with missing fields", async function () {
    const resp = await request(app).post("/auth/register").send({
      username: "new",
    });
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid email format", async function () {
    const resp = await request(app).post("/auth/register").send({
      username: "newuser",
      firstName: "First",
      lastName: "Last",
      password: "password",
      email: "invalid-email", // Invalid email format
    });
    expect(resp.statusCode).toEqual(400);
  });
});

