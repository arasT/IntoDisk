var express = require('express');
var router = express.Router();
var si = require('systeminformation');
var fs = require('fs'),
    path = require('path');

var HEADER_STREAM = {
  'Connection'    : 'keep-alive',
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache'
};

/* Streams file system informations */
router.get('/fsInfo', function(req,res,next) {

  var fileSysInfoList = [];
  si.fsSize(function(fsList) {
    fsList.forEach(function (fSys) {

  		// Don't work with file system without size
  		if (fSys.size) {
  			fileSysInfoList.push(fSys);
  		}
  	});

    // Send the informations
    res.writeHead(200, HEADER_STREAM);
    res.write(['data:', JSON.stringify(fileSysInfoList), '\n\n'].join(''));
  });

});

/* Check if a file/directory already exist and check if the given path is a file or directory */
router.get(/\/checkFileDir\/(.+)/,function(req,res,next) {
  var allPaths = req.params[0];
  var oldFullPath = allPaths.split('<>')[0];
  var newName = allPaths.split('<>')[1];
  var newFullPath = path.join(path.dirname(oldFullPath), newName);
  var isExist = false;
  var type = 'file';
  if (fs.existsSync(newFullPath)) {
    isExist = true;
  }
  if (fs.lstatSync(oldFullPath).isDirectory()) {
    type = 'directory';
  }

  // Send checking result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify({'isExist':isExist, 'path':newFullPath, 'type':type}), '\n\n'].join(''));
});

/* Check if a file/directory exist */
router.get(/\/checkExist\/(.+)/,function(req,res,next) {
  var fullPath = req.params[0];
  var isExist = false;
  if (fs.existsSync(fullPath)) {
    isExist = true;
  }

  // Send checking result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify({'isExist':isExist}), '\n\n'].join(''));
});

/* Check if the given path is according to the given type */
router.get(/\/checkType\/(.+)/, function(req,res,next) {
  // req.params[0] is like 'type<>path', type = 'file' || 'directory'
  var typeToCheck = req.params[0].split('<>')[0];
  var pathToCheck = path.normalize(req.params[0].split('<>')[1]);
  var type = 'file';
  if (typeToCheck == 'directory') {
    if (fs.lstatSync(pathToCheck).isDirectory()) {
      type = typeToCheck;
    } else {
      if (typeToCheck == 'file') {
        type = typeToCheck;
      }
    }
  }

  // Send checking result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify({'type':type}), '\n\n'].join(''));
});


module.exports = router;
