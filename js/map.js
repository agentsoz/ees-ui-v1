function initMap() {
	var mapDiv = document.getElementById('map');
	global.map = new google.maps.Map(mapDiv, {
		center : {
			lat : -37.064558,
			lng : 144.218764
		},
		scaleControl: true,
		zoom : 6
	});
	google.maps.event.addListener(global.map, 'mousemove', function (event) {
        displayCoordinates(event.latLng);               
    });
	$('#map').mouseleave(function (event) {
		$('#mapcursor').text('');
	});
	initDestinationsMarkersOnMap();
}

function initDestinationsMarkersOnMap() {
	if (typeof global.map === 'undefined') {
		return;
	}
	var township = getTownship(global.scenario_creation_arg);
	for (var i = 0; i < township.destinations.length; i++) {
		var dest = township.destinations[i];
		dest.marker = drawMarker([dest.coordinates.lat, dest.coordinates.lng], dest.name, true, 1);
		
		//var pos = new google.maps.LatLng(dest.coordinates.lat, dest.coordinates.lng);
		//var marker = new google.maps.Marker({
		//	position: pos,
		//	map: null
		//});
		//dest.marker = marker;
	}
}

function showDestinationMarkerOnMap(township, destname) {
	if (typeof global.map === 'undefined') {
		return;
	}
	var dest = getDestination(township, destname);
	if (dest.marker != null) {
		dest.marker.setMap(global.map);
	}
}

function hideDestinationMarkerOnMap(township, destname) {
	if (typeof global.map === 'undefined') {
		return;
	}
	var dest = getDestination(township, destname);
	if (dest.marker != null) {
		dest.marker.setMap(null);
	}
}

function displayCoordinates(pnt) {
    var lat = pnt.lat().toFixed(4)
    var lng = pnt.lng().toFixed(4);
    $('#mapcursor').text('Lat: ' + lat + ', Lng:' + lng)
}

function panMapTo(latlon, zoom) {
	var latLng = new google.maps.LatLng(latlon[0], latlon[1]);
	if(typeof zoom !== 'undefined') {
		global.map.setZoom(zoom);
	}
	global.map.panTo(latLng);
}

function drawSimulationAreaOnMap(area) {
	var rectangle = new google.maps.Rectangle({
		strokeColor : '#FF0000',
		strokeOpacity : 0.5,
		strokeWeight : 2,
		fillColor : '#FF0000',
		fillOpacity : 0.03,
		zIndex : -1,
		clickable : false,
		map : global.map,
		bounds : {
			north : area[0],
			east : area[1],
			south : area[2],
			west : area[3]
		}
	});
}

function drawMarker(latlon, title, hide = false, color = 0) {
	var icon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
	if (color === 1) {
		icon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
	}
	var pos = new google.maps.LatLng(latlon[0], latlon[1]);
	var marker = new google.maps.Marker({
		position : pos,
		icon: icon,
		title : title
	});

	// To add the marker to the map, call setMap();
	if (!hide) { 
		marker.setMap(global.map);
	}
	return marker;
}

function drawFire() {
	if (typeof global.map === 'undefined') {
		return;
	}

	global.map.data.forEach(function(feature) {
		// If you want, check here for some constraints.
		global.map.data.remove(feature);
	});
	if (global.scenario_fire && $('#show-fire').is(":checked")) {
		// Now load the specified shape
		global.map.data.loadGeoJson(global.scenario_fire.url);
		global.map.data.setStyle({
			fillColor : 'red',
			strokeWeight : 1,
			strokeColor : 'red'
		});
	}
}

function drawSafeLine(township, dest, callback) {
	if (typeof google === 'undefined') {
		return;
	}
	var firstClick = true;
	global.map.setOptions({
		draggableCursor : 'crosshair'
	});
	global.hClick = google.maps.event.addListener(global.map, 'click',
			function(e) {
				if (firstClick) {
					firstClick = false;
					global.poly = new google.maps.Polyline({
						map : global.map,
						clickable : false,
						zindex : 1,
						path : [],
						strokeColor : defaults.safeLineStrokeColor,
						strokeOpacity : 0.8,
						strokeWeight : defaults.safeLineStrokeWeight
					});
					global.poly.getPath().setAt(0, e.latLng);
					global.map.setOptions({
						draggableCursor : 'crosshair'
					});

					global.hMove = google.maps.event.addListener(global.map,
							'mousemove', function(mouseMoveEvent) {
								global.poly.getPath().setAt(1,
										mouseMoveEvent.latLng);
							});
				} else {
					township.safeLines.push({
						'name' : dest,
						'line' : global.poly,
						'zoom' : global.map.getZoom()
					});
					cancelDraw();
					callback();
				}
			});
}

function cancelDraw(removeActivePoly) {
	if (typeof google === 'undefined') {
		return;
	}
	google.maps.event.removeListener(global.hMove);
	google.maps.event.removeListener(global.hClick);
	global.map.setOptions({
		draggableCursor : ''
	});
	if (removeActivePoly && global.poly) {
		global.poly.setMap(null);
	}
	global.poly = null;
}

function removeSafeLine(poly) {
	if (poly) {
		poly.setMap(null);
	}
}

function drawVehiclesArea(township, name, callback) {
	if (typeof google === 'undefined') {
		return;
	}
	var firstClick = true;
	global.map.setOptions({
		draggableCursor : 'crosshair'
	});
	global.hClick = google.maps.event.addListener(global.map, 'click',
			function(e) {
				if (firstClick) {
					firstClick = false;
					global.poly = new google.maps.Rectangle({
						strokeColor : 'darkorchid',
						strokeOpacity : 0.9,
						strokeWeight : 2,
						fillColor : 'darkorchid',
						fillOpacity : 0.05,
						zIndex : -1,
						clickable : false,
						map : global.map
					});

					var bounds = new google.maps.LatLngBounds();
					bounds.extend(e.latLng);
					global.poly.setBounds(bounds);

					global.map.setOptions({
						draggableCursor : 'crosshair'
					});
					// Anchor the point that was clicked
					var anchor = e.latLng;
					global.hMove = google.maps.event.addListener(global.map,
							'mousemove', function(mouseMoveEvent) {
								// Get the current bounds of the rectangle
								var b = global.poly.getBounds();
								var ne = b.getNorthEast();
								var sw = b.getSouthWest();
								// Get the lat/lon of the mouse
								var p = mouseMoveEvent.latLng;
								// Now the calculations are slightly different
								// depending on which quadrant we are in
								// with respect to the anchor
								var newNE = ne;
								var newSW = sw;
								// If we are in the SW wrt the anchor
								if (p.lat() < anchor.lat() && p.lng() < anchor.lng()) {
									newNE = anchor;
									newSW = p;
								}
								// else if we are in the NE wrt the anchor
								else if (p.lat() > anchor.lat()
										&& p.lng() > anchor.lng()) {
									newNE = p;
									newSW = anchor;
								}
								// else if we are in the NW wrt the anchor
								else if (p.lat() > anchor.lat()
										&& p.lng() < anchor.lng()) {
									newNE = new google.maps.LatLng(p.lat(),
											anchor.lng());
									newSW = new google.maps.LatLng(anchor.lat(),
											p.lng());
								}
								// else if we are in the SE wrt the anchor
								else if (p.lat() < anchor.lat()
										&& p.lng() > anchor.lng()) {
									newNE = new google.maps.LatLng(anchor.lat(),
											p.lng());
									newSW = new google.maps.LatLng(p.lat(),
											anchor.lng());
								}
								// Now reassign the new bounds
								var bounds = new google.maps.LatLngBounds();
								bounds.extend(newNE);
								bounds.extend(newSW);
								global.poly.setBounds(bounds);

							});
				} else {
					township.vehiclesAreas.push({
						'name' : name,
						'area' : global.poly,
						'zoom' : global.map.getZoom()
					});
					
					// Calculate the area
					var bounds = global.poly.getBounds();
					var ne = bounds.getNorthEast();
					var sw = bounds.getSouthWest();
					var vertices = [];
					vertices.push(ne);
					vertices.push(new google.maps.LatLng(ne.lat(),sw.lng()));
					vertices.push(sw);
					vertices.push(new google.maps.LatLng(sw.lat(),ne.lng()));
					var area = google.maps.geometry.spherical.computeArea(vertices);
					// Cancel the draw
					cancelDraw();
					// Call back
					callback(area);
				}
			});
}
