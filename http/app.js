/*This way of doing things (use ./app.js instead of ./bin/www) is according to:
  * https://github.com/jpotts18/mean-stack-relational
  * https://stackoverflow.com/questions/41161836/nodejs-electron-with-express
*/
(function(){
  'use strict';
  var express = require('express');
  var path = require('path');
  var favicon = require('serve-favicon');
  var logger = require('morgan');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var jsonfile = require('jsonfile');

  var index = require('./routes/index');
  var scan = require('./routes/scan');
  var stream = require('./routes/stream');
  var about = require('./routes/about');
  var tutorial = require('./routes/tutorial');
  var options = require('./routes/options');
  var search = require('./routes/search');

  var port = 3456;  //Avoid using 3000 because it's common use
  // Then try to use configuration file
  try {

    // For development process use the code bellow
    var configFileContent = jsonfile.readFileSync(path.join(__dirname, 'public/config/options.json'));

    // For production use the code bellow and don't forget to copy config files
    //var configFileContent = jsonfile.readFileSync(path.join(path.dirname(process.execPath), 'config/options.json'));

    port = configFileContent.port;
  } catch (e) {}

  var app = express();

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  // uncomment after placing your favicon in /public
  //app.use(favicon(__dirname + '/public/favicon.ico'));
  //app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/', index);
  app.use('/scan', scan);
  app.use('/stream', stream);
  app.use('/about', about);
  app.use('/options', options);
  app.use('/tutorial', tutorial);
  app.use('/search', search);

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  var server = app.listen(port, function () {
      console.log('App using port ' + server.address().port);
  });

  module.exports = app;
}());
