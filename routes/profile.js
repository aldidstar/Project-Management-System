var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  let namePages = "profile";
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    const session = req.session.user;

    const { position } = req.query;

    var type = req.query.type;
    let sql = `select * from users where email= '${req.session.user.email}'`;
    // let sql = `select * from users `;

    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("profile/profile", {
          nama: row.rows[0],
          query: req.query,
          type,
          info: req.flash("info"),
          namePages,
          session,
        });
      }
    });
  });

  router.post("/", helpers.isLoggedIn, (req, res, next) => {
    let sql = `UPDATE users SET email = '${req.body.email}', type = '${req.body.type}', position = '${req.body.position}'
        WHERE email = '${req.session.user.email}'`;

    db.query(sql, (err) => {
      if (err) throw err;

      req.flash("info", `Data ${req.session.user.firstname} telah di update`);
      res.redirect("/profile");
    });
  });

  router.get("/password", helpers.isLoggedIn, (req, res) => {
    const session = req.session.user;
    res.render("profile/password", { session, namePages, info: req.flash("info") });
  });

  router.post("/password", helpers.isLoggedIn, (req, res, next) => {
    db.query(
      "select * from users where email = $1",
      [req.session.user.email],
      (err, row) => {
        if (err) throw err;
        bcrypt.compare(
          req.body.password,
          row.rows[0].password,
          function (err, result) {
            if (result) {
              bcrypt.hash(
                `${req.body.password1}`,
                saltRounds,
                function (err, hash) {
                  bcrypt.compare(
                    req.body.password2,
                    hash,
                    function (err, result) {
                      if (result) {
                        let sql = `UPDATE users SET password = '${hash}' WHERE email = '${req.session.user.email}'`;

                        db.query(sql, (err, rows) => {
                          if (err) throw err;
                          req.flash("info", `password telah di update`);
                          res.redirect("/profile");
                        });
                      } else {
                        req.flash("info", `Password tidak sesuai`);
                        res.redirect("/profile/password");
                      }
                    }
                  );
                }
              );
            } else {
              req.flash("info", `Password lama salah`);
              res.redirect("/profile/password");
            }
          }
        );
      }
    );
  });

  return router;
};
