var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const path = require("path");
const saltRounds = 10;
const helpers = require("../helpers/util");
var moment = require("moment");
const { query } = require("express");

module.exports = function (db) {
  let namePages = `projects`;
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
                  namePages,
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

  router.get("/delete/:id", helpers.isLoggedIn, (req, res) => {
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

  router.get("/edit/:id", helpers.isLoggedIn, (req, res) => {
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

  router.post("/edit/:id", helpers.isLoggedIn, (req, res) => {
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

  router.get("/overview/:projectid", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;

    let sql = `select * from projects where projectid=${projectid}`;
    db.query(sql, (err, row) => {
      if (err) throw err;
      let sql = `select members.userid, members.projectid, users.firstname, users.lastname, members.role from members Inner JOIN users ON  members.userid = users.userid where members.projectid=${req.params.projectid}`;

      db.query(sql, (err, memberss) => {
        if (err) throw err;
        let totalBug = `select count(*) from issues  where projectid=${req.params.projectid} and tracker = 'Bug'`;
        db.query(totalBug, (err, totalBug) => {
          if (err) throw err;

          let closedbug = `select count(*) from issues  where projectid=${req.params.projectid} and not status = 'Closed' and tracker = 'Bug'`;
          db.query(closedbug, (err, closedbug) => {
            if (err) throw err;

            let totalFeature = `select count(*) from issues  where projectid=${req.params.projectid} and tracker = 'Feature'`;
        db.query(totalFeature, (err, totalFeature) => {
          if (err) throw err;

          let closedFeature = `select count(*) from issues  where projectid=${req.params.projectid} and not status = 'Closed' and tracker = 'Feature'`;
          db.query(closedFeature, (err, closedFeature) => {
            if (err) throw err;

            let totalSupport = `select count(*) from issues  where projectid=${req.params.projectid} and tracker = 'Support'`;
        db.query(totalSupport, (err, totalSupport) => {
          if (err) throw err;

          let closedSupport = `select count(*) from issues  where projectid=${req.params.projectid} and not status = 'Closed' and tracker = 'Support'`;
          db.query(closedSupport, (err, closedSupport) => {
            if (err) throw err;

        res.render("projects/overview", {
          nama: row.rows[0],
          memberss: memberss.rows,
          closedbug: closedbug.rows[0].count,
          totalBug: totalBug.rows[0].count,
          totalFeature: totalFeature.rows[0].count,
          closedFeature: closedFeature.rows[0].count,
          totalSupport: totalSupport.rows[0].count,
          closedSupport: closedSupport.rows[0].count,
          projectid,
        });
      });
    });
  });
});
});
});
});
});
});


  router.get(
    "/members/:projectid",
    helpers.isLoggedIn,
    function (req, res, next) {
      const { id, name, role } = req.query;
      const projectid = req.params.projectid;
      const url =
        req.url == `/members/${projectid}`
          ? `/projects/members/${projectid}?page=1`
          : `/projects${req.url}`;
      console.log(req.url);
      const page = parseInt(req.query.page || 1);
      const limit = 2;

      const offset = (page - 1) * limit;

      let params = [];
      if (name) {
        params.push(`users.firstname ilike '%${name}%'`);
      }

      if (id) {
        params.push(`users.userid = ${id}`);
      }

      if (role) {
        params.push(`members.role = '${role}'`);
      }

      let sqlcount = `select users.userid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where members.projectid=${projectid}`;

      if (params.length > 0) {
        sqlcount = `select users.userid, members.projectid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where members.projectid=${projectid} AND ${params.join(
          " and "
        )}`;
      }

      db.query(sqlcount, (err, data) => {
        if (err) {
          return res.send(err);
        }

        const total = data.rows.length;
        const pages = Math.ceil(total / limit);
        let filter = `select users.userid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where projectid=${req.params.projectid}`;
        if (params.length > 0) {
          filter = `select users.userid, members.projectid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where members.projectid=${projectid} AND ${params.join(
            " and "
          )}`;
        }
        filter += ` limit ${limit} offset ${offset}`;
        console.log(filter);
        db.query(filter, (err, memberss) => {
          if (err) throw err;
          let sql = `select * from users`;
          console.log(sql);
          db.query(sql, (err, row) => {
            if (err) throw err;

            db.query(sql, (err, rows) => {
              if (err) throw err;

              db.query(
                `select optionmember from users where email = $1`,
                [req.session.user.email],
                (err, optionmember) => {
                  if (err) throw err;
                  res.render("projects/members", {
                    nama: rows.rows,
                    namas: row.rows,
                    namass: data.rows,
                    query: req.query,
                    optionmember: optionmember.rows[0].optionmember,
                    memberss: memberss.rows,
                    page,
                    pages,
                    url,
                    projectid,
                    limit,
                  });
                }
              );
            });
          });
        });
      });
    }
  );

  router.post("/members/:projectid", helpers.isLoggedIn, (req, res) => {
    const { id, name, role } = req.body;
    console.log(req.body);
    const projectid = req.params.projectid;
    db.query(
      `update users set optionmember = $1 where email = $2 `,
      [req.body, req.session.user.email],
      (err, data) => {
        if (err) throw err;
        res.redirect(`/projects/members/${projectid}`);
      }
    );
  });

  router.get("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
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
          projectid,
        });
      });
    });
  });

  router.post("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    let sql = `INSERT INTO members (userid, role, projectid) VALUES (${req.body.member}, '${req.body.role}', ${projectid} )`;

    db.query(sql, (err, result) => {
      if (err) throw err;

      res.redirect(`/projects/members/${projectid}`);
    });
  });

  router.get("/members/:projectid/delete/:id", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    const id = req.params.id;
    let sql = `DELETE FROM members WHERE userid=${id}`;
    console.log(sql);
    db.query(sql, (err) => {
      if (err) throw err;

      res.redirect(`/projects/members/${projectid}`);
    });
  });

  router.get("/members/:projectid/edit/:id", helpers.isLoggedIn, (req, res) => {
    let memberedit = req.params.id;
    const projectid = req.params.projectid;
    let sql = `select users.userid, users.firstname, members.role from users Inner JOIN members ON  users.userid = members.userid where members.userid=${memberedit} and projectid=${projectid}`;

    db.query(sql, (err, row) => {
      if (err) throw err;
      console.log(row.rows[0].role);
      let sql = `select * from users`;
      db.query(sql, (err, members) => {
        if (err) throw err;
        let sql = `select * from members where projectid=${projectid} and userid=${memberedit}`;
        db.query(sql, (err, role) => {
          if (err) throw err;
          console.log(role.rows[0].role);
          res.render("projects/memberedit", {
            nama: row.rows[0],
            members: members.rows,
            roles: role.rows[0],
            memberedit,
            projectid,
          });
        });
      });
    });
  });

  router.post(
    "/members/:projectid/edit/:id",
    helpers.isLoggedIn,
    (req, res) => {
      let memberedit = req.params.id;
      const projectid = req.params.projectid;

      let sql = `UPDATE members 
        SET role = '${req.body.role}'
        WHERE userid='${memberedit}' and projectid=${projectid}`;
      console.log(sql);
      db.query(sql, (err) => {
        if (err) throw err;

        res.redirect(`/projects/members/${projectid}`);
      });
    }
  );

  router.get("/issue/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid;
    const { id, subject, tracker } = req.query;

    const url =
      req.url == `/issue/${projectid}`
        ? `/projects/issue/${projectid}?page=1`
        : `/projects${req.url}`;
    console.log(req.url);
    const page = parseInt(req.query.page || 1);
    const limit = 2;

    const offset = (page - 1) * limit;

    let params = [];
    if (subject) {
      params.push(`issues.subject ilike '%${subject}%'`);
    }

    if (id) {
      params.push(`issues.issueid = ${id}`);
    }

    if (tracker) {
      params.push(`issues.tracker = '${tracker}'`);
    }
    let sqlcount = ` select issueid, subject, tracker from issues where projectid=${projectid}`;
    if (params.length > 0) {
      sqlcount += ` and ${params.join(" and ")}`;
    }
    sqlcount += `order by issueid`;
    db.query(sqlcount, (err, data) => {
      if (err) {
        return res.send(err);
      }

      const total = data.rows.length;
      const pages = Math.ceil(total / limit);
      let issue = ` select issueid, subject, tracker from issues where projectid=${projectid}`;
      if (params.length > 0) {
        issue += ` and ${params.join(" and ")}`;
      }
      issue += `order by issueid`;
      issue += ` limit ${limit} offset ${offset}`;
      db.query(issue, (err, issue) => {
        if (err) throw err;
        db.query(
          `select optionissue from users where email = $1`,
          [req.session.user.email],
          (err, optionissue) => {
            if (err) throw err;
            res.render(`projects/issue`, {
              nama: data.rows,
              optionissue: optionissue.rows[0].optionissue,
              projectid,
              issue: issue.rows,
              query: req.query,
              page,
              pages,
              url,
            });
          }
        );
      });
    });
  });

  router.post("/issue/:projectid", helpers.isLoggedIn, (req, res) => {
    const { id, subject, tracker } = req.body;

    const projectid = req.params.projectid;
    db.query(
      `update users set optionissue = $1 where email = $2 `,
      [req.body, req.session.user.email],
      (err, data) => {
        if (err) throw err;
        res.redirect(`/projects/issue/${projectid}`);
      }
    );
  });

  router.get(`/issue/:projectid/add`, helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid;
    let issue = ` select * from issues where projectid=${projectid}`;
    db.query(issue, (err, issue) => {
      if (err) throw err;
      let ambiluser = `select * from users where  userid in (select userid from members where projectid=${projectid} )`;
      db.query(ambiluser, (err, ambiluser) => {
        if (err) throw err;

        res.render(`projects/issueadd`, {
          projectid,
          issue: issue.rows,
          ambiluser: ambiluser.rows,
        });
      });
    });
  });
  router.post(`/issue/:projectid/add`, helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;

    if (!req.files) {
      return db.query(
        `insert into issues (tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done,  projectid, author, createddate)
       values ($1,$2,$3,$4, $5,$6,$7,$8,$9, $10, $11, $12, now())`,
        [
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,

          req.params.projectid,
          req.session.user.userid,
        ],
        (err, addissue) => {
          if (err) throw err;
          res.redirect(`/projects/issue/${projectid}`);
        }
      );
    }

    let fotos = [];

    if (req.files.files.length > 1) {
      const file = req.files.files;
      file.forEach((item) => {
        let files = `${Date.now()}-${item.name}`;
        fotos.push({ name: files, mimetype: item.mimetype });
        let uploaddata = path.join(__dirname, `../public/images/${files}`);
        item.mv(uploaddata, (err, uploaddata) => {
          if (err) throw err;
        });
      });
    } else if (req.files.files) {
      const file = req.files.files;
      let files = `${Date.now()}-${file.name}`;
      fotos.push({ name: files, mimetype: file.mimetype });
      let uploaddata = path.join(__dirname, `../public/images/${files}`);
      file.mv(uploaddata, (err, uploaddata) => {
        if (err) throw err;
      });
    }

    db.query(
      `insert into issues (tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, projectid, author, createddate)
     values ($1,$2,$3,$4, $5,$6,$7,$8,$9, $10, $11, $12, $13, now())`,
      [
        req.body.tracker,
        req.body.subject,
        req.body.description,
        req.body.status,
        req.body.priority,
        req.body.assignee,
        req.body.startdate,
        req.body.duedate,
        req.body.estimatedtime,
        req.body.done,
        fotos,
        req.params.projectid,
        req.session.user.userid,
      ],
      (err, addissue) => {
        if (err) throw err;

        res.redirect(`/projects/issue/${projectid}`);
      }
    );
  });

  router.get(
    `/issue/:projectid/delete/:id`,
    helpers.isLoggedIn,
    (req, res, next) => {
      const projectid = req.params.projectid;
      let deleteissue = ` delete from issues where issueid=${req.params.id}`;
      db.query(deleteissue, (err, deleteissue) => {
        if (err) throw err;
        res.redirect(`/projects/issue/${projectid}`);
      });
    }
  );

  router.get(
    `/issue/:projectid/edit/:id`,
    helpers.isLoggedIn,
    (req, res, next) => {
      const projectid = req.params.projectid;
      let issue = ` select * from issues where projectid=${projectid} and issueid=${req.params.id}`;
      const baseUrl = `http://${req.headers.host}`;

      db.query(issue, (err, issue) => {
        if (err) throw err;
        let ambiluser = `select * from users where  userid in (select userid from members where projectid=${projectid} )`;
        db.query(ambiluser, (err, ambiluser) => {
          if (err) throw err;

          res.render(`projects/issueedit`, {
            issue: issue.rows[0],
            projectid,
            ambiluser: ambiluser.rows,
            moment: moment,
            baseUrl,
          });
        });
      });
    }
  );

  router.post(`/issue/:projectid/edit/:id`, helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid;
    
    
    if (!req.files && !req.body.files) {
     
      return db.query(
        `update issues set tracker = $1, subject = $2, description = $3, status =  $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, projectid = $11, author = $12, updateddate = now(), files = null where issueid = $13 returning * `,
        [
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          req.params.projectid,
          req.session.user.userid,
          req.params.id,
        ],
        (err, editissue) => {
          if (err) throw err;
               
          if (req.body.status == 'Closed') {
              db.query( `update issues set closeddate = now() where issueid = ${req.params.id}`,
            (err, closedissue) => {
              if (err) throw err;
            } )
          }
          db.query( `insert into activity (time, title, description, author, issueid) Values (now(), '${editissue.rows[0].subject}', '${editissue.rows[0].status}' ,  ${editissue.rows[0].author} , ${req.params.id})`,
          (err, insertactivity) => {
            if (err) throw err;
            res.redirect(`/projects/issue/${projectid}`);
          } )
        }
      );
    } 
    // const file = req.files.files;
    else if (!req.files && req.body.files) {
      let fotos = [];

      if (typeof req.body.files == "object") {
        req.body.files.forEach((itemm) => {
          fotos.push(itemm);
        });
      }
      else {
        fotos.push(req.body.files);
      }

      db.query(
        `update issues set tracker = $1, subject = $2, description = $3, status =  $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, files = $11 , projectid = $12, author = $13, updateddate = now() where issueid = $14 returning * `,
        [
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          fotos,
          req.params.projectid,
          req.session.user.userid,
          req.params.id,
        ],
        (err, editissue) => {
          if (err) throw err;
          if (req.body.status == 'Closed') {
            db.query( `update issues set closeddate = now() where issueid = ${req.params.id}`,
            (err, closedissue) => {
              if (err) throw err;
            } )
          }
          console.log(editissue.rows[0])
          let sql = `insert into activity (time, title, description, author, issueid) Values (now(), '${editissue.rows[0].subject}', '${editissue.rows[0].status}' ,  ${editissue.rows[0].author} , ${req.params.id})`
          console.log("sql",sql)
          db.query(sql ,
          (err, insertactivity) => {
            if (err) throw err;
            res.redirect(`/projects/issue/${projectid}`);
          } )

        }
      );


    } 
    else if (req.files.files && !req.body.files) {
      let fotos = [];
      if (req.files.files.length > 1) {
        const file = req.files.files;
        file.forEach((item) => {
          let files = `${Date.now()}-${item.name}`;
          fotos.push({ name: files, mimetype: item.mimetype });
          let uploaddata = path.join(__dirname, `../public/images/${files}`);
          item.mv(uploaddata, (err, uploaddata) => {
            if (err) throw err;
          });
        });
      } else {
        const file = req.files.files;
        let files = `${Date.now()}-${file.name}`;
        fotos.push({ name: files, mimetype: file.mimetype });

        let uploaddata = path.join(__dirname, `../public/images/${files}`);
        file.mv(uploaddata, (err, uploaddata) => {
          if (err) throw err;
        });
      }

      db.query(
        `update issues set tracker = $1, subject = $2, description = $3, status =  $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, files = $11 , projectid = $12, author = $13, updateddate = now() where issueid = $14 returning * `,
        [
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          fotos,
          req.params.projectid,
          req.session.user.userid,
          req.params.id,
        ],
        (err, editissue) => {
          if (err) throw err;
          if (req.body.status == 'Closed') {
             db.query( `update issues set closeddate = now() where issueid = ${req.params.id}`,
            (err, closedissue) => {
              if (err) throw err;
            } )
          }
          
          db.query( `insert into activity (time, title, description, author, issueid) Values (now(), '${editissue.rows[0].subject}', '${editissue.rows[0].status}' ,  ${editissue.rows[0].author} , ${req.params.id})`,
          (err, insertactivity) => {
            if (err) throw err;
            res.redirect(`/projects/issue/${projectid}`);
          } )
        }
      );
    } else if (req.files.files && req.body.files) {
      let fotos = [];

      if (req.files.files.length > 1 && typeof req.body.files == "object") {
        const file = req.files.files;
        file.forEach((item) => {
          let files = `${Date.now()}-${item.name}`;
          fotos.push({ name: files, mimetype: item.mimetype });
          let uploaddata = path.join(__dirname, `../public/images/${files}`);
          item.mv(uploaddata, (err, uploaddata) => {
            if (err) throw err;
          });
        });
        req.body.files.forEach((itemm) => {
          fotos.push(itemm);
        });
      } else if (req.files.files && typeof req.body.files == "object") {
        const file = req.files.files;
        let files = `${Date.now()}-${file.name}`;
        fotos.push({ name: files, mimetype: file.mimetype });

        let uploaddata = path.join(__dirname, `../public/images/${files}`);
        file.mv(uploaddata, (err, uploaddata) => {
          if (err) throw err;
        });
        req.body.files.forEach((itemm) => {
          fotos.push(itemm);
        });
      } else if (req.files.files.length > 1 && req.body.files) {
        const file = req.files.files;
        file.forEach((item) => {
          let files = `${Date.now()}-${item.name}`;
          fotos.push({ name: files, mimetype: item.mimetype });
          let uploaddata = path.join(__dirname, `../public/images/${files}`);
          item.mv(uploaddata, (err, uploaddata) => {
            if (err) throw err;
          });
        });
        fotos.push(req.body.files);
      } else {
        const file = req.files.files;
        let files = `${Date.now()}-${file.name}`;
        fotos.push({ name: files, mimetype: file.mimetype });

        let uploaddata = path.join(__dirname, `../public/images/${files}`);
        file.mv(uploaddata, (err, uploaddata) => {
          if (err) throw err;
        });
        fotos.push(req.body.files);
      }
      db.query(
        `update issues set tracker = $1, subject = $2, description = $3, status =  $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, files = $11 , projectid = $12, author = $13, updateddate = now() where issueid = $14 returning * `,
        [
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          fotos,
          req.params.projectid,
          req.session.user.userid,
          req.params.id,
        ],
        (err, editissue) => {
          if (err) throw err;
          if (req.body.status == 'Closed') {
              db.query( `update issues set closeddate = now() where issueid = ${req.params.id}`,
            (err, closedissue) => {
              if (err) throw err;
            } )
          }
          db.query( `insert into activity (time, title, description, author, issueid) Values (now(), '${editissue.rows[0].subject}','${editissue.rows[0].status}' ,  ${editissue.rows[0].author} , ${req.params.id})`,
          (err, insertactivity) => {
            if (err) throw err;
            res.redirect(`/projects/issue/${projectid}`);
          } )

  
        }
      );
    }

   
  });

  router.get(`/activity/:projectid`, helpers.isLoggedIn, (req, res) => {
    
    var timeFrom = (X) => {
      var dates = [];
      for (let I = 0; I < Math.abs(X); I++) {
          dates.push(new Date(new Date().getTime() - ((X >= 0 ? I : (I - I - I)) * 24 * 60 * 60 * 1000)).toLocaleString());
      }
      return dates;
  }

    const projectid = req.params.projectid;
    let activity = `SELECT activity.time as time , activity.title as title, activity.issueid as issueid, activity.description as description, users.firstname as firstname, DATE_PART('day', now()::timestamp - time::timestamp) as days FROM  (( activity INNER JOIN issues ON issues.issueid = activity.issueid) INNER JOIN users ON users.userid = activity.author) where projectid = ${projectid} and time between (NOW() - INTERVAL '7 day') and time order by time`
    db.query(activity, (err, activity) => {
      if (err) throw err;
      res.render(`projects/activity`, {
        projectid,
        activity: activity.rows,
        moment: moment,
        timeFrom
      });
    })
  });

//   SELECT 
//   activityid,
//   time,
//   DATE_PART('day', now()::timestamp - time::timestamp) as days
// FROM
//   activity where time between (NOW() - INTERVAL '7 day') and time


  return router;
};
