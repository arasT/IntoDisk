var express = require('express');
var router = express.Router();
var path = require('path'),
      jsonfile = require('jsonfile');


// For development process use the code bellow
// Holds file path that contains all extensions
var configPath = path.join(__dirname, '../public/config/diExtension.json');


// For production use the code bellow and don't forget to copy config files
// Holds file path that contains all extensions
//var configPath = path.join(path.dirname(process.execPath), 'config/diExtension.json');


var HEADER_STREAM = {
  'Connection'    : 'keep-alive',
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache'
};

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

try {
  var diReadFile = diUtils.diReadFile(configPath);
  extensionConfig = JSON.parse(diReadFile.data);
} catch(e) {}

/* GET search page. */
router.get('/', function(req, res, next) {
  res.render('search', { title: 'Search', extensionConfig : JSON.stringify(extensionConfig)});
});

module.exports = router;
