var geoparse = (function () {


	//
	//  [NSEW] deg [NSEW] deg [NSEW]
	//

	var _NORTH = "N";
	var _SOUTH = "S";
	var _EAST  = "E";
	var _WEST = "W";
	
	var _dirChars = _NORTH+_SOUTH+_EAST+_WEST;
	var _digitChars = "0-9";
	var _numChars = "0-9,.";
	var _degreesChars = "0-9.,°°ºo^~\*'\" -";
	var _delimChars = ",|\\/ ";
	var _zoneBandChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	var _latLonRe = RegExp("\s*(["+_dirChars+"]?)\s*(["+_degreesChars+"]+)\s*(["+_dirChars+"]?)["+_delimChars+"]*(["+_dirChars+"]?)(["+_degreesChars+"]+)\s*(["+_dirChars+"]?)");
	var _utmRe = RegExp("\s*(["+_digitChars+"]{1,2}) *(["+_zoneBandChars+"]) *(["+_dirChars+"]?) *(["+_numChars+"]+)m? *(["+_dirChars+"]?)[, ]*(["+_dirChars+"]?) *(["+_numChars+"]+) *m? *(["+_dirChars+"]?)");

	var _self = {};
	
	// =====================================================
	// Parse string containing latitude and longitude
	//
	_self.parseLatLon = function (str) {
		str = str.toUpperCase() + " ";
		var parts = _latLonRe.exec(str);

		// If no match, return undefined
		if (parts == null) {
			return undefined;
		} 

		var dir1 = parts[1];
		var deg1 = parts[2];
		var dir1b = parts[3];
		var dir2 = parts[4];
		var deg2 = parts[5];
		var dir2b = parts[6];

		_self.dbg("<br/>"+str);
		// If directions are placed _after_ degrees, move them
		dir1 = (dir1 == "") ? dir1b : dir1;
		dir2 = (dir2 == "") ? dir2b : dir2;

		// If longitude is placed before latitude, swap them
		if (dir1 == _EAST || dir1 == _WEST || dir2 == _NORTH || dir2 == _SOUTH) {
			var tempDir=dir1, dir1=dir2, dir2=tempDir;
			var tempDeg=deg1, deg1=deg2, deg2=tempDeg;
			_self.dbg("swapping");
		}
		
		// Parse the degrees string
		var latitude = _self.parseDeg(deg1);
		var longititude = _self.parseDeg(deg2);
		
		
		// Adujst for negative signs
		if (dir1 == _SOUTH) {
			latitude = -latitude;
		}
		if (dir2 == _WEST) {
			longititude = -longititude;
		}
		
		var geo = new geoLatLon(latitude, longititude);
		return geo;
	}

	
	// =====================================================
	// Parse string containing UTM coordinates
	//
	_self.parseUtm = function (str) {
		var parts = _utmRe.exec(str.toUpperCase());
		_self.dbg("<br/><b>"+str+"</b>");
		_self.dbg(parts);

		// If no match, return undefined
		if (parts == null) {
			return undefined;
		} 
		
		var zone  = parts[1];
		var band  = parts[2];
		var dir1 = parts[3];
		var pos1  = parts[4];
		var dir1b = parts[5];
		var dir2 = parts[6];
		var pos2  = parts[7];
		var dir2b = parts[8];
	
		_self.dbg("-" + zone + "-" + band + "-" + dir1 + "-" + pos1 + "-" + dir1b  + "-" + dir2 + "-" + pos2 + "-" + dir2b + "-");
		// If directions are placed _after_ position, move them forwards
		dir1 = (dir1 == "") ? dir1b : dir1;
		dir2 = (dir2 == "") ? dir2b : dir2;

		// If northing is placed before easting, swap them
		if (dir1 == _NORTH || dir2 == _EAST) {
			var tempDir=dir1, dir1=dir2, dir2=tempDir;
			var tempPos=pos1, pos1=pos2, pos2=tempPos;
			_self.dbg("swapping");
		}
		
		// Parse the degrees string
		var easting = _self.parseNum(pos1);
		var northing = _self.parseNum(pos2);
		
		
		// Adujst for negative signs
		if (dir1 == _SOUTH) {
			northing = -northing;
		}
		if (dir2 == _WEST) {
			easting = -easting;
		}
		
		var utm = new geoUtm(zone, band, easting, northing);
		return utm;
	}

	// =====================================================
	// Parse string containing degrees, minutes and seconds
	//
	_self.parseDeg = function (str) {
		_self.dbg("<b>"+str+"</b>");
		if (!str) {
			return 0.0;
		}
		
		var deg = 0.0;
		var start = 0;
		var end = 0;
		var sign = +1;

		// Sign
		start = _self.findSign(str, start);
		if (start>-1) {
			if (str[start] == "-") {
				sign = -1;
				start++;
			} else if (str[start] == "+") {
				start++;
			}
		}
		_self.dbg("Sign: "+sign);
		
		// Degrees
		start = _self.findNum(str, start);
		end = _self.findDelim(str, start+1);
		if (start>-1 && end>-1) {
			var numStr = str.substring(start, end).replace(",",".");
			var num = _self.parseNum(numStr);
			deg += num;
			_self.dbg("Parsing Degrees: -"+numStr+"- gives "+num+": "+deg);
		}
		if (start == -1 || end == -1)	{
			_self.dbg("-end-");
			return deg;
		}
		
		// Minutes
		start = _self.findNum(str, end+1);
		end = _self.findDelim(str, start+1);
		if (start>-1 && end>-1) {
			var numStr = str.substring(start, end).replace(",",".");
			var num = _self.parseNum(numStr);
			deg += num/60.0;
			_self.dbg("Parsing Minutes: -"+numStr+"- gives "+num+": "+deg);
		}
		if (start == -1 || end == -1)	{
			_self.dbg("-end-");
			return deg;
		}
		
		// Seconds
		start = _self.findNum(str, end+1);
		end = _self.findDelim(str, start+1);
		if (start>-1 && end>-1) {
			var numStr = str.substring(start, end);
			var num = _self.parseNum(numStr);
			deg += num/3600.0;
			_self.dbg("Parsing Seconds: -"+numStr+"- gives "+num+": "+deg);
		}


		return deg;
	}

	
	
	// =====================================================
	// Parse string containing a number
	//
	// ToDo: Parsing number with decimal points are not yet supported.
	//
	_self.parseNum = function (str) {
		str = str.replace(",", ".");
		var num = parseFloat(str);
		return num;
	}
	
	
	// =====================================
	// Find starting position of a number, 
	// including a leading sign (+ or -)
	_self.findSign = function (str, start) {
		var index = start;
		var c;
		while (index < str.length) {
			c = str[index];
			if (c == "-" || c == "+" || c == "," || c == "." || (c >= "0" && c <= "9")) {
				return index;
			}
			index++;
		}
		return -1;
	}
	
	// =====================================
	// Find starting position of a number.
	// No leading sign (+ or -) is allowed
	_self.findNum = function (str, start) {
		var index = start;
		var c;
		while (index < str.length) {
			c = str[index];
			if (c == "," || c == "." || (c >= "0" && c <= "9")) {
				return index;
			}
			index++;
		}
		return -1;
	}
	
	// ======================================
	// Find a delimiter between two numbers.
	// Any character not part of the number is considered a delimiter
	_self.findDelim = function (str, start) {
		var index = start;
		var c;
		while (index < str.length) {
			c = str[index];
			//if (" º'\"".indexOf(c) >- 1)
			if (c == "," || c == "." || (c >= "0" && c <= "9")) {
				index++;
			} else {
				return index;
			}
		}
		return -1;
	}
	
	
	
	// ==============
	// Debug methods
	var _dbgDiv = "";
	_self.setDebugDiv = function (dbgDiv) {
		_self.dbgDiv = dbgDiv;
	}	
	_self.dbg = function (str) {
		if (_self.dbgDiv) {
			var dbgDiv = document.getElementById("dbgDiv");
			if (dbgDiv) {
				dbgDiv.innerHTML += "<br/>" + str + "\n";
			}
		}
	}
	
	return _self;
}());