var geoparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["59º 45' 04.51\" N 10º 5' 12,5\" E", [0,0]],
		["59.1 N 10.5 E", [59.1, 10.5]],
		["S 41 6 18 E 174 52 12 W", [-41.105, 174.87]],
		["E 10.5, N 59.3 ", [59.3,10.5]],
		["59.4, 10.5", [59.4,10.5]],
		["59º 10.51' N 10º 5' E", [0,0]],
		["" [0,0]]];
	
	
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
		geo = geoparse.parseGeo(teststr);
		if (geo == null) {
			html += '<td colspan="2">null</td>';
		} else {
			html += "<td>"+geo[0]+"</td>\n";
			html += "<td>"+geo[1]+"</td>\n";
			if (expectedPos && expectedPos.length==2) {
				html += "<td>"+_self.geoDiff(geo, expectedPos)+"</td>\n";
			}
		}
		html = "<tr>"+html+"</tr>";
		return html;
	}
	
	_self.geoDiff = function (geoA, geoB) {
		dLat = geoA[0]-geoB[0];
		dLng = geoA[1]-geoB[1];
		var str = "";
		if (Math.abs(dLat) > 0.00001) {
			str += "lat: "+dLat+" ";
		}
		if (Math.abs(dLng) > 0.00001) {
			str += "long: "+dLng+" "	;
		}
		if (str) {
			str = "Diff: "+str;
		}
		return str
	}
	
	return _self;
}());