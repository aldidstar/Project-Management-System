var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, function (req, res, next) {
    const { id, name, member } = req.query;
    const url = req.url == "/" ? "/projects/?page=1" : req.url;
    const page = parseInt(req.query.page || 1);
    const limit = 1;
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

    let sql = `select count(*) as total from users `;
      if (params.length > 0) {
        sql += ` where ${params.join(" and ")}`;
      }
      db.query(sql, (err, data) => {
        if (err) {
          return res.send(err);
        }
        const total = data.rows[0].total;
        const pages = Math.ceil(total / limit);
    let sql = `select projects.projectid, projects.name, ARRAY_AGG (
      firstname ORDER BY firstname) members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid)`;
    if (params.length > 0) {
      sql += ` where ${params.join(" and ")}`;
    }
    sql += ` GROUP BY projects.projectid, projects.name ORDER BY projectid`;

    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;
      
        console.log(sql);
        db.query(
          `select option from users where email = $1`,
          [req.session.user.email],
          (err, options) => {
            if (err) throw err;
            let sql = `select * from users`;
            if (params.length > 0) {
              sql += `where ${params.join(" and ")}`;
            }
            sql += ` limit $1 offset $2`;

            db.query(sql, [limit, offset], (err, memberss) => {
              if (err) throw err;
              res.render("projects/projects", {
                nama: row.rows,
                query: req.query,
                options: options.rows[0].option,
                memberss: memberss.rows,
                page,
                pages,
                url
              });
            });
          }
        );
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

  router.get("/add", helpers.isLoggedIn, (req, res) => res.render("add"));
  router.post("/add", helpers.isLoggedIn, (req, res) => {
    let sql = `INSERT INTO projects (projectid, name) VALUES ('${req.body.id}', '${req.body.name}')`;

    db.query(sql, (err) => {
      if (err) throw err;
    });

    res.redirect("/");
  });

  router.get("/delete/:id", (req, res) => {
    let sql = `DELETE FROM projects  WHERE projectid=${req.params.id}`;
    db.query(sql, (err) => {});
    res.redirect("/");
  });

  router.get("/edit/:id", (req, res) => {
    let sql = `select * from projects where projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("edit", { nama: row.rows[0] });
      }
    });
  });

  router.post("/edit/:id", (req, res) => {
    let sql = `UPDATE projects 
        SET name = '${req.body.name}'
        WHERE projectid='${req.params.id}'`;

    db.query(sql, (err) => {});

    res.redirect("/");
  });

  router.get("/logout", function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect("login");
    });
  });

  return router;
};
