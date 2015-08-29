var utmparse_test = (function () {
	var _SKIP = false;
	var _DISPLAY_TOKENS = false;
	
	var _self = {};
	var _hint = "32V 555555 6666666";
	//_hint = undefined;
	var _testdata = [


		 ["16 s 384464 4144799", [16, 384464, 4144799]],
		 ["32V 500000E, 2100827N", [32, 500000, 2100827]],
		 ["UTM 32V 500000 2100827", [32, 500000, 2100827], undefined	, 'No NSWE'],
		 ["32 V N2100827, 500000E", [32, 500000, 2100827]],
		 ["32N E500000 N2100827", [32, 500000, 2100827]],
		 ["32 N2100000,12, 500000.78E", [32, 500000.78, 2100000.12]],
		 ["32 N2100827N, 500000E", [32, 500000, 2100827]],
		 ["32S 2100827N, 500000E", [32, 500000, 2100827]],
		 ["31+ 500000 7000000", [31, 500000, 7000000]],
		 ["456000, 6400765", [32, 456000, 6400765], undefined, 'Should fail: No Zone, No Hint'],
		 ["456000, 6400765", [32, 456000, 6400765], _hint, 'Still No Zone, butt now with Hint'],
		 ["31n 500000 7000000", [31, 500000, 7000000], undefined, 'No delim'],
		 ["31n 500000 E 7000000", [31, 500000, 7000000], undefined, 'Only middle delim'],
		 ["31n 500000 N 7000000", [31, 500000, 7000000], undefined, 'Only middle delim'],
		 ["32A 2100827N, 500000E", [32, 500000, 2100827]],
		 ["E456000, N6400765", [32, 456000, 6400765], _hint],
		["32V N6400765| E456000", [32, 456000, 6400765], _hint],
		["32V N456000| E6400765", [32, 456000, 6400765], _hint, 'Incorrect NSEW entered, Should notify user that is has swapped coordinates'],
		["N6400765| E456000", [32, 456000, 6400765], _hint],
		["N456000| E6400765", [32, 456000, 6400765], _hint, 'Incorrect NSEW entered, Should notify user that is has swapped coordinates'],
		["S456000, W6400765", [32, -6400765, -456000], undefined, 'Might not be vallid'],
		["34W0481664 7735945", [34, 0481664, 7735945], _hint],
		["7032813n,0565179e", [32, 0565179, 7032813], _hint],
		["32V 500000mE, 2100827mN", [32, 500000, 2100827], undefined, 'Includes m, right order'],
		["32V 2100827mN, 500000mE, ", [32, 500000, 2100827], undefined, 'Includes m, opposite order'],
		["32V 2100827m N, 500000m E, ", [32, 500000, 2100827], undefined, 'Includes m, opposite order, with space'],
		["UTM32N 6537176, 535880e", [32, 535880, 6537176], undefined, 'Direction only at end'],
		["UTM32N 6537176, 535880", [32, 535880, 6537176], undefined	, 'No NSWE, and opposite order. No hint. Needs heurestics.'],
		["UTM32N 6537176, 535880", [32, 535880, 6537176], _hint, 'Same as above. Hint given'],
		["UTM32N 6646642, 542217", [32, 542217, 6646642], undefined, 'Gule sider. No hint.'],
		["UTM32N 6646642, 542217", [32, 542217, 6646642], _hint, 'Gule sider. With hint.'],
		["UTM33N6549441, 191106", [33, 191106, 6549441], undefined, ''],
		["UTM35N 6667403, 491726", [35, 491726, 6667403], undefined, 'Should swap, E has 6 digits'],
		["UTM35N 6667403, 0491726", [35, 491726, 6667403], undefined, 'Should swap, E has 6 digits with leading zero'],
		["UTM35N 6667403, -491726", [35, 6667403, -491726], undefined, 'Should not swap, E has 6 digits, but '],
		["7032813,0565179", [32, 0565179, 7032813], undefined, 'Special case. No spaces, and comma'],
		["32V 500000E, 2100827N", [32, 500000, 2100827], _hint],
		["32 500000E, 2100827N", [32, 500000, 2100827], _hint],
		["543210E, 2100827N", [32, 543210, 2100827], _hint],
		[".123 .321", [32, 555123, 6666321], _hint, 'Shorthand, ToDo later.'],
		["", [0,0,0]]];

	// NØ: UTM 32W 353646E 7100664N
	// NV: UTM 31W 646448E 7100664N
	// SV: UTM 32V 353060E 7100190N
	// SØ: UTM 32V 353646E 7100190N
	
	
	_self.createTable = function (div) {
		if (_SKIP) {
			div.append("<p>SKIPPING <i>utmparse_test()</i></p>");			
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
		if (console) console.log(index+': '+teststr);

		if (hint) {
			var hintstr = hint;
			hint = {};
			hint.utm = geoparse.parse(hintstr).pos.utm;
			hint.latlon = geoconverter.UTMToLatLon(hint.utm);
		}

		var html = "<td>"+index+"</td>";
		html += "<td>"+teststr+"</td>\n";

		var options = { delimiters: ',;', units: {'°':'deg'}};
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
			html += '<td colspan="5" class="null">parse retuend NULL</td>';
		} else if (attempts.bestMatch != 'utm') {
			html += '<td colspan="5" class="null">Not identified as UTM</td>';
		} else if (attempts.pos.utm == undefined) {
			html += '<td colspan="5" class="null">UTM is NULL</td>';
		} else {
			var utm = attempts.pos.utm;
			html += "<td>"+utm.zone+"</td>\n";
		if (_SKIP) {
			div.append("<p>SKIPPING <i>utmtest()</i></p>");			
		}
		else {
				html += "<td>"+utm.band+"</td>\n";
				html += "<td>"+utm.easting+"</td>\n";
				html += "<td>"+utm.northing+"</td>\n";
				if (expectedPos && expectedPos.length==3) {
					var diff = _self.utmDiff(utm, expectedPos);
				}
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
	
	_self.utmDiff = function (utmA, utmB) {
		var dZone = utmA.zone-utmB[0];
		var dEast = utmA.easting-utmB[1];
		var dNorth = utmA.northing-utmB[2];
		var str = "";
		if (isNaN(dZone) || Math.abs(dZone) > 0.001) {
			str += "Zone: "+dZone+" ";
		}
		if (isNaN(dEast) || Math.abs(dEast) > 0.001) {
			str += "Easting: "+dEast+" "	;
		}
		if (isNaN(dNorth)  || Math.abs(dNorth) > 0.001) {
			str += "Northing: "+dNorth+" "	;
		}
		if (str) {
			str = "Diff: "+str;
		}
		return str
	}
	
	return _self;
}());