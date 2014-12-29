var utmparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["32V 500000E, 2100827N", [32, 500000, 2100827]],
		["UTM 32V 500000, 2100827", [32, 500000, 2100827]],
		["32 V N2100827, 500000E", [32, 500000, 2100827]],
		["32N E500000 N2100827", [32, 500000, 2100827]],
		["32 N2100000,12, 500000.78E", [32, 500000.78, 2100000.12]],
		["32 N2100827N, 500000E", [32, 500000, 2100827]],
		["32A 2100827N, 500000E", [32, 500000, 2100827]],
		["32S 2100827N, 500000E", [32, 500000, 2100827]],
		["31 500000 7000000", [31, 500000, 7000000]],
		["31n 500000 7000000", [31, 500000, 7000000]],
		["7032813,0565179", [32, 0565179, 7032813]],
		["456000, 6400765", [32, 456000, 6400765]],
		["E456000, N6400765", [32, 6400765, 456000]],
		["34W0481664 7735945", [34, 0481664, 7735945]],
		["7032813n,0565179e", [32, 0565179, 7032813]],
		["32V 500000mE, 2100827mN", [32, 500000, 2100827]],
		["32V 500000mE | 2100827mN", [32, 500000, 2100827]],
		["UTM32N 6537176, 535880e", [32, 535880, 6537176]],
		["UTM32N 6537176, 535880", [32, 535880, 6537176]],
		["UTM33N6549441, 191106", [33, 191106, 6549441]],
		["UTM35N 6667403, -491726", [35, -491726, 6667403]],
		["", [0,0,0]]];

	// NØ: UTM 32W 353646E 7100664N
	// NV: UTM 31W 646448E 7100664N
	// SV: UTM 32V 353060E 7100190N
	// SØ: UTM 32V 353646E 7100190N
	
	
	_self.createTable = function (div) {
		div.append('<table	border="1"></table>');
		var table = div.find("table");
		for (var i=0; i<_testdata.length; i++) {
			var tr = _self.createTableRow(_testdata[i], i);
			table.append(tr);
		}
	}
	
	
	_self.createTableRow = function (testdata, index) {
		var teststr = testdata[0];
		var expectedPos = testdata[1];
		var count = 0;
		var html = "<td>"+index+"</td>";
		html += "<td>"+teststr+"</td>\n";
		var attempts = geoparse.parse(teststr);
		if (attempts == null) {
			html += '<td colspan="6" class="null">parse retuend NULL</td>';
		} else if (attempts.bestMatch != 'utm') {
			html += '<td colspan="6" class="null">Not identified as UTM</td>';
		} else if (attempts.pos.utm == undefined) {
			html += '<td colspan="6" class="null">UTM is NULL</td>';
		} else {
			var utm = attempts.pos.utm;
			html += "<td>"+utm.zone+"</td>\n";
			html += "<td>"+utm.band+"</td>\n";
			html += "<td>"+utm.easting+"</td>\n";
			html += "<td>"+utm.northing+"</td>\n";
			if (expectedPos && expectedPos.length==3) {
				var diff = _self.utmDiff(utm, expectedPos);
				if (diff)
					html += '<td class="error">'+diff+"</td>\n";
				else
					html += "<td></td>\n";
			}
		}
		html = "<tr>"+html+"</tr>";
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