var geoparse = (function () {


	//
	//  [NSEW] deg [NSEW] deg [NSEW]
	//

	var _NORTH = "N";
	var _SOUTH = "S";
	var _EAST  = "E";
	var _WEST = "W";
	
	var _dirChars = _NORTH+_SOUTH+_EAST+_WEST;
	var _degChars = "0-9.,\"'º -";
	var _geoRe = RegExp("\s*(["+_dirChars+"]?)\s*(["+_degChars+"]+)[,\s]*(["+_dirChars+"]?)[,\s]*(["+_degChars+"]+)\s*(["+_dirChars+"]?)");

	var _self = {};
	_self.parseGeo = function (str) {
		var parts = _geoRe.exec(str);

		if (parts != null) {
			var dir1 = parts[1];
			var deg1 = parts[2];
			var dir2 = parts[3];
			var deg2 = parts[4];
			var dir3 = parts[5];
		}
		_self.dbg("<br/>"+str);
		// If directions are placed _after_ degrees, move them
		if (dir1 == "") {
			dir1 = dir2;
			dir2 = dir3;
		}
		// If longitude is placed before latitude, swap them
		if (dir1 == _EAST || dir1 == _WEST) {
			var tempDir=dir1, dir1=dir2, dir2=tempDir;
			var tempDeg=deg1, deg1=deg2, deg2=tempDeg;
			_self.dbg("swapping");
		}
		
		// Parse the degrees string
		latitude = _self.parseDeg(deg1);
		longititude = _self.parseDeg(deg2);
		
		
		// Adujst for negative signs
		if (dir1 == _SOUTH) {
			latitude = -latitude;
		}
		if (dir2 == _WEST) {
			longititude = -longititude;
		}
		
		var geo = [latitude, longititude]
		return geo;
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

	
	
	_self.parseNum = function (str) {
		str = str.replace(",", ".");
		var num = parseFloat(str);
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