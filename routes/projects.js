var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, function (req, res, next) {
    const { id, name, member } = req.query;
    const url = req.url == "/" ? "/projects/?page=1" : `/projects${req.url}`;
    console.log(url);
    const page = parseInt(req.query.page || 1);
    const limit = 3;
    const offset = (page - 1) * limit;

    let params = [];
    if (name) {
      params.push(`projects.name ilike '%${name}%'`);
    }

    if (id) {
      params.push(`projects.projectid = ${id}`);
    }

    if (member) {
      params.push(`members.userid = ${member}`);
    }

    let sql = `select count(*) as total from projects `;

    if (params.length > 0) {
      sql += `where ${params.join(" and ")}`;
    }
    console.log(sql);
    db.query(sql, (err, data) => {
      if (err) {
        return res.send(err);
      }
      const total = data.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sql = `select * from users`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;

        let sql = `select projects.projectid, projects.name, ARRAY_AGG (
          firstname ORDER BY firstname) members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid)`;
        if (params.length > 0) {
          sql += ` where ${params.join(" and ")}`;
        }
        sql += ` GROUP BY projects.projectid, projects.name ORDER BY projectid`;
        sql += ` limit ${limit} offset ${offset}`;

        db.query(sql, (err, row) => {
          if (err) throw err;

          console.log(sql);
          db.query(sql, (err, rows) => {
            if (err) throw err;

            db.query(
              `select option from users where email = $1`,
              [req.session.user.email],
              (err, options) => {
                if (err) throw err;
                res.render("projects/projects", {
                  nama: rows.rows,
                  namas: row.rows,
                  namass: data.rows,
                  query: req.query,
                  options: options.rows[0].option,
                  memberss: memberss.rows,
                  page,
                  pages,
                  url,
                });
              }
            );
          });
        });
      });
    });
  });
  router.post("/", helpers.isLoggedIn, (req, res) => {
    const { projectid, name, members } = req.body;
    db.query(
      `update users set option = $1 where email = $2 `,
      [req.body, req.session.user.email],
      (err, data) => {
        if (err) throw err;
      }
    );
    res.redirect("/projects");
  });

  router.get("/add", helpers.isLoggedIn, (req, res) => {
    let sql = `select * from users`;

    db.query(sql, (err, memberss) => {
      if (err) throw err;
      res.render("projects/add", {
        memberss: memberss.rows,
      });
    });
  });
  router.post("/add", helpers.isLoggedIn, (req, res) => {
    let sql = `INSERT INTO projects (name) VALUES ('${req.body.name}')`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `INSERT INTO members (userid,role,projectid) VALUES ('${req.body.userid}', '${req.body.position}', '${req.body.id}')`;

      db.query(sql, (err) => {
        if (err) throw err;
        res.redirect("/projects");
      });
    });
  });

  router.get("/delete/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `DELETE FROM projects WHERE projectid=${req.params.id}`;
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
      });

      res.redirect("/projects");
    });
  });

  router.get("/edit/:id", (req, res) => {
    let sql = `select * from projects where projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;
      let sql = `select * from users`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;
        if (row) {
          res.render("projects/edit", {
            nama: row.rows[0],
            memberss: memberss.rows,
          });
        }
      });
    });
  });

  router.post("/edit/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `UPDATE projects 
        SET name = '${req.body.name}'
        WHERE projectid='${req.params.id}'`;

      db.query(sql, (err) => {
        if (err) throw err;
        let sql = `INSERT INTO members (userid,role,projectid) VALUES ('${req.body.userid}', 'Software Developer', '${req.params.id}')`;

        db.query(sql, (err) => {
          if (err) throw err;
          res.redirect("/projects");
      });

    });
  });
});

  return router;
};
