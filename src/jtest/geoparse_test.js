var geoparse_test = (function () {
	var _SKIP = false;
	var _DISPLAY_TOKENS = false;

	var _self = {};
	var _hint = "59.1 N 9.1 E";
	_hint = "37.1 N 112 W";
	_hint = undefined;

	var _testdata = [
/*
*/	
		["59.1 N 10.5 E", [59.1, 10.5], _hint, 'Comment'],
		["10.5 59.1 ", [59.1, 10.5], undefined, 'Should fail. Needs hint to reverse N and E'],
		["10.5 59.1 ", [59.1, 10.5], _hint, 'Now with hint, reverses N and E, should tell user'],
		["10.5 59 10.2", [59.1, 10.5], _hint, 'Should tell user about uncertain interpretation'],
		["10.5 N 59.1 E", [10.5, 59.1], _hint],
		["41 6 18 S, 174 52 12 W", [-41.105, -174.87]],
		["E 10.5, N 59.3 ", [59.3,10.5]],
		["59º 45' 04.51\" N 10º 5' 12,5\" E", [59.7512527,10.086805555555555]],
		["S 41 6 18 W 174 52 12 ", [-41.105, -174.87]],
		["59.4, 10.5", [59.4,10.5]],
		["59,4, 10,5", [59.4,10.5]],
		["59,4 10,5", [59.4,10.5]],
		["58°58'21.6\"N 9°37'26.5\"E", [58.972667, 9.624028]],
		["58 58 21.6  9°37'26.5", [58.972667, 9.624028]],
		["58 58 21.6  9°37'26.5", [58.972667, 9.624028]],
		["59 45 55.2 10 07 08.8", [59.765333, 10.119111]],
		["https://www.google.no/maps/@59.7031633,9.6066007,296m/data=!3m1!1e3", [59.7031633, 9.6066007]],
		["https://www.google.no/maps/@59.7598951,10.1830872,14z", [59.7598951, 10.1830872]],
		//["https://www.google.no/maps/place/10%C2%B000'05.4%22N+59%C2%B045'43.0%22E/@8.2677148,91.1359189,3z/data=!4m2!3m1!1s0x0:0x0", [8.2677148,91.1359189]],
		//["https://www.google.no/maps/place/Bi%C3%B8rnsborgbakken+5,+3770+Krager%C3%B8/@58.8722125,9.4118788,17z/data=!3m1!4b1!4m2!3m1!1s0x4647040c72d13b79:0xae7231669d220bd4", [58.8722125,9.4118788]],
		["N 59.1 E 10.5 ", [59.1, 10.5], _hint],
		["59.1 10.5 ", [59.1, 10.5], _hint],
		["59º 10.51' N 10º 5' E", [59.17516666666667,10.083333333333334]],
		["59 45 55,2 10 07 08,8", [59.765333, 10.119111]],
		["N37 16 26 W112 55 38", [37.27388888888889, -112.92722222222223], undefined, "Uten hint"],
		["N37 16 26 W112 55 38", [37.27388888888889, -112.92722222222223], _hint, "Med hint"],
		["", [0,0]]];
	
	
	_self.createTable = function (div) {
		if (_SKIP) {
			div.append("<p>SKIPPING <i>geoparse_test()</i></p>");			
		}
		else {
			div.append('<table	border="1"></table>');
			var table = div.find("table");
			for (var i=0; i<_testdata.length; i++) {
				var tr = _self.createTableRow(_testdata[i], i);
				table.append(tr);			
			}
		}
	}
	
	
	_self.createTableRow = function (testdata, index) {
		var teststr = testdata[0];
		var expectedPos = testdata[1];
		var hint = testdata[2];
		var comment = testdata[3];
		if (console) console.log(teststr);

		if (hint) {
			var hintstr = hint;
			hint = {};
			hint.latlon = geoparse.parse(hintstr).pos.latlon;
			hint.utm = geoconverter.LatLonToUTM(hint.latlon);
		}
		
		var html = "<td>"+index+"</td>";
		html += "<td>"+teststr.replace(/\//g,'/<br>')+"</td>\n";

		var options = { delimiters: ',;|', units: {degrees: '°°ºo^~\*', minutes: "'", seconds: '"'}};
		var tokens = geoparse.tokenizeString(teststr, options);
		var tokenTable = "";
		for (var i=0; i<tokens.length; i++) {
			var token = tokens[i];
			tokenTable += "<tr><td>Read "+token.type+"</td><td>'"+token.value+"'</td><td>pos "+token.start+"-"+token.end+"</td></tr>";
		};
		tokenTable = '<table border="2" style="border-collapse:collapse;">'+tokenTable+'</table>'
		html += '<td id="tokens"></td>';

		var attempts = geoparse.parseTokens(tokens, options, hint);

		if (attempts == null) {
			html += '<td colspan="6" class="null">parse retuend NULL</td>';
		} else if (attempts.bestMatch != 'latlon') {
			html += '<td colspan="6" class="null">Not identified as LatLon</td>';
		} else if (attempts.pos.latlon == undefined) {
			html += '<td colspan="6" class="null">LatLon is NULL</td>';
		} else {
			var latlon = attempts.pos.latlon;
			html += '<td>'+latlon.lat+"</td>\n";
			html += "<td>"+latlon.lon+"</td>\n";
			if (expectedPos && expectedPos.length==2) {
				var diff = _self.geoDiff([latlon.lat, latlon.lon], expectedPos);
				if (diff)
					html += '<td class="error">'+diff+"</td>\n";
				else
					html += "<td></td>\n";
			}
		}
		html += '<td>'+((comment)?comment:'-')+"</td>\n";
		html = "<tr>"+html+"</tr>";
		if (diff || _DISPLAY_TOKENS) {
			var tmp = $(html);
			var tok = tmp.find('#tokens');
			tok.append(tokenTable);
			html = tmp[0].outerHTML;
		}
		return html;
	}
	
	_self.geoDiff = function (geoA, geoB) {
		var dLat = geoA[0]-geoB[0];
		var dLng = geoA[1]-geoB[1];
		var str = "";
		if (Math.abs(dLat) > 0.01/60.0/60.0) {
			var dMinutes = (Math.abs(dLat)-Math.floor(Math.abs(dLat)))*60;
			var dSeconds = (dMinutes-Math.floor(dMinutes))*60;
			dMinutes = Math.floor(dMinutes);
			str += "lat: "+dLat+" (" + dMinutes + " min " + dSeconds.toFixed(2) + " sec ) <br/>";
		}
		if (Math.abs(dLng) > 0.01/60.0/60.0) {
			var dMinutes = (Math.abs(dLng)-Math.floor(Math.abs(dLng)))*60;
			var dSeconds = (dMinutes-Math.floor(dMinutes))*60;
			dMinutes = Math.floor(dMinutes);
			str += "long: "+dLng+" (" + dMinutes + " min " + dSeconds.toFixed(2) + " sec ) <br/>";
		}
		if (str) {
			str = "Diff: <br/>"+str;
		}
		return str
	}
	
	return _self;
}());