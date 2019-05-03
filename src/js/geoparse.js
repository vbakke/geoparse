var geoparse = (function () {


	//
	//  [NSEW] deg [NSEW] deg [NSEW]
	//

	var _NORTH = "N";
	var _SOUTH = "S";
	var _EAST = "E";
	var _WEST = "W";

	var _dirChars = _NORTH + _SOUTH + _EAST + _WEST;
	var _digitChars = "0-9";
	var _numChars = "0-9,.";
	var _degreesChars = "0-9.,°°ºo^~\*'\"-";
	var _delimChars = ",|\\/ ";
	var _zoneBandChars = "A-HJ-NP-Z+-";
	var _latLonStr = "\s*([" + _dirChars + "]?)\s*([" + _degreesChars + "]+)\s*([" + _dirChars + "]?)[" + _delimChars + "]+([" + _dirChars + "]?)([" + _degreesChars + "]+)\s*([" + _dirChars + "]?)";
	var _latLonRe = RegExp(_latLonStr);
	var _utmRe = RegExp("\s*([" + _digitChars + "]{1,2})? *([" + _zoneBandChars + "])?? *([" + _dirChars + "]?) *([" + _numChars + "]+) *([" + _dirChars + "]?)[" + _delimChars + "]*([" + _dirChars + "]?) *([" + _numChars + "]+) *([" + _dirChars + "]?)");
	var _self = {};

	_self.makeHint = function (pos, hintSource) {
		var hint = {};
		hint.source = hintSource;
		if (pos.latlon && pos.utm) {
			hint.utm = pos.utm;
			hint.latlon = pos.latlon;
		}
		else if (pos.lat && pos.lon) {
			hint.utm = geoconverter.LatLonToUTM(pos);
			hint.latlon = geoconverter.UTMToLatLon(hint.utm);
		} else if (pos.easting && pos.northing) {
			hint.latlon = geoconverter.UTMToLatLon(pos);
			hint.utm = geoconverter.LatLonToUTM(hint.latlon);
		} else {
			throw new Error('Unknown hint position');
		}
		return hint;
	};

	_self.parse = function (str, hintLocation, hintFormat) {
		// Try parsing (tokenizing)
		str = str.replace(/[Øø]/, 'E').replace(/[Vv]/, 'W');
		var utm = _self.parseUtm(str);
		var latlon = _self.parseLatLon(str);

		// Evaluate
		var attempts = { pos: { "utm": utm, "latlon": latlon } };
		var attempts = _self.findBestMatch(attempts);


		// Need more info
		attempts.needMoreInfo = (attempts.eval[attempts.bestMatch] < 100);
		if (attempts.needMoreInfo && hintLocation) {
			attempts = _self.addHintLocation(attempts, hintLocation);
		}

		// Return:
		//    - tokenized position
		//    - missing info (need location)
		return attempts;
	};

	_self.findBestMatch = function (attempts) {
		attempts.eval = { utm: 0, latlon: 0 };
		if (attempts.pos.utm) {
			attempts.eval.utm = _self.evalUtm(attempts.pos.utm);
		}
		if (attempts.pos.latlon) {
			attempts.eval.latlon = _self.evalLatLon(attempts.pos.latlon);
		}

		attempts.bestMatch = undefined;
		if (attempts.eval.utm > attempts.eval.latlon) {
			if (attempts.eval.utm > 50)
				attempts.bestMatch = 'utm';
		} else {
			if (attempts.eval.latlon > 50)
				attempts.bestMatch = 'latlon';
		}

		return attempts;
	};

	_self.addHintLocation = function (attempts, hint) {
		if (attempts.bestMatch == "utm") {
			var utm = _self.addUtmHintLocation(attempts.pos.utm, hint);
			attempts.pos.utm = utm;
		} else if (attempts.bestMatch == "latlon") {
			var latlon = _self.addLatLonHintLocation(attempts.pos.latlon, hint);
			attempts.pos.latlon = latlon;
		}
		return attempts;
	};

	_self.addUtmHintLocation = function (utm, hintLocation) {
		// Adding Zone and/or band, if missing
		var feedback = '';
		if (!utm.zone) {
			utm.zone = hintLocation.utm.zone;
			feedback += 'zone ' + utm.zone;
		}

		if (!utm.band) {
			utm.band = hintLocation.utm.band;

			if (feedback)
				feedback += utm.band;
			else
				feedback +=
					feedback += 'zoneband ' + utm.band;
		}
		if (feedback) {
			feedback = 'Added ' + feedback;
			if (hintLocation.source)
				feedback = feedback + ' from ' + hintLocation.source;
			_self.addFeedback(utm, feedback);
		}


		// Swap NS and EW if that is "closer to home"
		var scoreUnmodified = Math.abs(utm.easting - hintLocation.utm.easting) + Math.abs(utm.northing - hintLocation.utm.northing);
		var scoreReversed = Math.abs(utm.easting - hintLocation.utm.northing) + Math.abs(utm.northing - hintLocation.utm.easting);
		if (scoreReversed * 10 < scoreUnmodified) {
			var tempPos = utm.easting; utm.easting = utm.northing; utm.northing = tempPos;
			_self.addFeedback(utm, 'DBG: I SWAPPED. It it a lot closer to home');

		}

		return utm;
	};

	_self.addFeedback = function (obj, feedback) {
		if (!obj.feedback)
			obj.feedback = [];
		obj.feedback.push(feedback);
	};

	_self.addLatLonHintLocation = function (latlon, hintLocation) {
		hintLocation = hintLocation.latlon;
		//if (latlon.isWithoutNSEW) {}
		var diff = Math.abs(latlon.lat - hintLocation.lat) + Math.abs(latlon.lon - hintLocation.lon);
		var diffReverse = Math.abs(latlon.lat - hintLocation.lon) + Math.abs(latlon.lon - hintLocation.lat);
		if (diffReverse < diff * 2) {
			// swap lat and lon
			var tempDeg = latlon.lat; latlon.lat = latlon.lon; latlon.lon = tempDeg;
			_self.addFeedback('')
		}
		return latlon;
	};

	_self.evalUtm = function (utm) {
		// ToDo: Must evalute NSEW
		var val = 0;


		if (utm.zone) {
			val += 10;
		}
		if (utm.easting) {
			if (Math.abs(utm.easting) < 180)
				val += -5;
			else
				if (utm.easting > 100000)
					val += 25;
			if (utm.easting < 999999)
				val += 25;
		}
		if (utm.northing) {
			// ToDo: If Northing matches zoneband

			if (Math.abs(utm.northing) < 180)
				val += -5;
			else
				if (Math.abs(utm.northing) < 9999999)
					val += 40;
				else
					val += 10;
		}

		return val;
	};

	_self.evalLatLon = function (latlon) {
		// ToDo: Must evalute NSEW
		var val = 0;


		if (latlon.lat) {
			if (Math.abs(latlon.lat) > 90)
				val += -5;
			else
				val += 50;
		}

		if (latlon.lon) {
			if (Math.abs(latlon.lon) > 180)
				val += -5;
			else
				val += 50;
		}

		return val;
	};


	// =====================================================
	// Parse array of tokens 
	//
	_self.parseTokens = function (tokens, options, hintLocation) {
		// Try parsing (tokenizing)
		var utm = _self.parseTokensUtm(tokens, options);
		var latlon = _self.parseTokensLatLon(tokens, options);
	};

	_self.makeHint = function (pos, hintSource) {
		var hint = {};
		hint.source = hintSource;
		if (pos.latlon && pos.utm) {
			hint.utm = pos.utm;
			hint.latlon = pos.latlon;
		}
		else if (pos.lat && pos.lon) {
			hint.utm = geoconverter.LatLonToUTM(pos);
			hint.latlon = geoconverter.UTMToLatLon(hint.utm);
		} else if (pos.easting && pos.northing) {
			hint.latlon = geoconverter.UTMToLatLon(pos);
			hint.utm = geoconverter.LatLonToUTM(hint.latlon);
		} else {
			throw new Error('Unknown hint position');
		}
		return hint;
	};

	_self.parse = function (str, hintLocation, hintFormat) {
		//alert('OBSOLETE parse()!');
		// Try parsing (tokenizing)
		var utm = _self.parseUtm(str);
		var latlon = _self.parseLatLon(str);

		// Evaluate
		var attempts = { pos: { "utm": utm, "latlon": latlon } };
		var attempts = _self.findBestMatch(attempts);


		// Need more info
		attempts.needMoreInfo = (attempts.eval[attempts.bestMatch] < 100);
		if (attempts.needMoreInfo && hintLocation) {
			attempts = _self.addHintLocation(attempts, hintLocation);
		}

		// Return:
		//    - tokenized position
		//    - missing info (need location)
		return attempts;
	};

	_self.findBestMatch = function (attempts) {
		attempts.eval = { utm: 0, latlon: 0 };
		if (attempts.pos.utm) {
			attempts.eval.utm = _self.evalUtm(attempts.pos.utm);
		}
		if (attempts.pos.latlon) {
			attempts.eval.latlon = _self.evalLatLon(attempts.pos.latlon);
		}

		attempts.bestMatch = undefined;
		if (attempts.eval.utm > attempts.eval.latlon) {
			if (attempts.eval.utm > 50)
				attempts.bestMatch = 'utm';
		} else {
			if (attempts.eval.latlon > 50)
				attempts.bestMatch = 'latlon';
		}

		return attempts;
	};

	_self.addHintLocation = function (attempts, hint) {
		if (attempts.bestMatch == "utm") {
			var utm = _self.addUtmHintLocation(attempts.pos.utm, hint);
			attempts.pos.utm = utm;
		} else if (attempts.bestMatch == "latlon") {
			var latlon = _self.addLatLonHintLocation(attempts.pos.latlon, hint);
			attempts.pos.latlon = latlon;
		}
		return attempts;
	};

	_self.addUtmHintLocation = function (utm, hintLocation) {
		// Adding Zone and/or band, if missing
		var feedback = '';
		if (!utm.zone) {
			utm.zone = hintLocation.utm.zone;
			feedback += 'zone ' + utm.zone;
		}

		if (!utm.band) {
			utm.band = hintLocation.utm.band;

			if (feedback)
				feedback += utm.band;
			else
				feedback +=
					feedback += 'zoneband ' + utm.band;
		}
		if (feedback) {
			feedback = 'Added ' + feedback;
			if (hintLocation.source)
				feedback = feedback + ' from ' + hintLocation.source;
			_self.addFeedback(utm, feedback);
		}


		// Swap NS and EW if that is "closer to home"
		var scoreUnmodified = Math.abs(utm.easting - hintLocation.utm.easting) + Math.abs(utm.northing - hintLocation.utm.northing);
		var scoreReversed = Math.abs(utm.easting - hintLocation.utm.northing) + Math.abs(utm.northing - hintLocation.utm.easting);
		if (scoreReversed * 10 < scoreUnmodified) {
			var tempPos = utm.easting; utm.easting = utm.northing; utm.northing = tempPos;
			_self.addFeedback(utm, 'DBG: I SWAPPED. It it a lot closer to home');

		}

		return utm;
	};

	_self.addFeedback = function (obj, feedback) {
		if (!obj.feedback)
			obj.feedback = [];
		obj.feedback.push(feedback);
	};

	_self.addLatLonHintLocation = function (latlon, hintLocation) {
		hintLocation = hintLocation.latlon;
		//if (latlon.isWithoutNSEW) {}
		var diff = Math.abs(latlon.lat - hintLocation.lat) + Math.abs(latlon.lon - hintLocation.lon);
		var diffReverse = Math.abs(latlon.lat - hintLocation.lon) + Math.abs(latlon.lon - hintLocation.lat);
		if (diffReverse < diff * 2) {
			// swap lat and lon
			var tempDeg = latlon.lat; latlon.lat = latlon.lon; latlon.lon = tempDeg;
			_self.addFeedback('')
		}
		return latlon;
	};

	_self.evalUtm = function (utm) {
		// ToDo: Must evalute NSEW
		var val = 0;


		if (utm.zone) {
			val += 10;
		}
		if (utm.easting) {
			if (Math.abs(utm.easting) < 180)
				val -= 5;
			else
				if (utm.easting > 100000)
					val += 25;
			if (utm.easting < 999999)
				val += 25;
		}
		if (utm.northing) {
			// ToDo: If Northing matches zoneband

			if (Math.abs(utm.northing) < 180)
				val -= 5;
			else
				if (Math.abs(utm.northing) < 9999999)
					val += 40;
				else
					val += 10;
		}

		return val;
	};

	_self.evalLatLon = function (latlon) {
		// ToDo: Must evalute NSEW
		var val = 0;


		if (latlon.lat) {
			if (Math.abs(latlon.lat) > 90)
				val -= 5;
			else
				val += 50;
		}

		if (latlon.lon) {
			if (Math.abs(latlon.lon) > 180)
				val -= 5;
			else
				val += 50;
		}

		return val;
	};


	// =====================================================
	// Parse array of tokens 
	//
	_self.parseTokens = function (tokens, options, hintLocation) {
		// Try parsing (tokenizing)
		var utm = _self.parseTokensUtm(tokens, options);
		var latlon = _self.parseTokensLatLon(tokens, options);

		// Evaluate
		var attempts = { pos: { "utm": utm, "latlon": latlon } };
		var attempts = _self.findBestMatch(attempts);
		//attempts.bestMatch = 'utm';
		//attempts.eval = {utm: 100, latlon:20};

		// ToDo: RETURN INFO WHEN RULES ARE USED

		// Need more info
		attempts.needMoreInfo = (attempts.eval[attempts.bestMatch] < 100);
		if (attempts.needMoreInfo) {
			if (hintLocation) {
				if (attempts.pos.utm.feedback)
					attempts.pos.utm.feedback.length = 0;
				if (attempts.pos.latlon.feedback)
					attempts.pos.latlon.feedback.length = 0;
				attempts = _self.addHintLocation(attempts, hintLocation);
			} else {
				var parsingFeedback = attempts.pos[attempts.bestMatch].feedback;
				if (parsingFeedback)
					attempts.feedback = parsingFeedback;
				else
					attempts.feedback = ["Sorry, I do not understand what coordinate you have written."];
			}
		}

		// Return:
		//    - tokenized position
		//    - missing info (need location)
		return attempts;

	};
	// =====================================================
	// Parse array of tokens containing UTM
	//
	_self.parseTokensUtm = function (tokens, options, hint) {
		// ToDo: Bruk 'options.delimiters'
		var feedback = [];
		var i = 0;

		// Find first number
		while (i < tokens.length) {
			if (tokens[i].type == "number")
				break;
			i++;
		}

		// Parse the elements
		var zone, band, easting, northing;
		var dir1, pos1, dir2, pos2, dirTemp;
		// Zone number and band
		var zoneBandRe = RegExp("[" + _zoneBandChars + "]");
		var delimRe = RegExp("[" + _delimChars + "]");
		var dirRe = RegExp("m?[" + _dirChars + "]");
		if (tokens[i] && tokens[i].value <= 60) {
			zone = tokens[i].value;
			i++;
			if (tokens[i] && zoneBandRe.exec(tokens[i].value)) {
				band = tokens[i].value;
				i++;
			}
		} else {
			feedback.push("The coordinate looks like a UTM coordinate, but is missing a UTM zone (e.g. 32N), and I have no previous coordinates or your location to base my guess on.");
		}

		// First number
		// ToDo: Fast forward to first number, then skip back one
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dir1 = tokens[i].value;
			i++;
		}
		if (tokens[i] && tokens[i].type == "number") {
			pos1 = tokens[i].value; // position
			i++;
		}
		if (tokens[i] && tokens[i].value == 'M') {
			i++; // skip optional 'm'
		}
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dirTemp = tokens[i].value;
			if (dirTemp && dirTemp[0] == 'M')
				dirTemp = dirTemp.substring(1);
			i++;
		}
		if (tokens[i] && delimRe.exec(tokens[i].value)) {
			dir1 = dirTemp;
			i++;
		}

		// Second number
		// ToDo: Fast forward to first number, then skip back one (?)
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dir2 = tokens[i].value;
			i++;
		}
		if (tokens[i] && tokens[i].type == "number") {
			pos2 = tokens[i].value;
			i++;
		}
		if (tokens[i] && tokens[i].value == 'M') {
			i++; // skip optional 'm'
		}
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dir2 = tokens[i].value;
			if (dir2 && dir2[0] == 'M')
				dir2 = dir2.substring(1);
			i++;
		}



		// If northing is placed before easting, swap them
		if (dir1 == _NORTH || dir2 == _EAST) {
			var tempDir = dir1, dir1 = dir2, dir2 = tempDir;
			var tempPos = pos1, pos1 = pos2, pos2 = tempPos;
			_self.dbg("swapping");
		}
		// If no directions are used, guess that that 6 digit position is easting
		if (dir1 == undefined && dir2 == undefined && pos1 != undefined && pos2 != undefined) {
			if (_self.numPositiveDigits(pos1) != 6 && _self.numPositiveDigits(pos2) == 6) {
				feedback.push("You did not specify any directions (NSEW). Assuming '" + pos2 + "' that has 6 digits is the Easting, since '" + pos1 + "' doesn't."); // Must be executed before swapping
				var tempPos = pos1; pos1 = pos2; pos2 = tempPos;
			}
		}

		// Convert to number
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
		utm.feedback = feedback;
		return utm;
	};

	// =====================================================
	// Parse array of tokens containing latitude and longitude
	//
	_self.parseTokensLatLon = function (tokens, options, hint) {
		//var options = { delimiters: ',;|', units: {degrees: '°°ºo^~\*', minutes: "'", seconds: '"'}};


		var i = 0;


		// Parse the elements
		var dir1, pos1, dir2, pos2, dirTemp;
		// Zone number and band
		var delimRe = RegExp("[" + _delimChars + "]");
		var dirRe = RegExp("[" + _dirChars + "]");
		var degRe = RegExp("[" + options.units.degrees + "]");
		var minRe = RegExp("[" + options.units.minutes + "]");

		// First number
		while (tokens[i] && tokens[i].type != "number") {
			i++;
		}
		if (_self.hasNoDelimiters(tokens, i)) {
			var lastNumber = tokens.length - 1;
			while (tokens[lastNumber] && tokens[lastNumber].type != "number")
				lastNumber--;
			var splitCoordinate = (i + lastNumber + 1) / 2;
		}
		if (i > 0) {
			i--; // Check for preceeding NSWE
			if (tokens[i] && dirRe.exec(tokens[i].value)) {
				dir1 = tokens[i].value;
			}
			i++;
		}
		if (tokens[i] && tokens[i].type == "number") {
			var ret = _self.parseTokensDegrees(tokens, options, i, splitCoordinate);
			pos1 = ret.pos;
			i = ret.i;
		}
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dirTemp = tokens[i].value;
			i++;
		}
		if (tokens[i]) {
			if (tokens[i].type == 'delim') {
				if (dirTemp) {
					dir1 = dirTemp;
					dirTemp = undefined;
				}
				i++;
			}
		}

		// Second number
		var startSecond = i;
		while (tokens[i] && tokens[i].type != 'number') {
			i++;
		}
		if (i > startSecond) {
			i--; // Check for preceeding NSWE
			if (tokens[i] && dirRe.exec(tokens[i].value)) {
				if (dirTemp) {
					ir1 = dirTemp;
					dirTemp = undefined;
				}
				dir2 = tokens[i].value;
			}
			i++;
		}
		if (tokens[i] && tokens[i].type == "number") {
			var ret = _self.parseTokensDegrees(tokens, options, i);
			pos2 = ret.pos;
			i = ret.i;
		}
		if (tokens[i] && dirRe.exec(tokens[i].value)) {
			dir2 = tokens[i].value;
			i++;
		}
		if (!dir1 && dirTemp) {
			dir1 = dirTemp;
			dirTemp = undefined;
		}
		if (!dir2 && dirTemp) {
			dir2 = dirTemp;
			dirTemp = undefined;
		}


		// If longitude is placed before latitude, swap them
		if (dir1 == _EAST || dir1 == _WEST || dir2 == _NORTH || dir2 == _SOUTH) {
			var tempDir = dir1, dir1 = dir2, dir2 = tempDir;
			var tempPos = pos1, pos1 = pos2, pos2 = tempPos;
		}

		// Parse the degrees string
		var latitude = pos1;
		var longititude = pos2;


		// Adujst for negative signs
		if (dir1 == _SOUTH) {
			latitude = -latitude;
		}
		if (dir2 == _WEST) {
			longititude = -longititude;
		}

		var geo = new geoLatLon(latitude, longititude);
		return geo;

	};

	// =====================================================
	// Parse string containing latitude and longitude
	//
	_self.parseTokensDegrees = function (tokens, options, i, splitCoordinate) {
		var secRe = RegExp("[" + options.units.seconds + "]");
		var pos = 0.0;
		var sign = 1; // 1= positive
		if (splitCoordinate == undefined)
			splitCoordinate = tokens.length;
		// ToDo: HAS NO DELIMITER? GUESS ON SPLIT

		// Degrees
		if (tokens[i] && tokens[i].type == "number") {
			pos = _self.parseNum(tokens[i].value);
			if (pos < 0) {
				sign = -1;
				pos = -pos;
			}
			i++;
		}
		if (tokens[i] && tokens[i].type == "delim")
			return { i: i, pos: pos };
		if (tokens[i] && tokens[i].type == "other") {
			i++;
		}
		if (tokens[i] && tokens[i].type == "number" && i < splitCoordinate) {
			if (!tokens[i + 1] || !secRe.exec(tokens[i + 1].value)) { // Skip if not minutes, but seconds
				pos += _self.parseNum(tokens[i].value) / 60.0;
				i++;
			}
		}
		if (tokens[i] && tokens[i].type == "delim")
			return { i: i, pos: pos };
		if (tokens[i] && tokens[i].type == "other") {
			i++;
		}

		if (tokens[i] && tokens[i].type == "number" && i < splitCoordinate) {
			pos += _self.parseNum(tokens[i].value) / 60.0 / 60.0;
			i++;
		}
		if (tokens[i] && tokens[i].type == "other") {
			i++;
		}



		return { i: i, pos: sign * pos };
	};

	// =====================================================
	// Has no delimiters, if all the numbers are in only one group
	//
	_self.hasNoDelimiters = function (tokens, i) {
		while (tokens[i] && tokens[i].type == "number")
			i++;
		while (tokens[i] && tokens[i].type != "number")
			i++;
		if (i == tokens.length)
			return true;
		else
			return false;
	};

	// =====================================================
	// Parse string containing latitude and longitude
	//
	_self.parseLatLon = function (str) {
		//alerts('OBSOLETE');

		if (str == undefined || str == null)
			return undefined;

		// Check if it matches the reg.exp.
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

		_self.dbg("<br/>" + str);
		// If directions are placed _after_ degrees, move them
		if (dir1 == "") {
			dir1 = dir1b;
			dir1b = "";
		}
		if (dir2 == "") {
			if (dir2b == "")
				dir2 = dir1b;
			else
				dir2 = dir2b;
		}

		// If longitude is placed before latitude, swap them
		if (dir1 == _EAST || dir1 == _WEST || dir2 == _NORTH || dir2 == _SOUTH) {
			var tempDir = dir1, dir1 = dir2, dir2 = tempDir;
			var tempDeg = deg1, deg1 = deg2, deg2 = tempDeg;
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
	};


	// =====================================================
	// Parse string containing UTM coordinates
	//
	_self.parseUtm = function (str) {
		//alert('OBSOLETE parseUtm()');
		if (str == undefined || str == null)
			return undefined;

		var parts = _utmRe.exec(str.toUpperCase());
		_self.dbg("<br/><b>" + str + "</b>");
		_self.dbg(parts);

		// If no match, return undefined
		if (parts == null) {
			return undefined;
		}

		var zone = parts[1];
		var band = parts[2];
		var dir1 = parts[3];
		var pos1 = parts[4];
		var dir1b = parts[5];
		var dir2 = parts[6];
		var pos2 = parts[7];
		var dir2b = parts[8];

		_self.dbg("-" + zone + "-" + band + "-" + dir1 + "-" + pos1 + "-" + dir1b + "-" + dir2 + "-" + pos2 + "-" + dir2b + "-");
		// If directions are placed _after_ position, move them forwards
		dir1 = (dir1 == "") ? dir1b : dir1;
		dir2 = (dir2 == "") ? dir2b : dir2;

		// If northing is placed before easting, swap them
		if (dir1 == _NORTH || dir2 == _EAST) {
			var tempDir = dir1, dir1 = dir2, dir2 = tempDir;
			var tempPos = pos1, pos1 = pos2, pos2 = tempPos;
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
	};

	// =====================================================
	// Parse string containing degrees, minutes and seconds
	//
	_self.parseDeg = function (str) {
		//alerts('OBSOLETE');
		_self.dbg("<b>" + str + "</b>");
		if (!str) {
			return 0.0;
		}

		var deg = 0.0;
		var start = 0;
		var end = 0;
		var sign = +1;
		str = str + " ";

		// Sign
		start = _self.findSign(str, start);
		if (start > -1) {
			if (str[start] == "-") {
				sign = -1;
				start++;
			} else if (str[start] == "+") {
				start++;
			}
		}
		_self.dbg("Sign: " + sign);

		// Degrees
		start = _self.findNum(str, start);
		end = _self.findDelim(str, start + 1);
		if (start > -1 && end > -1) {
			var numStr = str.substring(start, end).replace(",", ".");
			var num = _self.parseNum(numStr);
			deg += num;
			_self.dbg("Parsing Degrees: -" + numStr + "- gives " + num + ": " + deg);
		}
		if (start == -1 || end == -1) {
			_self.dbg("-end-");
			return sign * deg;
		}

		// Minutes
		start = _self.findNum(str, end + 1);
		end = _self.findDelim(str, start + 1);
		if (start > -1 && end > -1) {
			var numStr = str.substring(start, end).replace(",", ".");
			var num = _self.parseNum(numStr);
			deg += num / 60.0;
			_self.dbg("Parsing Minutes: -" + numStr + "- gives " + num + ": " + deg);
		}
		if (start == -1 || end == -1) {
			_self.dbg("-end-");
			return sign * deg;
		}

		// Seconds
		start = _self.findNum(str, end + 1);
		end = _self.findDelim(str, start + 1);
		if (start > -1 && end > -1) {
			var numStr = str.substring(start, end);
			var num = _self.parseNum(numStr);
			deg += num / 3600.0;
			_self.dbg("Parsing Seconds: -" + numStr + "- gives " + num + ": " + deg);
		}


		return sign * deg;
	};



	// =====================================================
	// Parse string containing a number
	//
	// ToDo: Parsing number with decimal points are not yet supported.
	//
	_self.parseNum = function (str) {
		if (!str)
			return undefined;
		str = str.replace(",", ".");
		var num = parseFloat(str);
		return num;
	};


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
	};

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
	};

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
	};

	// ======================================
	_self.tokenizeString = function (str, options) {
		var tokens = [];
		var i = 0;
		str = str.toUpperCase();
		var token = _self.readToken(str, i, options);
		while (token && token.value) {
			tokens.push(token);

			// Read next token
			i = token.end;
			token = _self.readToken(str, i, options);
		}

		return tokens;
	};

	// ======================================
	_self.readToken = function (str, i, options) {
		if (!options) options = {};

		i = _self.readSpaces(str, i);
		var start = i;
		var token = {};

		i = _self.readNumber(str, i);
		if (i != start) {
			return _self.createToken(str, start, i, "number");
		}

		i = _self.readLetters(str, i);
		if (i != start) {
			return _self.createToken(str, start, i, "letters");
		}

		i = _self.readUnit(str, i, options.units);
		if (i != start) {
			return _self.createToken(str, start, i, "unit");
		}

		i = _self.readDelimiter(str, i, options.delimiters);
		if (i != start) {
			return _self.createToken(str, start, i, "delim");
		}

		i = _self.readOther(str, i);
		if (i != start) {
			return _self.createToken(str, start, i, "other");
		}



		return token;
	};

	// ======================================
	_self.createToken = function (str, start, end, type) {
		var token = {
			start: start, end: end, type: type,
			value: str.substring(start, end)
		};
		return token;
	};

	// ======================================
	// Find end position for a number
	// 
	// A number may contain decimals, using 
	// either comma or dot as desimal point.
	_self.readNumber = function (str, i) {
		var start = i;

		if (str[i] == '+' || str[i] == '-')
			i++;

		if (str[i] >= '0' && str[i] <= '9') {
			i++;
			while (str[i] >= '0' && str[i] <= '9')
				i++;

			if (str[i] == ',' || str[i] == '.') {
				i++;
				while (str[i] >= '0' && str[i] <= '9')
					i++;
			}

			if (str[i - 1] == ',' || str[i - 1] == '.') {
				i--;
			}
		} else {
			// Normally no effect, unless a single + or - was read, with no following digit
			i = start;
		}
		return i;
	};

	// ======================================
	// Find end position for a word,
	// containing letters only.
	_self.readLetters = function (str, i) {
		var start = i;

		while ((str[i] >= 'A' && str[i] <= 'Z') || (str[i] >= 'a' && str[i] <= 'z'))
			i++;

		return i;
	};

	// ======================================
	// Find end one pos further
	_self.readOther = function (str, i) {
		if (str[i] != undefined)
			i++;
		return i;
	};

	// ======================================
	// Find end position for a delimiter.
	_self.readDelimiter = function (str, i, delimiters) {
		var start = i;

		while (delimiters.indexOf(str[i]) > -1)
			i++;

		return i;
	};

	// ======================================
	// Find end position for a unit.
	_self.readUnit = function (str, i, units) {
		var start = i;

		while (units[str[i]])
			i++;

		return i;
	};

	// ======================================
	// Find end position for a sequence of spaces
	_self.readSpaces = function (str, i) {
		while (' \t\n\r\v'.indexOf(str[i]) > -1)
			i++;
		return i;
	};

	_self.numPositiveDigits = function (str) {
		var i = 0;

		// Count (i.e. skip) leading zeros
		while (i < str.length && str[i] == '0') {
			i++;
		}
		var zeroCount = i;

		// Count remaining digits
		while (i < str.length) {
			if (str[i] < '0' || str[i] > '9')
				break;
			i++;
		}

		return i - zeroCount;
	};

	// ==============
	// Debug methods
	var _dbgDiv = "";
	_self.setDebugDiv = function (dbgDiv) {
		_self.dbgDiv = dbgDiv;
	};
	_self.dbg = function (str) {
		if (_self.dbgDiv) {
			var dbgDiv = document.getElementById("dbgDiv");
			if (dbgDiv) {
				dbgDiv.innerHTML = str + "<br/>\n" + dbgDiv.innerHTML;
			}
		}
	};

	return _self;
}());