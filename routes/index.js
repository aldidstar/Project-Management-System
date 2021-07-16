var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", (req, res, next) => {
    res.render("index/login", {info: req.flash("info") });
  });

  router.post("/", (req, res, next) => {
    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, row) => {
        
        if (err) {
          req.flash("info", "Salah nihh!");
         return res.redirect("/");
        }
        if (row.rows.length == 0) {
          req.flash("info", "email / password salah!");
         return res.redirect("/");
        }

        bcrypt.compare(
          req.body.password,
          row.rows[0].password,
          function (err, result) {
            if (result) {
              req.session.user = row.rows[0];
              
              res.redirect("/projects");
            } else {
              req.flash("info", "email / password salah!");
              res.redirect("/");
            }
          }
        );
       
      }
    );
  });

  router.get("/register", (req, res, next) => {
    res.render("index/register", {info: req.flash("info") });
  });

  router.post("/register", (req, res, next) => {
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    let sql = `UPDATE users SET password = '${hash}'
    WHERE email = '${req.body.email}' `;
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
       
       return res.redirect("/");
      }
    });
    })
})

  router.get("/logout", function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect("/");
    });
  });

  
 
  return router;
};
