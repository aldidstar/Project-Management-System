
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
router.get('/', helpers.isAdmin, function(req, res, next) {
  res.render('users/users', {
    namePages
  });
});

return router;
};


