var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
var flash = require('connect-flash');
var fileupload = require('express-fileupload');


const productionDB = {
  user: 'htzryijxomsdpa',
  host: 'ec2-35-169-188-58.compute-1.amazonaws.com',
  database: 'd8p229hq1t72b5',
  
  password: '3452aa39e18db70b942b10bdc24c61754a41369636ced465220b982f5e7ea915',
  port: 5432,
  ssl: { rejectUnauthorized: false }
}
const developmentDB = {
  user: 'postgres',
  host: 'localhost',
  database: 'Project Management System',
  
  password: 'aldi',
  port: 5432,
}


const isDevelopment = false
const { Pool } = require('pg')
let pool = null
if (isDevelopment) {
  pool = new Pool(productionDB)
} else {
  pool = new Pool(developmentDB)
}

var indexRouter = require('./routes/index')(pool);
var projectsRouter = require('./routes/projects')(pool);
var profileRouter = require('./routes/profile')(pool);
var usersRouter = require('./routes/users')(pool);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'aldidstar'
}))
app.use(flash());
app.use(fileupload());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/profile', profileRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
