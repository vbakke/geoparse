var norgeskart = (function () {
	var _self = {};

	var _tileSizePixels = 256; 
	var _zoomLevelMPerTile = [5545984, 2772992, 1386496, 693248, 346624, 173312, 86656, 43328, 21664, 10832, 5416, 2708, 1354, 677, 338.5, 169.25, 84.625, 42.3125, 21.15625, 10.578125, 5.2890625];

	// ======================================
	// Returns true is location is within the boundary of Norgeskart
	//
	// Uses location.utm 
	// 	
	_self.isInNorway = function (location) {
		if (location.utm.zone < 32)
			return false;
		if (location.utm.zone > 35)
			return false;
		if (location.utm.band < 'V')
			return false;
		if (location.utm.band > 'X')
			return false;
		return true;
	}

	_self.makeUrl = function (locationArray, viewport) {
		// Make UTM33 coordinates
		var utm33s = [];
		var minN, maxN, minE, maxE, cN, cE;
		var urlMarkers = "";
		for (var i=0; i<posArray.length; i++) {
			var pos = posArray[i];
			if (_self.isInNorway(pos)) {
				var utm33 = geoconverter.LatLonToUTM(pos.latlon, undefined, 33);

				if (minE == undefined || utm33.easting < minE)
					minE = utm33.easting;
				if (maxE == undefined || utm33.easting > maxE)
					maxE = utm33.easting;
				if (minN == undefined || utm33.northing < minN)
					minN = utm33.northing;
				if (maxN == undefined || utm33.northing > maxN)
					maxN = utm33.northing;
					
				urlMarkers += "/m/"+utm33.easting.toFixed(0)+"/"+utm33.northing.toFixed(0)+"/"+pos.label;
			}
		}
		
		var boundingbox = {w: maxE-minE, h: maxN-minN};
		cE = (minE + maxE)/2;
		cN = (minN + maxN)/2;	
		if (isNaN(cE)) {
			var pos = map.getCenter();
			// Swap lat and lon, for the order to be correct in the url
			cN = pos.lng();
			cE = pos.lat();
		}
		var zoomLevel;
		if (posArray.length <= 1)
			zoomLevel = 7;
		else
			zoomLevel = _self.findZoomLevel(locationArray, boundingbox, viewport);
		

		var urlCenter = "/#"+zoomLevel+"/"+cE+"/"+cN;
		var url = "http://norgeskart.no" + urlCenter + urlMarkers;

		return url;
	}
	
	_self.findZoomLevel = function (locationArray, bbox, viewport) {
		//var bbox = {w: 1000, h:1000};
		//var viewport = {w: 2000, h:1000};
		
		var noOfTilesX = (viewport.w) / _tileSizePixels;
		var noOfTilesY = (viewport.h) / _tileSizePixels;
		
		var meterPerTileX = bbox.w / noOfTilesX;
		var meterPerTileY = bbox.h / noOfTilesY;
		
		var meterPerTile = Math.max(meterPerTileX, meterPerTileY);
		
		var zoomLevel = 0;
		while (zoomLevel < _zoomLevelMPerTile.length) {
			// If zoomlevel is too small, return previous
			if (_zoomLevelMPerTile[zoomLevel] < meterPerTile)
				return zoomLevel-2;  // Zoom out one extra level, to ensure all markers are visible on map. (Let the end user adjust.)
			// Try next zoomlevel
			zoomLevel++;
		}
		return zoomLevel-2;
	}
	
	
	return _self;
}());



