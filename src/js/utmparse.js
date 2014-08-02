var utmparse = (function () {


	//
	//  [NSEW] deg [NSEW] deg [NSEW]
	//

	var _NORTH = "N";
	var _SOUTH = "S";
	var _EAST  = "E";
	var _WEST = "W";
	
	var _dirChars = _NORTH+_EAST+_SOUTH+_WEST;
	var _numChars = "0-9,.";
	var _digitChars = "0-9";
	var _zoneBandChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	var _utmRe = RegExp("\s*(["+_digitChars+"]{1,2}) *(["+_zoneBandChars+"]) *(["+_dirChars+"]?) *(["+_numChars+"]+)m? *(["+_dirChars+"]?)[, ]*(["+_dirChars+"]?) *(["+_numChars+"]+) *m? *(["+_dirChars+"]?)");
//	var _utmRe = RegExp("\s*(["+_digitChars+"]{1,2})\s*(["+_zoneBandChars+"])(\s{0,})(.)(5)(.)");
	//var _utmRe = RegExp("\s*(["+_digitChars+"]{1,2})\s*(["+_zoneBandChars+"])\s*(["+_dirChars+"]?)\s*");

	var _self = {};
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
		if (dir1 == "") {
			dir1 = dir1b;
		}
		if (dir2 == "") {
			dir2 = dir2b;
		}
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
		
		var utm = [zone, band, easting, northing]
		_self.dbg(zone + band + " " + easting + "E " + northing + "N");
		return utm;
	}

	// =====================================================
	// Parse string containing degrees, minutes and seconds
	//

	
	
	_self.parseNum = function (str) {
		if (str) {
			str = str.replace(",", ".");
			var num = parseFloat(str);
		}
		return num;
	}
	
	
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