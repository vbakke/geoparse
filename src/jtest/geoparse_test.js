var geoparse_test = (function () {
	
	var _self = {};
	var _testdata = [
		["S 41 6 18 W 174 52 12 ", [-41.105, -174.87]],
		["41 6 18 S, 174 52 12 W", [-41.105, -174.87]],
		["E 10.5, N 59.3 ", [59.3,10.5]],
		["59.1 N 10.5 E", [59.1, 10.5]],
		["59º 45' 04.51\" N 10º 5' 12,5\" E", [59.7512527,10.086805555555555]],
		["59.4, 10.5", [59.4,10.5]],
		["59,4, 10,5", [59.4,10.5]],
		["59,4 10,5", [59.4,10.5]],
		["59º 10.51' N 10º 5' E", [59.17516666666667,10.083333333333334]],
		["58°58'21.6\"N 9°37'26.5\"E", [58.972667, 9.624023]],
		["58 58 21.6  9°37'26.5", [58.972667, 9.624023]],
		["58 58 21.6  9°37'26.5", [58.972667, 9.624023]],
		["59 45 55.2 10 07 08.8", [59.765333, 10.119111]],
		["59 45 55,2 10 07 08,8", [59.765333, 10.119111]],
		["", [0,0]]];
	
	
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
		
		var html = "<td>"+index+"</td>";
		html += "<td>"+teststr+"</td>\n";
		var attempts = geoparse.parse(teststr);

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