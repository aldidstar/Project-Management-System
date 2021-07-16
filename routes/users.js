var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const path = require("path");
const saltRounds = 10;
const helpers = require("../helpers/util");
var moment = require("moment");
const { query } = require("express");

module.exports = function (db) {
  let namePages = "users";
  router.get(
    "/",
    helpers.isAdmin,
    helpers.isLoggedIn,
    function (req, res, next) {
      const session = req.session.user;
      const { userid, firstname, position } = req.query;

      const url = req.url == "/" ? "/users/?page=1" : `/users${req.url}`;

      const page = parseInt(req.query.page || 1);
      const limit = 2;
      const offset = (page - 1) * limit;

      let params = [];
      if (firstname) {
        params.push(`users.firstname ilike '%${firstname}%'`);
      }

      if (userid) {
        params.push(`users.userid = ${userid}`);
      }

      if (position) {
        params.push(`users.position = '${position}'`);
      }

      let sqlcount = `select * from users`;

      if (params.length > 0) {
        sqlcount += ` where ${params.join(" and ")}`;
      }
      sqlcount += ` ORDER BY userid`;
      console.log(sqlcount);
      db.query(sqlcount, (err, data) => {
        if (err) throw err;
        
        const total = data.rows.length;
        const pages = Math.ceil(total / limit);
        
        let sql = `select * from users`;
        if (params.length > 0) {
          sql += ` where ${params.join(" and ")}`;
        }
        sql += `  ORDER BY userid`;
        sql += ` limit ${limit} offset ${offset}`;
        console.log(sql)
        db.query(sql, (err, rows) => {
          if (err) throw err;
        db.query(
          `select optionuser from users where email = $1`,
          [req.session.user.email],
          (err, optionuser) => {
            if (err) throw err;

        res.render("users/users", {
          nama: rows.rows,
          namass: data.rows,
          query: req.query,
          optionuser: optionuser.rows[0].optionuser,
          page,
          pages,
          url,
          namePages,
          session,
          info: req.flash("info")
        });
      });
    });
    }
  );
    });
  
  

  router.post("/",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    const { userid, firstname, position } = req.body;
    db.query(
      `update users set optionuser = $1 where email = $2 `,
      [req.body, req.session.user.email],
      (err, data) => {
        if (err) throw err;
        res.redirect("/users");
      }
    );
  });

  router.get("/add",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    const session = req.session.user;
    let sql = `select * from users`;

    db.query(sql, (err, memberss) => {
      if (err) throw err;
      res.render("users/add", {
        memberss: memberss.rows,
        session,
        namePages
      });
    });
  });

  router.post("/add",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      let sql = `INSERT INTO users (firstname, lastname, email, password, position, type, role, option, optionmember, optionissue ) VALUES ('${req.body.firstname}', '${req.body.lastname}', '${req.body.email}', '${hash}', '${req.body.position}', '${req.body.type}', 'user', '{}', '{}', '{}')`;

      db.query(sql, (err, result) => {
        if (err) throw err;

        res.redirect("/users");
      });
    });
  });

  router.get("/delete/:id",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    const session = req.session.user;
    let sql = `DELETE FROM users WHERE userid=${req.params.id}`;

    db.query(sql, (err) => {
      if (err) throw err;

      res.redirect("/users");
    });
  });

  router.get("/edit/:id",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    const session = req.session.user;
    let sql = `select * from users where userid=${req.params.id}` 

    db.query(sql, (err, memberss) => {
      if (err) throw err;
      res.render("users/edit", {
        memberss: memberss.rows[0],
        session,
        namePages,
        info: req.flash("info")
      });
    });
  });

  router.post("/edit/:id",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res, next) => {
    let sql = `UPDATE users SET email = '${req.body.email}', type = '${req.body.type}', position = '${req.body.position}', firstname = '${req.body.firstname}', lastname = '${req.body.lastname}'
        WHERE userid = '${req.params.id}' returning *`;

    db.query(sql, (err) => {
      if (err) throw err;

      req.flash("info", `Data telah di update`);
      res.redirect("/users");
    });
  });

  router.get("/edit/:id/password",  helpers.isAdmin,
  helpers.isLoggedIn, (req, res) => {
    const session = req.session.user;
    let sql = `select * from users where userid=${req.params.id}` 

    db.query(sql, (err, memberss) => {
      if (err) throw err;
    res.render("users/password",  { memberss: memberss.rows[0], namePages, session, info: req.flash("info") })
  });
});

router.post("/edit/:id/password",  helpers.isAdmin,
helpers.isLoggedIn, (req, res, next) => {
  const edit = req.params.id
  db.query(
    "select * from users where userid = $1",
    [req.params.id],
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
                      let sql = `UPDATE users SET password = '${hash}' WHERE userid = '${req.params.id}'`;

                      db.query(sql, (err, rows) => {
                        if (err) throw err;
                        req.flash("info", `password telah di update`);
                        res.redirect(`/users/edit/${edit}`);
                      });
                    } else {
                      req.flash("info", `Password tidak sesuai`);
                      res.redirect(`/users/edit/${edit}/password`);
                    }
                  }
                );
              }
            );
          } else {
            req.flash("info", `Password lama salah`);
            res.redirect(`/users/edit/${edit}/password`);
          }
        }
      );
    }
  );
});

  return router;
};
