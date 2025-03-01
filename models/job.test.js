"use strict";

const db = require("../db");
const Job = require("./job");
const { NotFoundError, BadRequestError } = require("../expressError");

beforeAll(async () => {
  await db.query("DELETE FROM jobs");
});

afterAll(async () => {
  await db.end();
});

describe("Job Model", function () {
  test("create job", async function () {
    let job = await Job.create({
      title: "Software Engineer",
      salary: 100000,
      equity: 0.1,
      company_handle: "testcompany",
    });

    expect(job).toEqual({
      id: expect.any(Number),
      title: "Software Engineer",
      salary: 100000,
      equity: "0.1", // pg returns NUMERIC as string
      company_handle: "testcompany",
    });
  });

  test("find all jobs", async function () {
    let jobs = await Job.findAll();
    expect(jobs.length).toBeGreaterThan(0);
  });

  test("get job by ID", async function () {
    let job = await Job.create({
      title: "Data Scientist",
      salary: 120000,
      equity: 0.2,
      company_handle: "testcompany",
    });

    let found = await Job.get(job.id);
    expect(found.title).toBe("Data Scientist");
  });

describe("findAll with filters", function () {
    test("works: filter by title", async function () {
      let jobs = await Job.findAll({ title: "Engineer" });
      expect(jobs).toEqual([
        {
          id: expect.any(Number),
          title: "Software Engineer",
          salary: 100000,
          equity: "0.05",
          company_handle: "erickson-inc",
        },
      ]);
    });
  
    test("works: filter by minSalary", async function () {
      let jobs = await Job.findAll({ minSalary: 95000 });
      expect(jobs.length).toBeGreaterThan(0);
    });
  
    test("works: filter by hasEquity true", async function () {
      let jobs = await Job.findAll({ hasEquity: true });
      expect(jobs.every(j => Number(j.equity) > 0)).toBe(true);
    });
  
    test("works: filter by hasEquity false", async function () {
      let jobs = await Job.findAll({ hasEquity: false });
      expect(jobs.length).toBeGreaterThan(0);
    });
  
    test("works: multiple filters", async function () {
      let jobs = await Job.findAll({ title: "Engineer", minSalary: 90000, hasEquity: true });
      expect(jobs).toEqual([
        {
          id: expect.any(Number),
          title: "Software Engineer",
          salary: 100000,
          equity: "0.05",
          company_handle: "erickson-inc",
        },
      ]);
    });
});
  

  test("update job", async function () {
    let job = await Job.create({
      title: "Backend Developer",
      salary: 95000,
      equity: 0.15,
      company_handle: "testcompany",
    });

    let updated = await Job.update(job.id, { title: "Senior Backend Dev" });
    expect(updated.title).toBe("Senior Backend Dev");
  });

  test("delete job", async function () {
    let job = await Job.create({
      title: "Frontend Engineer",
      salary: 110000,
      equity: 0.05,
      company_handle: "testcompany",
    });

    await Job.remove(job.id);
    await expect(Job.get(job.id)).rejects.toThrow(NotFoundError);
  });
});
