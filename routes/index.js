var express = require("express");
var router = express.Router();
// var moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require('../helpers/util')

module.exports = function (db) {
  router.get("/login", (req, res, next) => {
    res.render("login");
  });

  router.post("/login", (req, res, next) => {
    // let sql =  and password = '${req.body.password}'`;
    db.query('select * from users where email = $1',[req.body.email], (err, row) => {
      if (err) throw err;
      if (row.rows.length ==  0) 
        return res.send('data tidak ditemukan')
      
      bcrypt.compare(req.body.password, row.rows[0].password, function(err, result) {
        
        if (result) {
          req.session.users = row.rows[0];
          res.redirect("/");
          
        }
      });
    });
    })

    router.get("/logout", function(req, res, next) {
      req.session.destroy(function(err) {
        res.redirect("/login");
      })
      
    })


  router.get("/", helpers.isLoggedIn, function (req, res, next) {
    const { id, name } = req.query;
    const url = req.url == '/' ? '/?page=1' : req.url;
    
    
    
    let params = [];
    if (name) {
      params.push(`name ilike '%${name}%'`);
    }
    
    if (id) {
      params.push(`projectid = ${id}`);
    }
    let sql = `select * from projects `;
    if (params.length > 0) {
      sql += ` where ${params.join(" and ")}`;
    }
    console.log(sql)
    db.query(sql, (err, row) => {
      if (err) throw err;

      if (row) {
        res.render("home/list", {nama: row.rows, query: req.query});
      }
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

  router.get("/profile", helpers.isLoggedIn, (req, res, next) => {
    let sql = `select * from users`;
    console.log(sql);
    db.query(sql, (err, row) => {
      if (err) throw err;
      

      if (row) {
        res.render("home/form", { nama: row.rows });
      }
 
  });
    
  });

  router.post("/profile", helpers.isLoggedIn, (req, res, next) => {
    bcrypt.hash(`${req.body.password}`, saltRounds, function(err, hash) {
    let sql = `UPDATE users SET email = '${req.body.email}', password = '${hash}', type = '${req.body.type}'
        WHERE email = '${req.body.email}'`;
        db.query(sql, (err) => {
          if (err) throw err;
          sqll = `UPDATE members 
          SET role = '${req.body.position}' WHERE email = '${req.body.email}''`
          
          
          console.log(sql)
        db.query(sql, sqll, (err) => {
          if (err) throw err;
          res.redirect("/");
        });
      });
    });
  });

  return router;
};
