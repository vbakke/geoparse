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
		return _self.isUtmInNorway(location.utm);
	};
	_self.isUtmInNorway = function (utm) {
		if (utm.zone < 32)
			return false;
		if (utm.zone > 35)
			return false;
		if (utm.band < 'V')
			return false;
		if (utm.band > 'X')
			return false;
		return true;
	};

	_self.makeUrl = function (locationArray, viewport, includeLabels) {
		// Make UTM33 coordinates
		var utm33s = [];
		var minN, maxN, minE, maxE, c1, c2, zoomlevel;
		var urlMarkers = "";
		for (var i=0; i<posArray.length; i++) {
			var location = posArray[i];
			if (_self.isInNorway(location)) {
				var utm33 = geoconverter.LatLonToUTM(location.latlon, undefined, 33);
				utm33s.push(utm33);

				if (minE == undefined || utm33.easting < minE)
					minE = utm33.easting;
				if (maxE == undefined || utm33.easting > maxE)
					maxE = utm33.easting;
				if (minN == undefined || utm33.northing < minN)
					minN = utm33.northing;
				if (maxN == undefined || utm33.northing > maxN)
					maxN = utm33.northing;
				var label = "";
				if (includeLabels)
					label = location.label;
				urlMarkers += "/m/"+utm33.easting.toFixed(0)+"/"+utm33.northing.toFixed(0)+"/"+label;
			}
		}
		
		var urlCenter = "";
		if (urlMarkers=="") {
			var pos = map.getCenter();
			var utm = geoconverter.LatLonToUTM(new geoLatLon(pos.lat(), pos.lng()));
			if (_self.isUtmInNorway(utm)) {
				c1 = pos.lng();
				c2 = pos.lat();
			} 
		} else {
			var boundingbox = {w: maxE-minE, h: maxN-minN};
			c1 = (minE + maxE)/2;
			c2 = (minN + maxN)/2;	
		}

		if (c1 != undefined) {
			if (utm33s.length <= 1)
				zoomLevel = 13; // fartherest zoomlevel with detailed iso curves
			else
				zoomLevel = _self.findZoomLevel(locationArray, boundingbox, viewport);
			

			var urlCenter = "/#"+zoomLevel+"/"+c1+"/"+c2;
		}
		var url = "http://norgeskart.no" + urlCenter + urlMarkers;

		return url;
	};
	
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
	};
	
	
	return _self;
}());



