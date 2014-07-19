var geoparse_test = (function () {
	// ... all vars and functions are in this scope only
	// still maintains access to all globals
	
	var _self = {};
	var _testdata = [
		"59º 10' 12.51\" N 10º 5' 12,5\" E",
		"59.1 N 10.5 E",
		"59,2 S 10,5 W",
		"E 10.5, N 59.3 ",
		"59.4, 10.5",
		"59º 10.51' N 10º 5' E",
		""];
	
	
	_self.createTable = function () {
		html = ""
		for (var i=0; i<_testdata.length; i++) {
			html += _self.createTableRow(_testdata[i]);
		}
		
		html = "<table border=1>\n" + html + "\n</table>";
		return html;
	}
	
	
	_self.createTableRow = function (teststr) {
		html = "";
		
		html += "<td>"+teststr+"</td>\n";
		geo = geoparse.parseGeo(teststr);
		if (geo == null) {
			html += '<td colspan="2">null</td>';
		} else {
			html += "<td>"+geo[0]+"</td>\n";
			html += "<td>"+geo[1]+"</td>\n";
			//html += "<td>"+geo+"</td>\n";
		}
		html = "<tr>"+html+"</tr>";
		return html;
	}
	
	
	return _self;
}());