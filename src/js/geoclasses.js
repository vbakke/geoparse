function geoLatLon(lat, lon) {
	this.lat = parseFloat(lat);
	this.lon = parseFloat(lon);

	/** 
	 * d
	 * dm
	 * dms
	 * N    NSEW directions
	 */
	this.toString = function (format, delim, useNegatives, showNorthBeforeEast) {
		// ====================================
		// Define default values for parameters
		format = (typeof format === "undefined") ? "d° m' s\" N" : format;
		delim = (typeof delim === "undefined") ? " " : delim;
		useNegatives = (typeof useNegatives === "undefined") ? false : useNegatives;
		showNorthBeforeEast = (typeof showNorthBeforeEast === "undefined") ? true : showNorthBeforeEast;

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
			degLat = remainingLat.toFixed(5);  // Maximum error of 1,1 m
			degLon = remainingLon.toFixed(5);
		} else {
			// Minutes are defined
			degLat = Math.floor(remainingLat);
			degLon = Math.floor(remainingLon);
			remainingLat = (remainingLat - degLat) * 60.0;
			remainingLon = (remainingLon - degLon) * 60.0;

			if (!secDefined) {
				// No seconds, use decimal minutes
				minLat = remainingLat.toFixed(3); // Maximum error of 1.9 m
				minLon = remainingLon.toFixed(3);
			} else {
				// Seconds are defined
				minLat = Math.floor(remainingLat);
				minLon = Math.floor(remainingLon);
				secLat = ((remainingLat - minLat) * 60.0).toFixed(1); // Maximum error of 3,1 m
				secLon = ((remainingLon - minLon) * 60.0).toFixed(1);
			}
		}

		// Modify rounding out of bounds
		if (secLat >= 60) {
			secLat -= 60;
			minLat += 1;
		}
		if (minLat >= 60) {
			minLat -= 60;
			degLat += 1;
		}
		if (secLon >= 60) {
			secLon -= 60;
			minLon += 1;
		}
		if (minLon >= 60) {
			minLon -= 60;
			degLon += 1;
		}


		// ======================
		// Build formatted string
		var c;
		while (pos < format.length) {
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
					strN += (this.lat < 0 && !useNegatives) ? "S" : "N";
					strE += (this.lon < 0 && !useNegatives) ? "W" : "E";
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
		if (showNorthBeforeEast) {
			str = strN + delim + strE;
		} else {
			str = strE + delim + strN;
		}

		return str;
	};
}

// Strict UTM doesn't use MGRS band A-Z. 
// However, the defacto standard is using band, and it easier to calculate the band while still having access to the lat lon values in the conversion.
// If the band is unknown, set band to "+" or "-" to indicate Northern or Souther hemisphere, respectively.
function geoUtm(zone, band, easting, northing) {
	this.zone = zone;
	this.band = band;
	this.easting = easting;
	this.northing = northing;

	this.toString = function (useStrictUtm, showEastBeforeNorth, delim, htmlKmStyle) {
		useStrictUtm = (typeof useStrictUtm === "undefined") ? false : useStrictUtm;
		showEastBeforeNorth = (typeof showEastBeforeNorth === "undefined") ? true : showEastBeforeNorth;
		delim = (typeof delim === "undefined") ? " " : delim;

		var str = this.zone + (useStrictUtm ? this.getHemisphere() : this.band);

		var strE = this.easting.toFixed(0);
		var strN = this.northing.toFixed(0);
		if (htmlKmStyle) {
			strE = this._addKmHtmlStyle(strE, htmlKmStyle);
			strN = this._addKmHtmlStyle(strN, htmlKmStyle);
		}

		if (showEastBeforeNorth) {
			str += " " + strE + "E" + delim + strN + "N";
		} else {
			str += " " + strN + "N" + delim + strE + "E";
		}

		return str;
	};

	this._addKmHtmlStyle = function (str, styleClass) {
		var pre, km, post;
		pre = str.slice(0, -5);
		km = str.slice(-5, -3);
		post = str.slice(-3);
		var html = pre + '<span class="' + styleClass + '">' + km + '</span>' + post;
		return html;
	};

	this.getGridZone = function () {
		return this.zone + this.band;
	};

	this.getHemisphere = function () {
		if (this.band == "+")
			return "N";
		if (this.band == "-")
			return "S";

		if (this.band >= "N")
			return "N";
		else
			return "S";
	};
}