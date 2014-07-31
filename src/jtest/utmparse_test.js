var utmparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["32V 500000mE, 2100827mN", [32, 500000, 2100827]],
		["UTM 32V 500000, 2100827", [32, 500000, 2100827]],
		["32 V N2100827, 500000E", [32, 500000, 2100827]],
		["32N E500000 N2100827", [32, 500000, 2100827]],
		["32 N2100827, 500000E", [32, 500000, 2100827]],
		["32 N2100827N, 500000E", [32, 500000, 2100827]],
		["" [0,0,0]]];
	
	
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
		utm = utmparse.parseUtm(teststr);
		if (utm == null) {
			html += '<td colspan="2">null</td>';
		} else {
			html += "<td>"+utm[0]+"</td>\n";
			html += "<td>"+utm[1]+"</td>\n";
			html += "<td>"+utm[2]+"</td>\n";
			html += "<td>"+utm[3]+"</td>\n";
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