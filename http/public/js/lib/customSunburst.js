/* Creates and customizes the sunburst representation of scanned path
 *	build the sunburst chart with buildChart() function
 *	update or rebuild the chart when the user click an arc to get details of it (using buildChart() too)
 * 	update extension statistic of the root
 *  Finally create corresponding breadcrumbs
 *	Properties:
 *		- getData 				: data (tree) to create the sunburst
 *		- place 					: container Id where to display the sunburst
 *		- extStatPlace		: container Id where to display extension statistic
 *		- os							: information about os (Windows, Linux, Darwin)
 *		- extensionConfig	: data about files extension and corresponding colors
*/

function createSunburst(getData, place, extStatPlace, os, extensionConfig) {

	// remove the tips
	$(place).empty();

	// Display extensions statistic at creation of sunburst (if the root is not a file)
	/*$(extStatPlace).empty();
	if (getData.extStat != undefined)	{
		//console.log(getData.extStat);
		createStackedChart(extStatPlace, getData.extStat);
	}*/

	var width = 300,
				height = 300,
				radius = Math.min(width, height) / 2.2;

	var x = d3.scale.linear()
			.range([0, 2 * Math.PI]);

	var y = d3.scale.linear()
			.range([0, radius]);

	//var color = d3.scale.category20c();
	var color = d3.scale.category10();

	var svg = d3.select(place).append("svg")
			.attr("width", width)
			.attr("height", height)
			.append("g")
			.attr("transform", ["translate(", width / 2, ",", (height / 2 + 10), ")"].join(""));

	//Tooltip for menu at contextmenu (right click) and disapears on click
	var tooltipMenu = d3.select("body")
		.append("div")
		.style({"position" : "absolute", "top" : "0px", "z-index" : "10", "visibility" : "hidden"})
		.attr({"class" : "btn-group-vertical", "id" : "tooltipMenu"});
	$("body").click(function(){return tooltipMenu.style("visibility", "hidden");});

	//Tooltip that appears on mouseover to display name and size of the arc
	var tooltipInfo = d3.select("body")
		.append("div")
		.attr({"class" : "col-sm-2", "id" : "tooltipInfo"})
		.style("display", "none");

	//creates a partition layout
	var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

	//constructs a new arc generator
	var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

	//Builds or rebuilds (update) the sunburst
	function buildChart(root) {
		//console.log(root);

    // DATA JOIN - Join new data with old elements, if any.
    var gs = svg.selectAll("g").data(partition.nodes(root));

    // ENTER
    var g = gs.enter().append("g")
			.on("click", click)
			.on("mouseover", function(d){
					//console.log(d);
					//Set opacity (tricks!!)
					this.style = ["fill: ", this.style.fill, "; opacity: 0.8"].join("");

					//Update data about the arc into the allocated div
					$("#tooltipInfo").empty();
					var tooltipContent = document.createElement("span");
					var arcSize = normalizeSize(d.size);
					$(tooltipContent).html([d.name, " : ", arcSize.size.toFixed(2), " ", arcSize.unit].join(''));
					$("#tooltipInfo").append(tooltipContent);

					//Display the tooltip
					var tooltipArcInfo = $(this).tooltipster({
						functionBefore	: function(instance, helper) {

							//Parse to HTML the html representation of #tooltipInfo and set it as tooltip's content
							instance.content($.parseHTML($('#tooltipInfo').html()));
						},
						debug		: false
					});
					tooltipArcInfo.tooltipster('open');

			}).on("mouseout", function(){

					//Update opacity (tricks!!)
					this.style = ["fill: ", this.style.fill, "; opacity: 1"].join("");
			}).on("contextmenu", function(d){
					//console.log(d.name+" right click");

					//Display the menu; createMenu() is defined into script.js
					createMenu(d.fullPath, d.type, "#tooltipMenu");
					var topStyle = [(d3.event.pageY-10), "px"].join("");
					var leftStyle = [(d3.event.pageX+10), "px"].join("");
					return tooltipMenu.style("visibility", "visible")
						.style("top", topStyle)
						.style("left", leftStyle);

			});

		// UPDATE
		var path = g.append("path");

		gs.select('path')
		.style("fill", function(d) {

				//Color the root to white
				if (d.parent) {

					//Color the directory to gray
					if (d.type == "directory") {
						return extensionConfig.Directory.color;
					}

					// Check if the arc has an extension (i.e is a file)
					var crtArcSplit = d.name.split('.');
					if (crtArcSplit.length > 1 && crtArcSplit[crtArcSplit.length - 1].length > 0) {
						var crtExtension = crtArcSplit[crtArcSplit.length - 1];

						// Color the arc according to its type
						for (var fType in extensionConfig) {
							if (extensionConfig[fType].ext.join(' ').indexOf(crtExtension) != -1) {
								return extensionConfig[fType].color;
							}
						}
					}

					// File not classified or not having extensions
					return extensionConfig.Others.color;

		    	//return color((d.children ? d : d.parent).name);
				}
				else {
					return '#FFF';
				}
		})
		.each(function(d) {
		    this.x0 = d.x;
		    this.dx0 = d.dx;
		})
		.transition().duration(1000)
		.attr("d", arc);

		//Gets new data about the clicked arc (using the fullPath) and update the chart with the new data
		function click(d) {

			// If the clicked arc is a 'file', do nothing
			if (d.type == undefined) {
				return;
			}

			// Display waiting dialog box
			var waitingDialog = bootbox.dialog({
				message: '<p class="center-content"> Please wait while loading large data ... </p>',
				animate: false,
				closeButton: false
			});

			var source = new EventSource(["/scan/streamSunburst/", d.fullPath].join(""));
			var dataD3 = '';
			var newChart = [];
			//var currentParent = d["parent"];
			source.onmessage = function(event) {

				// Get each chunk until 'done'
				//if (event.data != 'done') {
					dataD3 = [dataD3, event.data].join('');
				//}
				//else {
					//console.log(dataD3);
					source.close();

					waitingDialog.modal('hide');
					dataD3 = JSON.parse(dataD3);

					//buildChart(dataD3);
					// Rebuild sunburst after prepending the parent if exist
					prependParent(dataD3, function(dataD3) {
						buildChart(dataD3);
					});
				//}
			};

			// Update breadcrumbs
			createBreadCrumbList("#breadcrumbsId", d.fullPath, os);
		}			//End click function

		// EXIT - Remove old elements as needed.
		gs.exit().transition().duration(1000).style("fill-opacity", 1e-6).remove();
	}

	// Interpolate the scales!
	function arcTween(d) {
		var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
				yd = d3.interpolate(y.domain(), [d.y, 1]),
				yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
		return function(d, i) {
			return i ? function(t) {
				return arc(d);
			} : function(t) {
				x.domain(xd(t));
				y.domain(yd(t)).range(yr(t));
				return arc(d);
			};
		};
	}

	// When all is ready, create sunburst after prepending the parent
	prependParent(getData, function(getData) {
		buildChart(getData);
	});
	//buildChart(getData);

	// Create breadcrumbs
	createBreadCrumbList("#breadcrumbsId", getData.fullPath, os);

}


/* Search and prepend the parent of a part of tree (if exist)
	* Without this workaround, the chart will not be rebuild when user click the root (chart's center)
	* streaming is asynchrounous so we have to use a callback method
*/
function prependParent(root, callback) {

	//First try to get the parent from views
	var parentStream = new EventSource(["/scan/getParent/", root.fullPath].join(""));
	var parentObject = {};
	parentStream.onmessage = function(event) {
		parentObject = JSON.parse(event.data);
		parentStream.close();

		// If a parent was found, update the root object
		if (parentObject.fullPath) {
			root = {
				"fullPath" 	: parentObject.fullPath,
				"name"			: parentObject.name,
				"size"			: parentObject.size,
				"children"	: [root],
				"type"			: 'directory'
				//"extStat"		: parentObject.extStat
			};
		}

		// else (if the root is an ancestor), return the unmodified root
		callback(root);
	};
}

/* Create breadcrumb content list dynamically.
	* specify id of the div container, fullPath of the sunburst's root and separator
	* 'os' parameter is used to decompose the fullPath "\\" for Windows and "/" for UNIX
*/
function createBreadCrumbList(IdContainer, givenFullPathRoot, os) {
	var separator = (os == 'Windows' ? '\\' : '/');
	var fullPathRoot = givenFullPathRoot;
	var rootFound = false;								// Used for workaround

	//Refresh the container
	$(IdContainer).empty();

	//Create the div to attach the breadcrumbs (mandatory dynamically created to avoid error)
	var div = document.createElement("div");
	$(div).attr("class", "rcrumbs");

	//Create the ul containing all list
	var ul = document.createElement("ul");

	//Create all 'li'
	for (var i=0; i < fullPathRoot.split(separator).length; i++) {

		// Workaround to avoid having '/ > /' in the breadcrumb
		if (rootFound) {
			rootFound = false;
			continue;
		}

		var li = document.createElement("li");

		//Create 'a' element  into each 'li' of the breadcrumbs and set action of them (on click and mouseover)
		var a = document.createElement("a");
		var aName = fullPathRoot.split(separator)[i];

		// Note: without this workaround, the 'root' ('/') path will be not displayed because considered as separator
		if (fullPathRoot.split(separator)[i].length == 0) {
			if (os != 'Windows') {
				$(a).html('/').attr('class', 'pointerOnHover');
				rootFound = true;
			}
		} else {
			$(a).html(fullPathRoot.split(separator)[i]).attr('class', 'pointerOnHover');
		}
		$(a).on("click", function() {
			//console.log($(this).html());
			//alert(fullPathRoot.split($(this).html())[0].length);

			// Display waiting message, displayWaitingMessage(msg) is defined into script.js
			//displayWaitingMessage('Please wait while scanning ...');

			//Create full path corresponding to the clicked "name"
			var clickedPath = "";
			if (fullPathRoot.split($(this).html())[0].length == 0) {	// User click on the partition letter
				clickedPath = [$(this).html(), separator].join('');
			} else {
				clickedPath = [fullPathRoot.split($(this).html())[0], separator, $(this).html()].join('');
			}

			// For WINDOWS, reformat the path
			if (os == 'Windows') {
				//console.log(clickedPath.replace("\\\\", "\\"));
				clickedPath = clickedPath.replace("\\\\", "\\");
			}
			//location.href = '/scan/partialScan/' + clickedPath;

			// First check if the given path was already scanned
			var checkStream = new EventSource(['/scan/checkScan/', clickedPath].join(''));
			checkStream.onmessage = function(event) {
				var resCheck = JSON.parse(event.data);
				checkStream.close();

				// If so, do not scan anymore (display chart only)
				if (resCheck == 'scanned') {
					location.href = ['/scan/displaySunburst/', clickedPath].join('');
				} else {	// Scan the given path

					// Stream scan status and display chart; defined into script.js
					partialScanDialogBox(clickedPath);
				}
			};

		});

		//Append the a element
		$(li).append(a);
		if (i != (fullPathRoot.split(separator).length -1) ) {
			var span = document.createElement("span");
			$(span).attr("class", "divider").html(" > ");
			$(li).append(span);
		}

		//Finaly append the li element to the ul
		$(ul).append(li);
	}

	$(div).append(ul);

	$(IdContainer).append(div);

	$(div).rcrumbs();
}
