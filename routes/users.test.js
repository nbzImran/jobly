"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");
const { NotFoundError } = require("../expressError");
require("dotenv")

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for users: create non-admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: false,
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      }, token: expect.any(String),
    });
  });

  test("works for users: create admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      }, token: expect.any(String),
    });
  });

  test("works for admins: creates user with random password", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${process.env.adminToken}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
      tempPassword: expect.any(String) 
    });
  });

  test("fails for non-admins", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${userToken}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);  
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "not-an-email",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
          jobs: [],
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
          jobs: [],
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
          jobs: [],
        },
      ],
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .get(`/users/u1`)
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        jobs: [],
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});



/************************************** applyForJob */

describe("applyForJob", function () {
  test("works: user applies for a job with defailt state 'applied'", async function () {
    // Get an existing job ID
    const jobRes = await db.query(`SELECT id FROM jobs LIMIT 1`);
    const jobId = jobRes.rows[0].id;

    // Apply for job
    await User.applyForJob("u1", jobId);

    // Check if application exists in the database
    const res = await db.query(
      `SELECT * FROM applications WHERE username = 'u1' AND job_id = $1`, [jobId]
    );
    expect(res.rows.length).toEqual(1);
  });

  test("works: applies with custom state", async function () {
    const jobRes = await db.query(`SELECT id FROM jobs LIMIT 1`);
    const jobId = jobRes.rows[0].id;

    await User.applyForJob("u1", jobId, "interested");

    const res = await db.query(
      `SELECT * FROM applications WHERE username = 'u1' AND job_id = $1`, [jobId]
    );
    expect(res.rows[0].state).toEqual("interested");
  });

  test("fails with invalid state", async function () {
    const jobRes = await db.query(`SELECT id FROM jobs LIMIT 1`);
    const jobId = jobRes.rows[0].id;

    await expect(User.applyForJob("u1", jobId, "invalidState")).rejects.toThrow();
  });

  test("not found if no such user", async function () {
    const jobRes = await db.query(`SELECT id FROM jobs LIMIT 1`);
    const jobId = jobRes.rows[0].id;

    await expect(User.applyForJob("no-user", jobId)).rejects.toThrow(NotFoundError);
  });

  test("not found if no such job", async function () {
    await expect(User.applyForJob("u1", 999999)).rejects.toThrow(NotFoundError);
  });

  test("duplicate application should not be allowed", async function () {
    // Get an existing job ID
    const jobRes = await db.query(`SELECT id FROM jobs LIMIT 1`);
    const jobId = jobRes.rows[0].id;

    // First application (should work)
    await User.applyForJob("u1", jobId);

    // Second application (should fail)
    await expect(User.applyForJob("u1", jobId)).rejects.toThrow();
  });
});


/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for users", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({
          firstName: "Nope",
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: 42,
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: set new password", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${process.env.adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .delete(`/users/u1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
