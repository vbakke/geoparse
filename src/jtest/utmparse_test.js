var utmparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["32V 500000E, 2100827N", [32, 500000, 2100827]],
		["32V 500000mE, 2100827mN", [32, 500000, 2100827]],
		["32V 500000mE | 2100827mN", [32, 500000, 2100827]],
		["UTM 32V 500000, 2100827", [32, 500000, 2100827]],
		["32 V N2100827, 500000E", [32, 500000, 2100827]],
		["32N E500000 N2100827", [32, 500000, 2100827]],
		["32 N2100000,12, 500000.78E", [32, 500000, 2100827]],
		["32 N2100827N, 500000E", [32, 500000, 2100827]],
		["32A 2100827N, 500000E", [32, 500000, 2100827]],
		["32S 2100827N, 500000E", [32, 500000, 2100827]],
		["" [0,0,0]]];
	
	// NØ: UTM 32W 353646E 7100664N
	// NV: UTM 31W 646448E 7100664N
	// SV: UTM 32V 353060E 7100190N
	// SØ: UTM 32V 353646E 7100190N
	
	
	_self.createTable = function () {
		html = ""
		for (var i=0; i<_testdata.length; i++) {
			html += _self.createTableRow(_testdata[i]);
		}
		
		html = "<table border=1>\n" + html + "\n</table>";
		return html;
	}
	
	
	_self.createTableRow = function (testdata) {
		var teststr = testdata[0];
		var expectedPos = testdata[1];
		
		html = "";
		html += "<td>"+teststr+"</td>\n";
		utm = geoparse.parseUtm(teststr);
		if (utm == null) {
			html += '<td colspan="2">null</td>';
		} else {
			html += "<td>"+utm.zone+"</td>\n";
			html += "<td>"+utm.band+"</td>\n";
			html += "<td>"+utm.easting+"</td>\n";
			html += "<td>"+utm.northing+"</td>\n";
			if (expectedPos && expectedPos.length==2) {
				html += "<td>"+_self.utmDiff(utm, expectedPos)+"</td>\n";
			}
		}
		html = "<tr>"+html+"</tr>";
		return html;
	}
	
	_self.utmDiff = function (utmA, utmB) {
		dZone = utmA[0]-utmB[0];
		dEast = utmA[1]-utmB[1];
		dNorth = utmA[2]-utmB[2];
		var str = "";
		if (Math.abs(dLat) > 0.00001) {
			str += "Zone: "+dZone+" ";
		}
		if (Math.abs(dEast) > 0.00001) {
			str += "Easting: "+dEast+" "	;
		}
		if (Math.abs(dNorth) > 0.00001) {
			str += "Northing: "+dNorth+" "	;
		}
		if (str) {
			str = "Diff: "+str;
		}
		return str
	}
	
	return _self;
}());