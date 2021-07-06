var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, function (req, res, next) {
    const { id, name } = req.query;
    const url = req.url == "/" ? "/?page=1" : req.url;

    let params = [];
    if (name) {
      params.push(`name ilike '%${name}%'`);
    }

    if (id) {
      params.push(`members.userid = ${id}`);
    }

    // if (member) {
    //   params.push(`projectid = ${member}`);
    // }
    let sql = `select members.userid, projects.name, users.firstname from ((members Inner JOIN projects ON members.projectid = projects.projectid ) Inner JOIN users ON members.userid = users.userid)`;
    if (params.length > 0) {
      sql += ` where ${params.join(" and ")}`;
    }
   
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("projects/projects", { nama: row.rows, query: req.query });
      }
    });
  });
  router.post("/", helpers.isLoggedIn, (req, res) => {
    let sql = `INSERT INTO users (projectid, projectname) VALUES (${req.body.idpro}, '${req.body.namepro}')`;
    db.query(sql, (err) => {
      if (err) throw err;
      let sql = `select * from projects order by projectid`;
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
      });

      res.redirect("/");
    });
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
