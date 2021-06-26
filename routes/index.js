var express = require("express");
var router = express.Router();
var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = function (db) {
  router.get("/login", (req, res, next) => {
    res.render("login");
  });

  router.post("/login", (req, res, next) => {
    let sql = `select * from users where email = '${req.body.email}' and password = '${req.body.password}'`;
    db.query(sql, (err, row) => {
      if (err) throw err;
      if (row.rows.length ==  0) 
        return res.send('data tidak ditemukan')
      
      // bcrypt.compare(req.body.password, row.rows[0].password, function(err, result) {
        
        if (row) {
          res.redirect("/");
          
        }
    });
    })


  router.get("/", function (req, res, next) {
    let sql = `select * from projects order by projectid`;
    
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("home/list", {nama: row.rows});
      }
    });
  });

  router.get("/add", (req, res) => res.render("add"));
  router.post("/add", (req, res) => {
    let sql = `INSERT INTO projects (projectid, name) VALUES ('${req.body.id}', '${req.body.name}')`;
   
    db.query(sql, (err) => {
      if (err) throw err;
    });

    res.redirect("/");
  });

  router.get("/delete/:id", (req, res) => {
    let sql = `DELETE FROM projects  WHERE projectid=${req.params.id}`;
console.log(sql)
    db.query(sql, (err) => {
      
    });
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

  router.get("/profile", (req, res, next) => {
    res.render("home/form");
  });

  router.post("/profile:id", (req, res, next) => {
    let sql = `UPDATE users SET email = '${req.body.email}', password = '${req.body.password}', type = '${req.body.type}'
        WHERE projectid='${req.params.id}'`;
        console.log(sql)
        db.query(sql, (err) => {
          if (err) throw err;
        //   sql = `UPDATE projects 
        // SET role = '${req.body.position}'`;
        // if (req.body.position > 0) {
        //   sql += `WHERE projectid='${req.params.id}'`
        // }

        // db.query(sql, (err) => {
          // if (err) throw err;
          res.redirect("/");
        // });
      });

  });

  return router;
};
