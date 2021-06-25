var express = require('express');
var router = express.Router();
var moment = require('moment');

module.exports = function(db){

router.get('/login', (req,res,next) => {
res.render('login')
})

router.get('/', function(req, res, next) {

  const { name, weight, height, date, status, start, end } = req.query;

  const url = req.url == '/' ? '/?page=1' : req.url;
  const page = parseInt(req.query.page || 1)
  const limit = 3
  const offset = (page-1) * limit

  let params = [];
  if (name) {
    params.push(`nama ilike '%${name}%'`);
  }

  if (weight) {
    params.push(`berat = ${weight}`);
  }

  if (height) {
    params.push(`tinggi = ${height}`);
  }
  
  if (start && end) {
    params.push(`tanggal between '${start}' and  '${end}'`);
  }
  
  if (status) {
    params.push(`hubungan='${status}'`);
  }
  let sql = `select count(*) as total from bread `;
  if (params.length > 0) {
    sql += ` where ${params.join(" and ")}`;
  }
  console.log(sql)
  db.query(sql,(err, data) => {
    if (err) {
      return res.send(err)
    }
    
    const total = data.rows[0].total
    const pages = Math.ceil(total/limit)
    
    sql = `select * from bread `;
    
    if (params.length > 0) {
      sql += `where ${params.join(" and ")}`;
    }
    sql += `order by id limit $1 offset $2`;
    
  db.query(sql,[limit, offset],(err, data) => {
    if (err) {
      return res.send(err)
    }
  res.render('home/list', { nama: data.rows, moment: moment, page, pages, url, query: req.query });
  })
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
  console.log(sql)
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

return router;
}