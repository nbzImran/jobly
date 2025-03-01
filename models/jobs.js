"use strict";



const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


// Related fucntions for jobs

class Job {
    // Create a job (data: { title, salary, equity, company_handle })
    // return {id, title, salary, equity, comapny_handle }

    static async create({ title, salary, equity, company_handle }) {
        const result = await db.query(
            `INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle`,
            [title, salary, equity, company_handle]
        );
        return result.rows[0];
    }

    // Find all jobs.
    //Returns [{id, title, salary, equity, company_handle }, ...]


    static async findAll({ title, minSalary, hasEquity }= {}) {
        let query = `SELECT id, title, salary, equity, company_handle
        FROM jobs`;

        let whereExpressions = [];
        let queryValues = [];

        // Filtering conditions
        if (title) {
            queryValues.push(`%${title.toLowerCase()}%`);
            whereExpressions.push(`LOWER(title) LIKE $${queryValues.length}`);
        }

        if (minSalary !== undefined) {
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        if (hasEquity === true) {
            whereExpressions.push(`equity > 0`);
        }

        // Add WHERE clauses if filters exist
        if (whereExpressions.length > 0) {
            query += " WHERE " + whereExpressions.join(" AND ");
        }

        query += " ORDER BY title";

        //Execute query with parameterized values
        const jobRes = await db.query(query, queryValues);
        return jobRes.rows;
    }

    // GET a job by ID.
    // Returns {id, title, salary, equity, company_handle}
    // Throws notFoundError if not found


    static async get(id) {
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE id = $1`,
        [id]
        );

        const job = result.rows[0];
        if (!job) throw new NotFoundError(`No job found with id: ${id}`);
        return job;
    }


    /** Get technologies for all jobs at once (Optimized) */
static async getAllTechnologies() {
    const result = await db.query(
      `SELECT jt.job_id, t.name 
       FROM job_technologies jt
       JOIN technologies t ON jt.technology_id = t.id`
    );
  
    // Map job_id → technologies array
    const techMap = {};
    for (let row of result.rows) {
      if (!techMap[row.job_id]) techMap[row.job_id] = [];
      techMap[row.job_id].push(row.name);
    }
    return techMap;
  }
  

    

    // Update job details (excluding ID and company_handle).
    // Data can include {title, salary, equity}
    // Returns {id, title, salary, equity, company_handle}


    static async update(id, data) {
        const { setCols, values } =sqlForPartialUpdate(data, {
            title: "title",
            salary: "salary",
            equity: "equity",
        });

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = $${values.length + 1}
                          RETURNING id, title, salary, equity, company_handle`;
        
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job found with id: ${id}`);
        return job
    }

     /** Delete job by ID.
   * Returns { deleted: id }
   * Throws NotFoundError if not found.
   **/
  static async remove(id) {
    const result = await db.query(
      `DELETE FROM jobs
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rows[0]) throw new NotFoundError(`No job found with id: ${id}`);
    return { deleted: id };
  }
}


module.exports = Job