var storage = (function () {


	var PARENTSHARECODE = "parent_sharecode";
	var SHARECODE = "sharecode";
	var MODIFIED = "lastModified";
	var CREATED = "created";
	var VERSION = "version";

	var WS_BASE = "../ws";
	var WS_BASE = "http://vafe.net/geo/ws"; // ToDo-Release: Revert
	var WS_GROUP = WS_BASE+"/groups";
	var WS_SET = WS_BASE+"/set";  // DEL

	var _self = {};


	_self.setDefaultValues = function (org, defaultValue) {
		return org;
	}


	_self.getAllLocalSets = function () {
		var store = amplify.store("localSets");
		return store;
	}
	
	_self.storeSet = function (index, set, onFinished, onFail) {
		if (set[SHARECODE]) {
			set[MODIFIED] = new Date().getTime();
			_self._updateSharedSet(index, set, 
				function (set) {
					get_set_from_WS

					_self._storeSetLocally(index, set, onFinished);
				}, 
				function (e) {
					if (local_out_of_sync)
						alert("Local out of sync. Fix this!");

					if(onFail) 
						onFail(e);
				});
		} else {
			set[MODIFIED] = new Date().getTime();
			_self._storeSetLocally(index, set, onFinished);
		}

	}

	_self._storeSetLocally = function(index, set, onFinished) {
		var store = amplify.store("localSets");

		if (index>=0) {
			var dbg_set = store.sets[index];
			// remove set from old position
			store.sets.splice(index, 1);
		}

		// Add new set at first position, and save locally
		store.sets.unshift(set);
		amplify.store("localSets", store);

		// Call the callback with the stored set
		onFinished(set);
	}


	// ============
	//  GROUP CRUD
	// ============

	_self.getSharedGroup = function (groupId, onFinished, onFail) {
		var shareCode;
		var result = undefined;
		var url = WS_GROUP + "/" + encodeURIComponent(groupId);
		var returnVal = $.getJSON(url)
			.done( function (data)
			{

				onFinished(data);
			})
			.fail( function (jqxhr, textStatus, error ) {
				var err = textStatus + ", " + error;
				alert( "Request Failed: " + err );
				console.log( "Request Failed: " + err );
				onFail(err);
			});
	}

	_self.createNewShare = function (group, onFinished, onFail) {
		var request = $.ajax({
			url: WS_GROUP,
			type: "post",
			data: JSON.stringify(group)
		});
		request.done( function (data) {
			alert("OK: "+data);
			var result = data;
			//set['sharecode'] = result;
			onFinished(data);
		})
		request.fail( function (jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			alert( "DBG: Request Failed: " + err );
			window.console && console.log( "Request Failed: " + err );
			onFail(err);
		});
		return shareCode;
	}

	/** Creates a new share of the set.
	* 
	* If the set has already been shared, a new share code is created (forked).
	*/
	_self.createShare = function (index, set, onFinished, onFail) {
		_self._createSharedSet(index, set, onFinished, onFail);
	}

	_self.getSharedSet = function (shareCode, onFinished, onFail) {
		var shareCode;
		var result = undefined;
		var url = WS_SET + "/" + encodeURIComponent(shareCode);
		var returnVal = $.getJSON(url)
			.done( function (data)
			{
				onFinished(data);
			})
			.fail( function (jqxhr, textStatus, error ) {
				var err = textStatus + ", " + error;
				alert( "Request Failed: " + err );
				console.log( "Request Failed: " + err );
			});
	}


	_self._createSharedSet = function (index, set, onFinished, onFail) {
		// Set meta data
		set[MODIFIED] = new Date().getTime();
		
		if (set[SHARECODE]) {
			set[PARENTSHARECODE] = set[SHARECODE]+"_v"+set[VERSION];
			index = -1;  // New set is created. Don't overwrite existsing set
			set[CREATED] = set[MODIFIED];
		}

		var request = $.ajax({
	        url: WS_SET,
	        type: "post",
	        data: JSON.stringify(set)
	    });
		request.done( function (data) {
			alert("Created new share: "+data);
			var resultSet = data;
			// Store the set locally as well
			_self._storeSetLocally(index, resultSet, onFinished);
		})
		request.fail( function (jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			alert( "DBG: Request Failed: " + err );
			window.console && console.log( "Request Failed: " + err );
			onFail(err);
		});


		
	}

	_self._updateSharedSet = function (set, onFinished, onFail) {
		set[VERSION]++;
		set[MODIFIED] = new Date().getTime();

		var request = $.ajax({
	        url: WS_SET,
	        type: "post",
	        data: JSON.stringify(set)
	    });
		request.done( function (data) {
			alert("Created new share: "+data);
			var result = data;
			set[SHARECODE] = result;
			// Store the set locally as well
			_self._storeSetLocally(index, set, onFinished);
		})
		request.fail( function (jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			alert( "DBG: Request Failed: " + err );
			window.console && console.log( "Request Failed: " + err );
			onFail(err);
		});
	}
	
	
	return _self;
}());
