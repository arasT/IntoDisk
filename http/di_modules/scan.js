var walk 	= require('walkdir');
var fs 		= require('fs'),
				path 			= require('path'),
				util 			= require('util'),
				EventEmitter 	= require('events').EventEmitter;

/*
	* Scan a given path and save informations about files and directories inside it
	* Use 'walkdir' npm package for convenience and performance
*/

// varructor
function Scan(givenPath) {
	//this.givenPath = path.normalize(givenPath);
	this.givenPath = givenPath;
	this.dirFile = {};
	this.totalFileSize = 0;
	this.nbScannedElts = 0;
}

util.inherits(Scan, EventEmitter);

// Scan path function using asynchronous method
Scan.prototype.aSync = function () {
	var walkDirAsync = walk(this.givenPath);
	var self = this;

	// Emit scan state
	var emitInterval = setInterval(function(){
		var currentPath = self.givenPath;

		// '\' slash generate problem on view, ex: scanning D:\ on Windows
		if (currentPath[currentPath.length - 1] == '\\') {
			currentPath = currentPath.substring(0, currentPath.length - 1);
		}
		var status = {
			'id'              : currentPath,
			'totalFileSize'  : self.totalFileSize,
			'nbScannedElts'  : self.nbScannedElts
		};
		self.emit('status', status);
	}, 250);

	walkDirAsync.on('file' || 'link', function(filePath, stat) {
		self.scanFile(filePath, stat);
	});

	walkDirAsync.on('directory', function(dirPath, stat) {
		self.scanDirectory(dirPath);
	});

	walkDirAsync.on('end', function() {
		clearInterval(emitInterval);
		self.emit('end');
	});
};

// Scan path function using synchronous method
Scan.prototype.sync = function() {
	var self = this;

	walk.sync(this.givenPath, function(path, stat) {
		if (fs.statSync(path).isFile()) {
			self.scanFile(path, stat);
		}
		if (fs.statSync(path).isDirectory()) {
			self.scanDirectory(path);
		}
	});
};

// Method used while scanning file
Scan.prototype.scanFile = function (filePath, stat) {

	// Note: There is a file with 140 737 477 881 856 bytes (/proc/kcore) on Linux (140 TB)
	//				Avoid to save file upper 100 TB
	if (stat.size < 100000000000000) {
		// Note: There is a problem when scanning partition (ex: 'C:\' become 'C:\\' )
		//		we cannot scan 'C:', we have to scan 'C:\'
		filePath = filePath.replace(/\\\\/g, '\\');

		// Save informations about this file into memory
		this.dirFile[filePath] = {
			'fullPath'			:	filePath,
			'size'					:	stat.size
			//'type'				:	'file'
		};

		// Update total size of scanned elements
		this.totalFileSize += stat.size;

		// Update numbers of scanned elements
		this.nbScannedElts += 1;

		// Create or update its parent and ancestors directories
		var currentPath = this.dirFile[filePath].fullPath;
		while (currentPath != this.givenPath) {

			currentPath = path.dirname(currentPath);
			if (!this.dirFile[currentPath]) {
				this.dirFile[currentPath] = {
					'fullPath'			:	currentPath,
					'size'				  :	this.dirFile[filePath].size
					//'type'			  :	'directory'
					//'extStat'			:	{}
				};
			}
			else {
				this.dirFile[currentPath].size += this.dirFile[filePath].size;
			}
		}

	}
};

// Method used while scanning directory
Scan.prototype.scanDirectory = function(dirPath) {

	// Note: There is a problem when scanning partition (ex: 'C:\' become 'C:\\' )
	dirPath = dirPath.replace(/\\\\/g, '\\');

	// Update numbers of scanned elements
	this.nbScannedElts += 1;

	//Save informations about this directory into memory if not yet done
	if (!this.dirFile[dirPath]) {
		this.dirFile[dirPath] = {
			'fullPath'			:	dirPath,
			'size'				:	0
			//'type'			:	'directory'
			//'extStat'			:	{}
		};
	}
};


// Export the class
exports.Scan = function(givenPath) {
	return new Scan(givenPath);
};
