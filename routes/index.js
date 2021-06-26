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
    let sql = `select * from projects`;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("home/list", {nama: row.rows});
      }
    });
  });

  router.get("/add", (req, res) => res.render("add"));
  router.post("/add", (req, res) => {
    let sql = `INSERT INTO bread (nama, berat, tinggi, tanggal, hubungan) VALUES
     ('${req.body.name}', '${req.body.weight}', '${req.body.height}', '${req.body.date}', '${req.body.status}')`;
    db.query(sql, (err) => {
      if (err) throw err;
    });

    res.redirect("/");
  });

  router.get("/delete/:id", (req, res) => {
    let sql = `DELETE FROM bread WHERE id=${req.params.id}`;

    db.query(sql, (err) => {});
    res.redirect("/");
  });

  router.get("/edit/:id", (req, res) => {
    let sql = `select * from bread where id='${req.params.id}'`;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("edit", { nama: row.rows[0], moment: moment });
      }
    });
  });

  router.post("/edit/:id", (req, res) => {
    let sql = `UPDATE bread 
        SET nama = '${req.body.name}', berat = '${req.body.weight}', tinggi= '${req.body.height}', tanggal = '${req.body.date}', hubungan = '${req.body.status}'
        WHERE id='${req.params.id}'`;

    db.query(sql, (err) => {});

    res.redirect("/");
  });

  router.get("/profile", (req, res, next) => {
    res.render("home/form");
  });

  return router;
};
