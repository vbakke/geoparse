var geoparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["S 41 6 18 W 174 52 12 ", [-41.105, -174.87]],
		["41 6 18 S, 174 52 12 W", [-41.105, -174.87]],
		["E 10.5, N 59.3 ", [59.3,10.5]],
		["59.1 N 10.5 E", [59.1, 10.5]],
		["59º 45' 04.51\" N 10º 5' 12,5\" E", [59.7512527,10.086805555555555]],
		["59.4, 10.5", [59.4,10.5]],
		["59º 10.51' N 10º 5' E", [59.17516666666667,10.083333333333334]],
		["" [0,0]]];
	
	
	_self.createTable = function () {
		var html = ""
		for (var i=0; i<_testdata.length; i++) {
			html += _self.createTableRow(_testdata[i]);
		}
		
		html = "<table border=1>\n" + html + "\n</table>";
		return html;
	}
	
	
	_self.createTableRow = function (testdata) {
		var teststr = testdata[0];
		var expectedPos = testdata[1];
		
		var html = "";
		html += "<td>"+teststr+"</td>\n";
		var latlon = geoparse.parseLatLon(teststr);
		if (latlon == null) {
			html += '<td colspan="2">null</td>';
		} else {
			html += "<td>"+latlon.lat+"</td>\n";
			html += "<td>"+latlon.lon+"</td>\n";
			if (expectedPos && expectedPos.length==2) {
				html += "<td>"+_self.geoDiff([latlon.lat, latlon.lon], expectedPos)+"</td>\n";
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