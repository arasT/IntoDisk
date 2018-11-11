var express = require('express');
var router = express.Router();
var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec;
var si = require('systeminformation'),
    jsonfile = require('jsonfile');

var diScan = require('../di_modules/scan.js'),
      diSunburst = require('../di_modules/sunburst.js'),
      diUtils = require('../di_modules/utils.js');

var HEADER_STREAM = {
  'Connection'    : 'keep-alive',
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache'
};

// Global variable initialization
var latestOpenedFile = '';  // Holds the latest opened file (usefull when user save)
var appExt = 'intoDisk';    // File extension for this app

var title = 'Full/Partial Scan';
var maxDepth = 2;           // Depht of scan to display at sunburst chart
var chunkSize = 1000;       // Size of sunburst chunk to stream (avoid crash for large data)
var dirFileInfo = {};       // Holds informations about all scanned files/directories
var latestScannedPath = ''; // Holds the latest scanned path (usefull at refresh action)
// Holds partitionId as keys and dict as values (files type as keys and total size as values)
var partExtStat = {};

/*
// For development process use the code bellow
// Holds file path that contains all extensions
var configPath = path.join(__dirname, '../public/config/diExtension.json');
// Holds file path that contains informations about latest opend/saved file;
var openSavePath = path.join(__dirname, '../public/config/diSave.json');
*/


// For production use the code bellow and don't forget to copy config files
// Holds file path that contains all extensions
var configPath = path.join(path.dirname(process.execPath), 'config/diExtension.json');
// Holds file path that contains informations about latest opend/saved file;
var openSavePath = path.join(path.dirname(process.execPath), 'config/diSave.json');


var os = '';
si.osInfo(function(osInfo) {
	os = osInfo.platform;
});

// Get path of the latest opened/saved file and popularize global variable
try {
  var opendSavedContent = jsonfile.readFileSync(openSavePath);

  if ( fs.existsSync(path.normalize(opendSavedContent.fullPath)) ) {
    latestOpenedFile = opendSavedContent.fullPath;
    //console.log('\n',latestOpenedFile,'\n');

    // Update title to help user about emplacement of data file
    title = latestOpenedFile;

    var fileContent = jsonfile.readFileSync(latestOpenedFile);
    dirFileInfo = fileContent.dirFileInfo;
    partExtStat = fileContent.partExtStat;
  }
} catch(e) {}

// Default extension if the config folder was removed
var extensionConfig = {
  "Directory": {"ext": [],"color": "#404040"},
  "Others": {"ext": [],"color": "#FF00FF"},
  "Audio": {"ext": ["aif", "iff", "m3u", "m4a", "mid", "mp3", "mpa", "wav", "wma"],"color": "#7b615c"},
  "Compressed": {"ext": ["7z", "cbr", "deb", "gz", "pkg", "rar", "rpm", "sitx", "targz", "zip", "zipx", "tar"],"color": "#a173d1"},
  "Database": {"ext": ["accdb", "db", "dbf", "mdb", "pdb", "sql"],"color": "#C64C6D"},
  "Developper": {"ext": ["c", "class", "cpp", "cs", "dtd", "fla", "h", "java", "lua", "m", "pl", "py", "sh", "sln", "swift", "vb", "vcxproj", "xcodproj"],"color": "#ED145B"},
  "DiskImage": {"ext": ["bin", "cue", "dmg", "iso", "mdf", "toast", "vcd"],"color": "#0D5C00"},
  "Document": {"ext": ["doc", "docx", "msg", "odt", "pages", "rtf", "tex", "txt", "wpd", "wps", "csv", "key", "ged", "keychain", "pps", "ppt", "pptx", "sdf", "tax2016", "vcf", "xml", "indd", "pct", "pdf", "xlr", "xls", "xlsx", "fnt", "fon", "otf", "ttf"],"color": "#00FF00"},
  "Executable": {"ext": ["apk", "app", "bat", "cgi", "com", "exe", "cadget", "jar", "wsf"],"color": "#5F3200"},
  "Image": {"ext": ["bmp", "dds", "gif", "jpg", "png", "psd", "pspimage", "tga", "thm", "tif", "tiff", "yuv", "ai", "eps", "ps", "svg", "dwg", "dxf", "ai", "eps", "ps", "svg", "3dm", "3ds", "max", "obj"],"color": "#de783b"},
  "System": {"ext":["dat", "cab", "cpl", "cur", "deskthemepack", "dll", "dmp", "drv", "icns", "ico", "lnk", "sys", "cfg", "ini", "prf", "back", "tmp", "msi"],"color": "#FFFC00"},
  "Video": {"ext": ["3g2", "3gp", "asf", "avi", "flv", "m4v", "mov", "mp4", "mpg", "rm", "srt", "swf", "vob", "wmv"],"color": "#00BFFF"},
  "Web": {"ext": ["asp", "aspx", "cer", "cfm", "csr", "css", "htm", "html", "js", "jsp", "php", "rss", "xhtml", "torrent", "crdownload", "part", "gpx", "kml", "kmz"],"color": "#0000FF"}
};


// *******************  Route definition *******************

/* Get page for partial scan and returns without data if path is not specified */
router.get('/', function(req,res,next) {

  // Get extension and color from file configuration
  try {
    var diReadFile = diUtils.diReadFile(configPath);
    extensionConfig = JSON.parse(diReadFile.data);
  } catch(e) {}

  res.render('scan', { title : title,
    os : os, data : JSON.stringify('no scan'), extensionConfig : JSON.stringify(extensionConfig) });
});

/* Refresh all datas before scanning all partitions */
router.get('/refreshAllData', function(req,res,next) {
  res.writeHead(200, HEADER_STREAM);
  dirFileInfo = {};
  partExtStat = {};
  res.write(['data:', JSON.stringify({done:'true'}), '\n\n'].join(''));
});

/* Refresh global variable (data into memory) when user click on 'New' menu */
router.get('/new', function(req,res,next) {
  dirFileInfo = {};
  partExtStat = {};
  title = 'Full/Partial Scan';

  //Also, reinitialize informations about latest opend or saved file (because users want a new work)
  jsonfile.writeFileSync(openSavePath, {"fullPath":""});

  // Get extension and color from file configuration
  try {
    var diReadFile = diUtils.diReadFile(configPath);
    extensionConfig = JSON.parse(diReadFile.data);
  } catch(e) {}

  res.render('scan', { title : title,
    os : os, data : JSON.stringify('no scan'), extensionConfig : JSON.stringify(extensionConfig) });
});

/* Open a file and popularize global variable with file content */
router.get(/\/fileToOpen\/(.+)/, function(req,res,next) {
  var filePath = path.normalize(req.params[0]);
  //var filePath = path.normalize('D:/pers/dev/nodeJs/test_parcours/test.intoDisk');
  var fileContent = {};
  res.writeHead(200, HEADER_STREAM);

  try {
    //fileContent = fs.readFileSync(filePath);
    fileContent = jsonfile.readFileSync(filePath);
    dirFileInfo = fileContent.dirFileInfo;
    partExtStat = fileContent.partExtStat;
    //console.log(fileContent);
    latestOpenedFile = filePath;
    title = latestOpenedFile;

    // Update configuration file
    jsonfile.writeFileSync(openSavePath, {"fullPath":filePath});
    var successMessage = ['\'', filePath, '\'', ' opened successfully!'].join('');
    res.write(['data:', JSON.stringify({success:'success', message:successMessage}), '\n\n'].join(''));
  } catch(e) {
    var errorMessage = ['An error appears while opening ', '\'', filePath, '\'!',
                            '<br/> Please select a correct file.'].join('');
    res.write(['data:', JSON.stringify({error:'error', message:errorMessage}), '\n\n'].join(''));
  }
});

/* Check if user have already open a file containing data */
router.get('/checkOpenFile', function(req,res,next) {
  res.writeHead(200, HEADER_STREAM);
  if (latestOpenedFile.length > 0) {
    res.write(['data:', JSON.stringify({filePath:latestOpenedFile}), '\n\n'].join(''));
  } else {
    res.write(['data:', JSON.stringify({notFile:'true'}), '\n\n'].join(''));
  }
});

/* Save a file and popularize it with global variable */
router.get(/\/fileToSave\/(.+)/, function(req,res,next) {
  var filePath = path.normalize(req.params[0]);

  // First check if the given path have an extension and adjust it with extension for this app
  var pathPart = filePath.split('.');
  if (pathPart[pathPart.length - 1] != appExt) {
    filePath += '.' + appExt;
  }

  //var fileContent = {"main": "index.html","dependencies": { "mime": "^1.5.0" }};
  var fileContent = {
    'dirFileInfo'     : dirFileInfo,
    'partExtStat'   : partExtStat
  };
  res.writeHead(200, HEADER_STREAM);
  try {
    //fs.writeFileSync(filePath, JSON.stringify(fileContent));
    jsonfile.writeFileSync(filePath, fileContent);
    latestOpenedFile = filePath;
    title = latestOpenedFile;

    // Update configuration file
    jsonfile.writeFileSync(openSavePath, {"fullPath":filePath});
    var successMessage = ['\'', filePath, '\'', ' saved successfully!'].join('');
    res.write(['data:', JSON.stringify({success:'success', message:successMessage}), '\n\n'].join(''));
  } catch(e) {
    var errorMessage = ['An error appears while saving ', '\'', filePath, '\'!'].join('');
    res.write(['data:', JSON.stringify({error:'error', message:errorMessage}), '\n\n'].join(''));
  }

});

/* Check if a path was already scanned */
router.get(/\/checkScan\/(.+)/, function(req,res,next) {
  var result = 'not scanned';
  if (dirFileInfo[path.normalize(req.params[0])]) {
    result = 'scanned';
  }

  // Send the result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify(result), '\n\n'].join(''));
});

/* Streams parent of the sunburst, else return 'ancestor' */
router.get(/\/getParent\/(.+)/, function(req,res,next) {
  var childPath = path.normalize(req.params[0]);
  var parentPath = path.dirname(childPath);
  var parent = {'ancestor':'ancestor'};

  // If the childPath and the parentPath is the same, this is an partition
  if (childPath != parentPath) {

    // Check if the parentPath was already scannedPath
    if (dirFileInfo[parentPath]) {
      var name = path.basename(parentPath) >= 0 ? parentPath : path.basename(parentPath);
      parent = {
        'fullPath': parentPath,
        'name'		: name,
        'size'		: dirFileInfo[parentPath].size
        //'extStat'	: dirFileInfo[parentPath]['extStat']
      };
    }
  }

  // Send the parent
  res.writeHead(200, HEADER_STREAM);
  res.write('data:'+JSON.stringify(parent)+'\n\n');

});

/* Open a folder and streams error message if error appears */
router.get(/\/open\/(.+)/, function(req, res, next) {
  var pathToOpen = path.normalize(req.params[0]);
  var command = '', option = '';

  // Set header
  //res.writeHead(200, HEADER_STREAM);

  if (os == 'Linux') {

    // If the path is a file, open the directory containing it and highlight the file
    /*if (!fs.lstatSync(pathToOpen).isDirectory()) {
      option = ['-s ', pathToOpen].join('');
      pathToOpen = path.dirname(pathToOpen);
    }
    command = ['nautilus ', pathToOpen, ' ', option].join('');*/
    command = ['nautilus ', pathToOpen].join('');
  }
  if (os == 'Darwin') {
    if (!fs.lstatSync(pathToOpen).isDirectory()) {
      pathToOpen = path.dirname(pathToOpen);        // Open the parent directory for a file
    }
    command = ['open ', pathToOpen].join('');
  }
  if (os == 'Windows') {

    // If the path is a file, open the directory containing it and highlight the file
    if (!fs.lstatSync(pathToOpen).isDirectory()) {
      option = '/select,';
    }
    //pathToOpen = path.replace('/','\\');
    command = ['explorer ', option, ' ', pathToOpen].join('');
  }

  exec(command, function(error, stdout, stderr) {

    // For UNKNOWN reason it always returns error
    /*if (error) {
      var errorMessage = ['Cannot open \'', pathToOpen, '\'!'].join('');
      //res.write(['data:', JSON.stringify({error:true, message : errorMessage}), '\n\n'].join(''));
      res.json({error:true, message : errorMessage});
    } else {
      //res.write(['data:', JSON.stringify({success:true}), '\n\n'].join(''));
      res.json({success:true});
    }*/
    res.json({success:true});
  });

});

/* Streams informations about file/directory */
router.get(/\/getInfo\/(.+)/,function(req, res, next) {
  var pathToGetInfo = path.normalize(req.params[0]);
  var properties = diUtils.diProperties(pathToGetInfo, dirFileInfo[pathToGetInfo].size);

  // Send the informations
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify(properties), '\n\n'].join(''));
});

/* Open a folder and streams error message if error appears */
router.get(/\/getStat\/(.+)/, function(req, res, next) {
  var pathToGetStat = path.normalize(req.params[0]);

  // For Windows a dot was automatically added for unknown reason
  if (os == 'Windows') {
    if (pathToGetStat[pathToGetStat.length - 1] == '.') {
      pathToGetStat = pathToGetStat.substring(0, pathToGetStat.length - 1);
    }
  }

  try {
    res.json(calculDirStat(pathToGetStat));
  } catch(e) { res.json({error : true , message : ["Cannot get statistic about '", pathToGetStat, "'!"].join("")}); }

});

/* Delete file/directory given in parameter and update saved informations into memory */
router.get(/\/delFileDir\/(.+)/,function(req, res, next) {
  var pathToDel = path.normalize(req.params[0]);
  var delResult = diUtils.diDelete(pathToDel);

  // If operation succeed, update parent size of the given object
  //    then delete it (and its children if it's a directory) from memory
  if (delResult.success) {
    updateParentSize(pathToDel, dirFileInfo[pathToDel].size);

    //if (dirFileInfo[pathToDel].extStat) {
    if (delResult.type == 'directory') {

      // Run thought dirFileInfo and put in list full path of object having path to delete
      var objectPathToUpdateList = [];
      for (var fullPath in dirFileInfo) {
        if (fullPath.indexOf(path.join(pathToDel, path.sep)) != -1) {
          objectPathToUpdateList.push(fullPath);
        }
      }
      objectPathToUpdateList.forEach(function(toDel) {
        delete dirFileInfo[toDel];
      });
    }

    delete dirFileInfo[pathToDel];
  }

  // Send result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify(delResult), '\n\n'].join(''));
});

/* Rename file/directory given in parameter and update saved informations into memory */
router.get(/\/renameFileDir\/(.+)/,function(req,res,next) {
  var allPaths = req.params[0].split('<>');
  //console.log(allPaths);

  var oldPath = path.normalize(allPaths[0]);
  var newPath = path.join(path.dirname(oldPath), allPaths[1]);
  var renameRes = diUtils.diRename(oldPath, newPath);

  // If operation succeed, update informations into memory then delete the given object
  if (renameRes.success && oldPath != newPath) {
    //console.log(objType);
    updateFullPath(oldPath, newPath, renameRes.type);
  }

  // Send result
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify(renameRes), '\n\n'].join(''));
});

/* Search and returns full path list of scanned file/directory using AJAX */
router.get(/\/search\/(.+)/, function(req,res,next) {
  var criteria = req.params[0];
  //console.log(criteria);

  // List of list [name, fullPath] of file/directory corresponding of the criteria
  // More about this list of list, refer to javascript-autcomplete doc (part "advanced suggestion")
  var resultList = [];
  var nbFound = 0;                                    // Limit the number of response to avoid javascript memory error in views
  for (var fp in dirFileInfo) {
    var name = path.basename(fp) >= 0 ? fp : path.basename(fp);
    var color = extensionConfig.Directory.color;   // Default color is Directory color
    var type = 'directory';                           // Default type is 'directory' (Directory is a category but 'directory' is != 'file')
    if (name.indexOf(criteria) != -1) {

      // Check if the found path has an extension and get each corresponding color
  		var crtPathSplit = fp.split('.');
  		if (crtPathSplit.length > 1 && crtPathSplit[crtPathSplit.length - 1].length > 0) {
  			var crtExtension = crtPathSplit[crtPathSplit.length - 1];

  			var extExist = false;
  			for (var fType in extensionConfig) {
  				if (extensionConfig[fType].ext.join(' ').indexOf(crtExtension) != -1) {
  					color = extensionConfig[fType].color;
            type = fType;
  					extExist = true;
  					break;
  				}
  			}
  			if (!extExist) {
          type = 'Others';
  				color = extensionConfig.Others.color;
  			}
  		}

      //resultList.push([name, fp]);
      resultList.push({'Name' : name, 'FullPath' : fp, 'Color' : color, 'Type' : type});
      nbFound += 1;
    }
    if (nbFound == 1000) {
      break;
    }
  }

  // Send result
  res.json(resultList);
});

/* Streams file statistic, after statistic updated */
router.get('/fileStat',function(req,res,next) {

  //console.log(partExtStat);
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify(partExtStat), '\n\n'].join(''));
});

/* Stream to update file statistic, for example after file types extensions changed and saved */
router.get('/updateStat',function(req,res,next) {
  var scannedPartList = [];
  for (var scannedPart in partExtStat) {
    //calculPartStat(scannedPart);
    scannedPartList.push(scannedPart);
  }
  calculPartStat(scannedPartList);
  //console.log(partExtStat);
  res.writeHead(200, HEADER_STREAM);
  res.write(['data:', JSON.stringify({}), '\n\n'].join(''));
});

/* Get page for full scan: scan one or many partitions
  * url patterns is like /fullScan/idPart_1<>idPart_2<>...<>idPart_n
*/
router.get(/\/fullScan\/(.+)/,function(req,res,next) {
  var partitionIdList = [];
  req.params[0].split('<>').forEach(function(partId) {
    if (partId.length > 0) {

      //For Windows: normalize given partition Id path by adding separator (ex: C: -> C:\\)
      if (os == 'Windows') {
        partitionIdList.push(partId + path.sep);
      } else {  // Linux, Darwin
        partitionIdList.push(partId);
      }
    }
  });

  // Stream status of each scan
  res.writeHead(200, HEADER_STREAM);

  // Delete saved data from memory  TO IMPROVE
  /*for (var partIndex=0; partIndex < partitionIdList.length; partIndex++) {
    var pathList = Object.keys(dirFileInfo);
    for (var pathIndex=0; pathIndex < pathList.length; pathIndex++) {
      if (pathList[pathIndex].indexOf(partitionIdList[partIndex]) != -1) {
        delete dirFileInfo[pathList[pathIndex]];
        //console.log(dirFileInfo[pathList[pathIndex]]);
      }
    }
  }*/

  // Scan all given partition
  (function scanPartition(index) {

    var scanPath = new diScan.Scan(partitionIdList[index]);
    scanPath.aSync();

    // Signal the begining of scan for each partition
    res.write(['data:', JSON.stringify('begin'), '\n\n'].join(''));

    var currentPart = partitionIdList[index];

    // Remove '/' or '\' to correspond width id in view which not accept thoses chars
    currentPart = currentPart.substring(0, (currentPart.length-1));

    // Stream scan state
    scanPath.on('status', function(status) {
      res.write(['data:', JSON.stringify(status), '\n\n'].join(''));
    });

    scanPath.on('end', function() {

      // Signal the end of scan for each partition and clear interval
      res.write(['data:', JSON.stringify('finish'), '\n\n'].join(''));

      // Update informations about files and directories into memory
      for (var path in scanPath.dirFile) {
        dirFileInfo[path] = scanPath.dirFile[path];
      }

      // Update file statistic about scanned partition when scan was finished then close stream
      if (index == (partitionIdList.length - 1)) {
        (function recurseCalculation(partId) {
          if (partId == partitionIdList.length) {
            return;
          }
          //calculPartStat(partitionIdList[partId]);
          recurseCalculation(partId + 1);
        })(0);

        calculPartStat(partitionIdList);

        res.write(['data:', JSON.stringify('end'), '\n\n'].join(''));
        return;
      }
      scanPartition(index + 1);
    });
  })(0);

});

// Stream sunburst each time user click on an arc
router.get(/\/streamSunburst\/(.+)/,function(req,res,next) {
  latestScannedPath = path.normalize(req.params[0]);
  var sunburst = new diSunburst.Sunburst(latestScannedPath, dirFileInfo, maxDepth);
  sunburst.create();

  sunburst.on('end', function() {
    var treeResult = sunburst.tree;

    // Set root size
    var rootFullPath = treeResult.fullPath;
    treeResult.size = dirFileInfo[rootFullPath].size;

    // Send the sunburst result
    res.writeHead(200, HEADER_STREAM);

    // Chunk tree to avoid crash for large data
    /*var iteratorTree = yieldTree(JSON.stringify(treeResult));
    var crtChunk = '';
		while(true) {
      crtChunk = iteratorTree.next();
      if (crtChunk.done) {
        break;
      }
      res.write(['data:', crtChunk.value, '\n\n'].join(''));
		}
    res.write(['data:', 'done', '\n\n'].join(''));*/

    res.write(['data:', JSON.stringify(treeResult), '\n\n'].join(''));
  });
});

/*function* yieldTree(treeString) {
	var chunkTree = treeString, crtIndex = 0;
	while(chunkTree.length > 0) {
		chunkTree = treeString.substr(crtIndex, chunkSize);
		crtIndex += chunkSize;

		yield chunkTree;
	}
}*/

// Display sunburst for an already scanned path
router.get(/\/displaySunburst\/(.*)/, function(req,res,next) {
  if (req.params[0].length > 0) {
    latestScannedPath = path.normalize(req.params[0]);
  }
  //latestScannedPath = path.normalize(req.params[0]);

  // If the informations about latestScannedPath is missing (renaming / deletion)
  //    redirect to default page
  if (!dirFileInfo[latestScannedPath]) {
    res.redirect('/scan');
    return;
  }

  var sunburst = new diSunburst.Sunburst(latestScannedPath, dirFileInfo, maxDepth);
  sunburst.create();
  sunburst.on('end', function() {
    var treeResult = sunburst.tree;
    // Set root size
    var rootFullPath = treeResult.fullPath;
    treeResult.size = dirFileInfo[rootFullPath].size;

    // Change slash to back slash to avoid display problem in view
    var scannedPath = latestScannedPath.replace(/\\/g, '/');

    // Get extension and color from file configuration
    try {
      var diReadFile = diUtils.diReadFile(configPath);
      extensionConfig = JSON.parse(diReadFile.data);
    } catch(e) {}
    res.render('scan', {
                          title: title,
                          os : os,
                          scannedPath : scannedPath,
                          data : JSON.stringify(treeResult),
                          extensionConfig : JSON.stringify(extensionConfig) });
  });
});

// Scan a given path (and stream state): on new scan or on refresh
router.get(/\/partialScan\/(.*)/,function(req,res,next) {

  var givenPath = req.params[0];

  // No path is given in url if user want to refresh, it refresh the latest scanned path
  if (givenPath.length > 0) {
    latestScannedPath = path.normalize(givenPath);
   }

   res.writeHead(200, HEADER_STREAM);

   //Redirect to default page if the given path (assigned to latestScannedPath) doesn't exist
   if (!fs.existsSync(latestScannedPath)) {
     res.write(['data:', JSON.stringify('incorrect_path'), '\n\n'].join(''));
     return;
   }

  // Delete informations about the latest scanned path from memory
  delete dirFileInfo[latestScannedPath];

  var scanPath = new diScan.Scan(latestScannedPath);

  scanPath.aSync();

  // Stream scan state
  scanPath.on('status', function(status) {
    res.write(['data:', JSON.stringify(status), '\n\n'].join(''));
  });
  scanPath.on('end', function() {
    res.write(['data:', JSON.stringify({'state':'end', 'scannedPath':latestScannedPath}), '\n\n'].join(''));

    // Update informations about files and directories into memory
    for (var path in scanPath.dirFile) {
      dirFileInfo[path] = scanPath.dirFile[path];
    }
  });

});


// Update parents of given file/directory into memory before deleting it
function updateParentSize(pathToDel, size) {

  while(path.basename(pathToDel).length > 0) {
  	pathToDel = path.dirname(pathToDel);
    if (!dirFileInfo[pathToDel]) {
      return;
    }
    dirFileInfo[pathToDel].size -= size;
  }
}

// Update path of the renamed object and of its children if it's a directory
function updateFullPath(oldPath, newPath, objType) {

  // Update the renamed object and its children if the renamed object is a directory
  //if (dirFileInfo[oldPath].extStat) {
  if (objType == 'directory') {

    // Run thought dirFileInfo and put in list full path of object having oldPath
    var objectPathToUpdateList = [];
    for (var fullPath in dirFileInfo) {
      if (fullPath.indexOf(oldPath) != -1) {
        objectPathToUpdateList.push(fullPath);
      }
    }
    objectPathToUpdateList.forEach(function(toUpdatePath) {

      // Create new object with new path
      var updatedPath = toUpdatePath.replace(oldPath, newPath);
      var oldData = dirFileInfo[toUpdatePath];
      dirFileInfo[updatedPath] = {
        'fullPath'    : updatedPath,
        'size'        : oldData.size
        //'extStat'   : oldData['extStat']
      };
      //if (oldData.extStat) {  // File object doesn't have 'extStat' attributes
      //  dirFileInfo[updatedPath]['extStat'] = oldData['extStat'];
      //}

      // Finally delete oldData object except the renamed object
      if (newPath != toUpdatePath) {
        delete dirFileInfo[toUpdatePath];
      }
    });
  } else {        // Object to rename is a file
    var oldData = dirFileInfo[oldPath];
    dirFileInfo[newPath] = {
      'fullPath'    : newPath,
      'size'        : oldData.size
    };
    delete dirFileInfo[oldPath];
  }

}

// Calculate file statistic for a given partition list and save it into the global variables partExtStat
function calculPartStat(partIdList) {

  // Get extension and color from file configuration
  try {
    var diReadFile = diUtils.diReadFile(configPath);
    extensionConfig = JSON.parse(diReadFile.data);
  } catch(e) {}

	// Initialize statistic for each partition
  partIdList.forEach(function(partId) {
    partExtStat[partId] = {};

  	for (var fileType in extensionConfig) {
  		partExtStat[partId][fileType] = 0;
  	}
  	partExtStat[partId].Others = 0;
  });

	for (var k in dirFileInfo) {

    // Run thought each partition into given list
    partIdList.forEach(function(partId) {

      // Check if the path bellong to the correct partition
      if (k.indexOf(partId) != -1) {

    		// Check if the path has an extension
    		var crtPathSplit = dirFileInfo[k].fullPath.split('.');
    		if (crtPathSplit.length > 1 && crtPathSplit[crtPathSplit.length - 1].length > 0) {
    			//console.log(crtPathSplit[crtPathSplit.length - 1]);
    			var crtExtension = crtPathSplit[crtPathSplit.length - 1];

    			var extExist = false;
    			for (var fType in extensionConfig) {
    				if (extensionConfig[fType].ext.join(' ').indexOf(crtExtension) != -1) {
    					partExtStat[partId][fType] += dirFileInfo[k].size;
    					extExist = true;
    					break;
    				}
    			}
    			if (!extExist) {
    				partExtStat[partId].Others += dirFileInfo[k].size;
    			}
    		}   // End path has an extension
      }     // End path bellong to correct partition

    });     // End loop for each partition

	}        // End loop into dirFileInfo
}

// Calculate file statistic for a given directory and return an object containing statistic
function calculDirStat(fullPath) {

  // Get extension and color from file configuration
  try {
    var diReadFile = diUtils.diReadFile(configPath);
    extensionConfig = JSON.parse(diReadFile.data);
  } catch(e) {}

	// Initialize statistic for each type
  var dirStat = {};
	for (var fileType in extensionConfig) {
		dirStat[fileType] = 0;
	}
	dirStat.Others = 0;

  var fullPathBellong = false;
	for (var k in dirFileInfo) {

    fullPathBellong = fullPath.substring(0, fullPath.length) == k.substring(0, fullPath.length) ? true : false;

    // Check if the path bellong to the correct directory
    //if (k.indexOf(fullPath) != -1) {
    if (fullPathBellong) {

  		// Check if the path has an extension
  		var crtPathSplit = dirFileInfo[k].fullPath.split('.');
  		if (crtPathSplit.length > 1 && crtPathSplit[crtPathSplit.length - 1].length > 0) {
  			var crtExtension = crtPathSplit[crtPathSplit.length - 1];

  			var extExist = false;
  			for (var fType in extensionConfig) {
  				if (extensionConfig[fType].ext.join(' ').indexOf(crtExtension) != -1) {
  					dirStat[fType] += dirFileInfo[k].size;
  					extExist = true;
  					break;
  				}
  			}
  			if (!extExist) {
  				dirStat.Others += dirFileInfo[k].size;
  			}
  		}   // End path has an extension
    }     // End path bellong to correct partition

	}        // End loop into dirFileInfo

  return dirStat;
}


module.exports = router;
