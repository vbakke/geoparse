function geoLatLon(lat, lon) {
	this.lat = lat;
	this.lon = lon;
	
	/** 
	 * d
	 * dm
	 * dms
	 * N    NSEW directions
	 */
	this.toString = function (format, delim, useNegatives, showEastBeforeNorth) {	
		// ====================================
		// Define default values for parameters
		format = (typeof format === "undefined") ? "N d° m' s\"" : format;
		delim = (typeof delim === "undefined") ? " " : delim;
		useNegatives = (typeof useNegatives === "undefined") ? false : useNegatives;
		showEastBeforeNorth = (typeof showEastBeforeNorth === "undefined") ? false : showEastBeforeNorth;
		
		var strN = "";
		var strE = "";
		
		var pos = 0;
		var prev = 0;
		
		// ===============================================================
		// Split lat and lon into degrees and possibly minutes and seconds
		// TODO: Duplication of code for lat and lon. Abstract into subfunction.
		var minDefined = (format.indexOf("m") == -1) ? false : true;
		var secDefined = (format.indexOf("s") == -1) ? false : true;
		var degLat, degLon, minLon, minLat, secLon, secLat;
		
		var remainingLat = Math.abs(this.lat);
		var remainingLon = Math.abs(this.lon);
		
		if (!minDefined) {
			// No minutes, use decimal degrees
			degLat = remainingLat.toFixed(6);  // Maximum error of 11 cm
			degLon = remainingLon.toFixed(6);  
		} else {
			// Minutes are defined
			degLat = Math.floor(remainingLat);
			degLon = Math.floor(remainingLon);
			remainingLat = (remainingLat - degLat)*60.0;
			remainingLon = (remainingLon - degLon)*60.0;
			
			if (!secDefined) {
				// No seconds, use decimal minutes
				minLat = remainingLat.toFixed(4); // Maximum error of 19 cm
				minLon = remainingLon.toFixed(4);
			} else {
				// Seconds are defined
				minLat = Math.floor(remainingLat);
				minLon = Math.floor(remainingLon);
				secLat = ((remainingLat - minLat)*60.0).toFixed(2); // Maximum error of 31 cm
				secLon = ((remainingLon - minLon)*60.0).toFixed(2);
			}
		}
			
		
		
		// ======================
		// Build formatted string
		var c;
		while (pos<format.length) {
			c = format[pos];
			if ("Ndms".indexOf(c) == -1) {
				// No special meaning of character. Keep moving before copying to str
				pos++;
			} else {
				// Special character. Copy previous character into str
				if (pos != prev) {
					strN += format.substring(prev, pos);
					strE += format.substring(prev, pos);
					prev = pos;
				}
				
				// Handle the meaning of the character
				pos++; 
				if (c == "N") {					
					strN += (this.lat<0 && !useNegatives) ? "S" : "N";
					strE += (this.lon<0 && !useNegatives) ? "W" : "E";
					prev = pos;
				} else if (c == "d") {				
					if (useNegatives && this.lat < 0)
						strN += "-";
					if (useNegatives && this.lon < 0)
						strE += "-";
					strN += degLat;
					strE += degLon;
					prev = pos;
				} else if (c == "m") {				
					strN += minLat;
					strE += minLon;
					prev = pos;
				} else if (c == "s") {				
					strN += secLat;
					strE += secLon;
					prev = pos;
				}
			}
		}
		if (pos != prev) {
		
			if (pos == -1)
				pos = format.length;
			strN += format.substring(prev, pos);
			strE += format.substring(prev, pos);
		}

		// ================
		// Join coordinates
		var str;
		if (showEastBeforeNorth) {
			str = strE + delim + strN;
		} else {
			str = strN + delim + strE;
		}
		
		return str;
	};
}

function geoUtm() {
	this.zone = -1;
	this.band = "";  // Strict UTM uses only N and S for band. However, the defacto standard is using MGRS band A-Z.
	this.easting = "";
	this.northing = "";
	
	this.toString = function (showEastBeforeNorth, delim) {	
		showEastBeforeNorth = (typeof showEastBeforeNorth === "undefined") ? false : showEastBeforeNorth;
		delim = (typeof delim === "undefined") ? " " : delim;

		var str = this.zone + this.band;
		var strE = this.easting.toFixed(0);
		var strN = this.northing.toFixed(0);
		
		if (showEastBeforeNorth) {
			str += " " + strE + delim + strN;
		} else {
			str += " " + strN + delim + strE;
		}
		
		return str;
	};
}