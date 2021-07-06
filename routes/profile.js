var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    const {position} = req.query;
    var type = req.query.type
    let sql = `select * from users where email= '${req.session.user.email}'`;
    // let sql = `select * from users `;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("profile/profile", { nama: row.rows[0], query: req.query, type, info: req.flash("info") });
      }
    });
  });

  router.post("/", helpers.isLoggedIn, (req, res, next) => {
    bcrypt.hash(`${req.body.password}`, saltRounds, function (err, hash) {
      let sql = `UPDATE users SET email = '${req.body.email}', password = '${hash}', type = '${req.body.type}', position = '${req.body.position}'
        WHERE email = '${req.session.user.email}'`;

      db.query(sql, (err) => {
        if (err) throw err;
        if ((hash = "")) {
          let sql = `UPDATE users SET email = '${req.body.email}', type = '${req.body.type}', position = '${req.body.position}'
            WHERE email = '${req.session.user.email}'`;
        }
        console.log(sql);
        db.query(sql, (err) => {
          req.flash("info", `Data ${req.session.user.firstname} telah di update`);
          res.redirect("/profile");
        });
      });
    });
  });

  router.get("/logout", function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect("/");
    });
  });


  return router;
};
