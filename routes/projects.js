var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, function (req, res, next) {
    const { id, name, member } = req.query;
    const url = req.url == "/" ? "/projects/?page=1" : `/projects${req.url}`;

    const page = parseInt(req.query.page || 1);
    const limit = 3;
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

    let sqlcount = `select projects.projectid, projects.name, ARRAY_AGG (
      firstname ORDER BY firstname) members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid)`;

    if (params.length > 0) {
      sqlcount += `where ${params.join(" and ")}`;
    }
    sqlcount += ` GROUP BY projects.projectid, projects.name ORDER BY projectid`;

    db.query(sqlcount, (err, data) => {
      if (err) {
        return res.send(err);
      }

      const total = data.rows.length;
      const pages = Math.ceil(total / limit);
      let sql = `select * from users`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;

        let sql = `select projects.projectid, projects.name, ARRAY_AGG (
          firstname ORDER BY firstname) members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid)`;
        if (params.length > 0) {
          sql += ` where ${params.join(" and ")}`;
        }
        sql += ` GROUP BY projects.projectid, projects.name ORDER BY projectid`;
        sql += ` limit ${limit} offset ${offset}`;

        db.query(sql, (err, row) => {
          if (err) throw err;

          db.query(sql, (err, rows) => {
            if (err) throw err;

            db.query(
              `select option from users where email = $1`,
              [req.session.user.email],
              (err, options) => {
                if (err) throw err;
                res.render("projects/projects", {
                  nama: rows.rows,
                  namas: row.rows,
                  namass: data.rows,
                  query: req.query,
                  options: options.rows[0].option,
                  memberss: memberss.rows,
                  page,
                  pages,
                  url,
                });
              }
            );
          });
        });
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
        res.redirect("/projects");
      }
    );
  });

  router.get("/add", helpers.isLoggedIn, (req, res) => {
    let sql = `select * from users`;

    db.query(sql, (err, memberss) => {
      if (err) throw err;
      res.render("projects/add", {
        memberss: memberss.rows,
      });
    });
  });
  router.post("/add", helpers.isLoggedIn, (req, res) => {
    let sql = `INSERT INTO projects (name) VALUES ('${req.body.name}') returning *`;

    db.query(sql, (err, result) => {
      if (err) throw err;
      sql = `INSERT INTO members (userid,role,projectid) VALUES`;
      for (let i = 0; i < req.body.userid.length; i++) {
        if (i < req.body.userid.length) {
          let values = ` (${req.body.userid[i]},'Manager', ${result.rows[0].projectid}),`;
          if (i == req.body.userid.length - 1) {
            values = ` (${req.body.userid[i]},'Manager', ${result.rows[0].projectid})`;
          }
          sql += values;
        }
      }
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
        res.redirect("/projects");
      });
    });
  });

  router.get("/delete/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `DELETE FROM projects WHERE projectid=${req.params.id}`;
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
      });

      res.redirect("/projects");
    });
  });

  router.get("/edit/:id", (req, res) => {
    let sql = `select * from projects where projectid=${req.params.id}`;
    db.query(sql, (err, row) => {
      if (err) throw err;
      let sql = `select * from users`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;

        let sql = `select projects.projectid as projectid, projects.name, ARRAY_AGG (
          firstname ORDER BY firstname) as members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid) WHERE projectid=${req.params.id} GROUP BY projects.projectid, projects.name ORDER BY projectid`;
        console.log(sql);
        db.query(sql, (err, membersss) => {
          if (err) throw err;

          res.render("projects/edit", {
            nama: row.rows[0],
            memberss: memberss.rows,
            membersss: membersss.rows[0],
          });
        });
      });
    });
  });

  router.post("/edit/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;

    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `UPDATE projects 
        SET name = '${req.body.name}'
        WHERE projectid='${req.params.id}'`;

      db.query(sql, (err) => {
        if (err) throw err;
        let sql = `INSERT INTO members (userid,role,projectid) VALUES ('${req.body.userid}', 'Software Developer', '${req.params.id}')`;

        db.query(sql, (err) => {
          if (err) throw err;
          res.redirect("/projects");
        });
      });
    });
  });

  router.get("/overview/:projectid", (req, res) => {
    const projectid = req.params.projectid;

    let sql = `select * from projects where projectid=${projectid}`;
    db.query(sql, (err, row) => {
      if (err) throw err;
      let sql = `select members.userid, members.projectid, users.firstname, users.lastname, members.role from members Inner JOIN users ON  members.userid = users.userid where members.projectid=${req.params.projectid}`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;

        res.render("projects/overview", {
          nama: row.rows[0],
          memberss: memberss.rows,

          projectid,
        });
      });
    });
  });

  router.get(
    "/members/:projectid",
    helpers.isLoggedIn,
    function (req, res, next) {
      const { id, name, role } = req.query;
      // const url = req.url == "/" ? "/projects/?page=1" : `/projects${req.url}`;
      const projectid = req.params.projectid;

      const page = parseInt(req.query.page || 1);
      const limit = 3;
      const offset = (page - 1) * limit;

      let params = [];
      if (name) {
        params.push(`users.firstname ilike '%${name}%'`);
      }

      if (id) {
        params.push(`users.userid = ${id}`);
      }

      if (role) {
        params.push(`members.role = ${role}`);
      }

      let sqlcount = `select users.userid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where projectid=${projectid}`;

      if (params.length > 0) {
        sqlcount += ` AND  ${params.join(" and ")}`;
      }
      // sqlcount += ` GROUP BY users.userid, users.firstname,members.role ORDER BY userid`;
      console.log(sqlcount);
      db.query(sqlcount, (err, data) => {
        if (err) {
          return res.send(err);
        }

        const total = data.rows.length;
        const pages = Math.ceil(total / limit);
        let sql = `select * from users`;

        db.query(sql, (err, memberss) => {
          if (err) throw err;

          let sql = `select users.userid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where projectid=${req.params.projectid}`;
          if (params.length > 0) {
            sql += ` where ${params.join(" and ")}`;
          }
          // sql += ` GROUP BY users.userid, users.firstname,members.role ORDER BY userid`;
          // sql += ` limit ${limit} offset ${offset}`;

          db.query(sql, (err, row) => {
            if (err) throw err;

            db.query(sql, (err, rows) => {
              if (err) throw err;

              db.query(
                `select option from users where email = $1`,
                [req.session.user.email],
                (err, options) => {
                  if (err) throw err;
                  res.render("projects/members", {
                    nama: rows.rows,
                    namas: row.rows,
                    namass: data.rows,
                    query: req.query,
                    options: options.rows[0].option,
                    memberss: memberss.rows,
                    page,
                    pages,
                    // url,
                    projectid,
                  });
                }
              );
            });
          });
        });
      });
    }
  );

  router.get("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid
    let sql = `select * from users where not users.userid in (select members.userid from members where projectid=${projectid})`;
    console.log(sql);

    db.query(sql, (err, users) => {
      if (err) throw err;
      let sql = `select * from users`;
      db.query(sql, (err, members) => {
        if (err) throw err;
      res.render("projects/memberadd", {
        users: users.rows,
        members: members.rows,
       
        projectid
      });
    });
  });
});


  router.post("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    let sql = `INSERT INTO members (name) VALUES ('${req.body.name}') returning *`;

    db.query(sql, (err, result) => {
      if (err) throw err;
      sql = `INSERT INTO members (userid,role,projectid) VALUES`;
      for (let i = 0; i < req.body.userid.length; i++) {
        if (i < req.body.userid.length) {
          let values = ` (${req.body.userid[i]},'Manager', ${result.rows[0].projectid}),`;
          if (i == req.body.userid.length - 1) {
            values = ` (${req.body.userid[i]},'Manager', ${result.rows[0].projectid})`;
          }
          sql += values;
        }
      }
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
        res.redirect("/projects/members");
      });
    });
  });

  router.get("/members/:projectid/delete/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `DELETE FROM projects WHERE projectid=${req.params.id}`;
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;
      });

      res.redirect("/projects");
    });
  });

  //   router.get("/members/:projectid/edit/:id", (req, res) => {
  //     let memberedit = req.params.id;

  //     let sql = `select * from members where members=${memberedit}`;
  //     db.query(sql, (err, row) => {
  //       if (err) throw err;
  //       let sql = `select * from users`;

  //       db.query(sql, (err, memberss) => {
  //         if (err) throw err;

  //         let sql = `select projects.projectid as projectid, projects.name, ARRAY_AGG (
  //           firstname ORDER BY firstname) as members from members Inner JOIN projects USING (projectid) Inner JOIN users USING (userid) WHERE projectid=${req.params.id} GROUP BY projects.projectid, projects.name ORDER BY projectid`;
  //           console.log(sql);
  //           db.query(sql, (err, membersss) => {

  //           if (err) throw err;

  //         res.render("/projects/memberedit", {
  //           nama: row.rows[0],
  //           memberss: memberss.rows,
  //           membersss: membersss.rows[0],
  //           memberedit
  //         });
  //       });
  //     });
  //   });
  // });

  router.post("/members/:projectid/edit/:id", (req, res) => {
    let sql = `DELETE FROM members WHERE projectid=${req.params.id}`;

    db.query(sql, (err) => {
      if (err) throw err;

      let sql = `UPDATE projects 
        SET name = '${req.body.name}'
        WHERE projectid='${req.params.id}'`;

      db.query(sql, (err) => {
        if (err) throw err;
        let sql = `INSERT INTO members (userid,role,projectid) VALUES ('${req.body.userid}', 'Software Developer', '${req.params.id}')`;

        db.query(sql, (err) => {
          if (err) throw err;
          res.redirect("/projects");
        });
      });
    });
  });

  return router;
};
