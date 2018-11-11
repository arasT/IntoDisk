var walk 	= require('walkdir');
var fs 		= require('fs'),
				path 					= require('path'),
				util					= require('util'),
				EventEmitter 	= require('events').EventEmitter;

/*
	* Create a sunburst data representation of a given path using informations
	*	about files and directories already scanned from memory
*/

// Constructor
function Sunburst(givenPath, data, depth) {
	this.givenPath = givenPath;
	this.data = data;
	this.depth = depth;
	this.tree = {};
	this.maxData = 25000;			// Max data to display on the sunburst to avoid crash
}

util.inherits(Sunburst, EventEmitter);

// Create sunburst
Sunburst.prototype.create = function() {
	var self = this;

	// Save each branch to dict to simplify branch and leaf mapping
	var dictPathBranch = {};	// Contains fullPath as keys and respective branch as values

	// Initialize the tree
	this.tree = {
		'fullPath'	: this.givenPath,
		// Partition or root have full path as base name
		'name'		: path.basename(this.givenPath) >= 0 ? this.givenPath : path.basename(this.givenPath),
		'children': [],
		'type'		: 'directory'
	};

	// If the given data is an empty object (empty directory), create an empty tree
	if (!self.data.size) {
		this.tree.size = 0;
		//this.tree.extStat = {};
	} else {
		this.tree.size = self.data[this.givenPath].size;
		//this.tree.extStat = self.data[this.givenPath].extStat;
	}

	dictPathBranch[this.givenPath] = this.tree;

	// Create the root tree using asynchronous method and 'root in tree width' algorithm
	// The initial parent list for same level is the root
	var parentSameLevelList = [ this.givenPath ];
	// Same level children directory list, will become next parent
	var childrenSameLevelList = [];

	// Walk though the given path using 'walkdir' width depth options
	var options = {
		"max_depth"				: self.depth,
		"track_inodes"		: true
	};
	var amountData = 0;
	var walkDirAsync = walk(this.givenPath, options, function(currentPath, stat) {

		// Check max data to display to avoid crash, the sunburst aspect is affected if maxData is reached
		amountData += 1;
		if (amountData > self.maxData) {
			this.end();
		}

		// Check if parent of the current path is not anymore
		//		into the list of parent for same level, if so update the parent list
		var currentPathParent = path.dirname(currentPath);
		if (parentSameLevelList.join(' | ').indexOf(currentPathParent) < 0) {
			//console.log('-------------- next level -------------------');
			parentSameLevelList = childrenSameLevelList;
			childrenSameLevelList = [];
		}
		//console.log(currentPath);
	});

	// If the current path is a directory:
	//		update the list of children in the same level
	//		and update parent's branch (directory) children
	walkDirAsync.on('directory', function(currentPath, stat) {

		// Note: There is a problem when scanning partition (ex: 'C:\' become 'C:\\' )
		//		we cannot scan 'C:', we have to scan 'C:\'
		currentPath = currentPath.replace(/\\\\/g, '\\');

		childrenSameLevelList.push(currentPath);

		var currentPathSize = 0;
		//var currentPathExtStat = {};
		try {
			currentPathSize = self.data[currentPath].size;
			//currentPathExtStat = self.data[currentPath].extStat;
		} catch(e) {}

		var currentBranch = {
			'fullPath': currentPath,
			'name'		: path.basename(currentPath),
			'size'		: currentPathSize,
			//'extStat'	: currentPathExtStat,
			'children': [],
			'type'		: 'directory'
		};
		dictPathBranch[path.dirname(currentPath)].children.push(currentBranch);

		dictPathBranch[currentPath] = currentBranch;
	});

	// If the current path is a file, update parent's leaf (file) children
	walkDirAsync.on('file', function(currentPath, stat) {

		// Note: There is a problem when scanning partition (ex: 'C:\' become 'C:\\' )
		currentPath = currentPath.replace(/\\\\/g, '\\');

		var currentPathSize = 0;
		try {
			currentPathSize = self.data[currentPath].size;
		} catch(e) {}

		var currentLeaf = {
			'fullPath': currentPath,
			'name'		: path.basename(currentPath),
			'size'		: currentPathSize
		};

		// Note: There is a problem with Mac (some file is considered as directory ex: /usr/bin/stringdups)
		try {
			dictPathBranch[path.dirname(currentPath)].children.push(currentLeaf);
		} catch(e) {}
	});

	walkDirAsync.on('end', function(){
		self.emit('end');
	});

};


// Export the class
exports.Sunburst = function(givenPath, data, depth) {
	return new Sunburst(givenPath, data, depth);
};
