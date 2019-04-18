<?php
$NL = "<br/>\n";

$config = parse_ini_file("../conf/config.ini");

$debugMode = false;

$db_host = $config["Host"];
$db_db = $config["DB"];
$db_u = $config["Usr"];
$db_p = d($config["Pw"]);
$db_tb_pre = $config["TablePrefix"];
$db_key_max = ($config["KeyMax"]) ? intval($config["KeyMax"]) : 9999;
$environment = strtoupper($config["Environment"]);
$mysqlDatetimeformat = "Y-m-d H:i:s";

	if ($debugMode) {
		print "Testing to '".$db_db."' on ".$db_host." using ".$db_u."  ".$NL;
	}


$TestDB = true&&false;

$dbSchema = "vafenjix_vafe";
$table = array("groups" => $dbSchema.".".$db_tb_pre."Groups"
				,"locations" => $dbSchema.".".$db_tb_pre."Locations"
				);

$shareCodePrefix = "@";
				

function TestModuleDB() {
	global $NL;
	
	print "Start:".$NL;
	// Random Key
	print "Random Key: ".randomKey(3).$NL;
	print "Random Key: ".randomKey(3).$NL;
	print "Random Key: ".randomKey(5).$NL.$NL;
	// GET
	$group = getGroup("1001-1");
	print "Group: [".$group['groupId']."] Code ".$group['groupCode'].": ".$group['groupName'].$NL;
	foreach ($group["locations"] as $location) {
		print " - Location ".$location["label"].$NL;
	}
	

	print "Done Testing.".$NL.$NL;
	
}

// 2016-version start

// --------------------
// GROUP-ID functions
// --------------------

// Lookup shareCode/groupId
function lookupGroupIds($con, $groupCode) {
	global $table, $NL, $debugMode;
	
	if ($debugMode)
		print "lookupGroupIds(".$groupCode.")".$NL;

	$ids = null;
	// ShareCodes cannot start with a digit
	if (!ctype_digit(left($groupCode,1))) {
		// Validated against DB
		$ids = getIdsFromShareCode($con, $groupCode);
		
		if ($debugMode)
			print "lookupGroupIds() '".$groupCode."' is a SHARECODE for ids: ".join(", ", $ids).$NL;
		return $ids;
	} else {
		// Split id-pair into ids
		$ids = getIdsFromGroupId($groupCode);
		if ($debugMode)
			print "lookupGroupIds() Split '".$groupCode."' into: ".join(", ", $ids).$NL;

		// Validate against DB
		if (doesExistGroupIds($con, $ids)) {
			if ($debugMode)
				print "lookupGroupIds() '".$groupCode."' is a valid id-pair: ".join(", ", $ids).$NL;
			return $ids;
		} else {
			if ($debugMode)
				print "lookupGroupIds() '".$groupCode."' is a NOT valid id-pair: ".join(", ", $ids).$NL;
			return null;
		}
	}
	return null;
}

function doesExistGroupIds($con, $ids) {
	global $table, $NL, $debugMode;
	
	$vars = array("groupRandId" => $ids[0], "groupRowId" => $ids[1]);

	$sql = "SELECT 1 as DoesExist FROM ".$table['groups']." WHERE deletedDate is null AND groupRandId = '$(groupRandId)' AND groupRowId = '$(groupRowId)' ";
	$sql = replaceFields($con, $sql, $vars);
	if ($debugMode)
		print $NL."SQL does ID exist: ".$sql.$NL;
	$result = executeSql($sql, $con);
	
	if ($result !== FALSE) {
		$group = mysqli_fetch_assoc($result);
		if ($group)
			return true;
	}
	return false;
}

function getIdsFromGroupId($groupId) {
	$ids = explode("-", $groupId, 2);

	$ids[0] = ctype_xdigit($ids[0]) ? intval($ids[0], 16) : -1;
	$ids[1] = ctype_digit($ids[1]) ? intval($ids[1]) : -1;

	return $ids;
}

// --------------------
// SHARE_CODE functions
// --------------------

function isShareCodeFree($con, $shareCode) {
	global $NL, $debugMode;
	if ($debugMode) {
		print "DBG: isShareCodeFree($shareCode)".$NL;
	}
	$ids = getIdsFromShareCode($con, $shareCode);
	if ($debugMode) {
		print "DBG: isShareCodeFree($shareCode) DONE".$NL;
	}
	if (!$ids) {
		return true;
	} else {
		return false;
	}
}
function getFreeShareCode($con, $length, $prefix="") {
	global $NL, $debugMode;

	if (!$length)
		$length = 4;
	
	#print "DBG: getFreeShareCode() length $length".$NL;

	$attempts = 5;
	$maxlength = 3*($length+1);
	
	for ($len=$length; $len<$maxlength; $len++) {  //Safe-guard to avoid infinit loops
		#print "DBG: getFreeShareCode() loop 1: len = $len".$NL;
		for ($i=0; $i<$attempts; $i++) {
			#print "DBG: getFreeShareCode() loop 2: i = $i".$NL;
			$shareCode = randomKey($len, $prefix);
			#print "DBG: got ShareCode() $shareCode".$NL;

			if (isShareCodeFree($con, $shareCode)) {
				if ($debugMode) {
					print "DBG: getFreeShareCode() returns; $shareCode".$NL;
				}

				return $shareCode;
			} 
		}
	}
	return null;
}

function getIdsFromShareCode($con, $shareCode) {
	global $table, $NL, $debugMode;
	
	$vars['shareCode'] = $shareCode;

	$sql = "SELECT groupRandId, groupRowId FROM ".$table['groups']." WHERE deletedDate is null AND shareCode = '$(shareCode)' ORDER BY CreatedDate DESC";
	$sql = replaceFields($con, $sql, $vars);
	
	if ($debugMode)
		print $NL."GROUP SQL testing shareCode: ".$sql.$NL;
	$result = executeSql($sql, $con);
	#print "RESULT:".$result;
	$ids = [];
	if ($result !== FALSE) {
		$group = mysqli_fetch_assoc($result);
		if ($group) {
			$ids = array($group['groupRandId'],$group['groupRowId']);
		}
	}
	return $ids;
}


// -------------
// --- GROUP ---
// -------------


// --------------------
// READ GROUP - GET :id
//
function getGroup($groupCode) {
	global $table, $NL, $debugMode, $mysqlDatetimeformat;

	$con = connectDb();

	// Lookup (and validate) shareCode / groupId
	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		throw new GeoException("ERROR: Not found group $groupCode", 404);
	}
	
	if ($debugMode)
		print "Getting '".$groupCode."': IDs: '".$ids[0]."' - '".$ids[1]."'".$NL;
	$groupRowId = $ids[1];
	
	$group = getGroupDB($con, $groupRowId);

	closeConnection($con);
	return $group;
}

function getGroupDB($con, $groupRowId) {
	global $table, $NL, $debugMode;

	$vars = ['groupRowId'=>$groupRowId];
	// --- Get Group ---
	$sql = "SELECT CONCAT('0', Hex(groupRandId), '-', groupRowId) as groupId, shareCode, name, description FROM ".$table['groups']." WHERE deletedDate is null AND groupRowId = '$(groupRowId)' ORDER BY CreatedDate DESC Limit 1";
	$sql = replaceFields($con, $sql, $vars);
	
	if ($debugMode)
		print $NL."GROUP SQL: ".$sql.$NL.$NL;
	$result = executeSql($sql, $con);
	if ($debugMode)
		print "SQL executed: ".$NL;
	if ($result !== FALSE) {
		if ($debugMode)
			print "SQL had values ".$NL;

		$group = mysqli_fetch_assoc($result);
		
		if ($group) {
			if ($debugMode)
				print "Call getLocDB ".$NL;
			$locations = getLocationsDB($con, $groupRowId);
			if ($locations) {
				$group["locations"] = $locations;
			}
			if ($debugMode)
				print "SQL retunring group ".$NL;

			return $group;
		}
	}

}

//--------------------
// CREATE GROUP - POST
//
function createGroup($jsonGroup) {
	global $table, $db_key_max, $NL, $debugMode;
	if ($debugMode) print "createGroup(): ".$jsonGroup.$NL;
	$groupObj = json_decode($jsonGroup, true);
	$con = connectDb();
	
	
	$groupObj['groupRandId'] = 0;
	$groupObj['groupRandId'] = rand(0, $db_key_max);
	$groupObj['createdIp'] = $_SERVER['REMOTE_ADDR'];
	if (!isset($groupObj->shareCode)) {
		$groupObj['shareCode'] = getFreeShareCode($con, 2);
	}


	// -- Create Group ---
	$sql = "INSERT INTO ".$table['groups']." ".
			"(groupRandId, shareCode, name, description, createdIp) ".
			"VALUES ($(groupRandId), '$(shareCode)', '$(name)', '$(description)', '$(createdIp)')";
	$sql = replaceFields($con, $sql, $groupObj);
	if ($debugMode) print "SQL: ".$sql.$NL;
	
	$result = executeSql($sql, $con);
	$groupRowId = mysqli_insert_id($con);
	
	// -- Create Locations ---
	foreach ($groupObj["locations"] as $location) {
		$sql = "INSERT INTO ".$table['locations']." ".
				"(groupRowId, label, lat, lng) ".
				"VALUES (".$groupRowId.", '$(label)', '$(lat)', '$(lng)')";  // $groupRowId cannot have SQL injections. Can be inserted directly
		$sql = replaceFields($con, $sql, $location);
		if ($debugMode) print "SQL: ".$sql.$NL;
		
		$result = executeSql($sql, $con);
	}
	
	$groupObj = getGroupDB($con, $groupRowId);
	
	closeConnection($con);

	return $groupObj;
}

//-------------------
// UPDATE GROUP - PUT
//
function updateGroup($groupCode, $jsonGroup) {
	global $table, $NL, $debugMode, $mysqlDatetimeformat;
	
	#print "updateGroup($groupCode): ";
	#var_dump($jsonGroup);
	if (!$jsonGroup)
		throw new GeoException("No data", 400);
	$wsGroup = json_decode($jsonGroup, true);
	$wsGroup['updatedIp'] = $_SERVER['REMOTE_ADDR'];
	$wsGroup['updatedDate'] = date($mysqlDatetimeformat);
	
	$con = connectDb();

	// Lookup (and validate) shareCode / groupId
	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		throw new GeoException("ERROR: Not found group $groupCode", 404);
	}
	
	if ($debugMode)
		print "Getting '".$groupCode."': IDs: '".$ids[0]."' - '".$ids[1]."'".$NL;
	$groupRowId = $ids[1];

	// Get current Group from DB
	$dbGroup = getGroupDB($con, $groupRowId);

	
	// Create assoc, with locationId as key. Using 'NULL' for missing keys.
	$locationsDB = createHash($dbGroup['locations'], 'locationId');  // from DB
	$locationsWS = createHash($wsGroup['locations'], 'locationId');  // received in WS

	// Create locations without locationsId.
	$isEqual = true;
	if (array_key_exists('NULL', $locationsWS)) {
		$isEqual = false;
		foreach ($locationsWS['NULL'] as $locationWS) {
			if ($debugMode) print "CREATE LOCATION ".$locationWS['label'].".".$NL;
			insertLocationDB($con, $groupRowId, $locationWS);
		}
	}
	
	// Check all locations already in the DB
	foreach ($locationsDB as $locationId => $locationDB) {
		//if ($debugMode) print "Testing location $locationId".$NL;
		if (array_key_exists($locationId, $locationsWS)) {
			// Location, exists in both. Update if different.
			if (!isLocationEqual($locationsWS[$locationId], $locationsDB[$locationId])) {
				$locationsWS[$locationId]['updatedDate'] = date($mysqlDatetimeformat);
				if ($debugMode) print "Location $locationId for $groupRowId has changed. Updates.";
				updateLocationDB($con, $groupRowId, $locationId, $locationsWS[$locationId]);
				$isEqual = false;
			} else {
				if ($debugMode) print "Location $locationId for $groupRowId is still equal. Do nothing.".$NL;
			}
		} else {
			// DB location not amongst inut from WS. Delete it.
			if ($debugMode) print "Removed location! Deleting".$NL;
			deleteLocationDB($con, $groupRowId, $locationId);
		}
	}
	
	// Update Group's head if anything was updated
	if (!isGroupHeadEqual($dbGroup, $wsGroup))
		$isEqual = false;
	
	if (!$isEqual)
	{
		if ($debugMode) print "Group has changed. Updating group head".$NL;
		updateGroupDb($con, $groupRowId, $wsGroup);
		$updated = true;
	} else {
		if ($debugMode) print "Group has NOT been changed. Nothing to update".$NL;
		$updated = false;
	}
	
	closeConnection($con);
	
	return $updated;
}

function updateGroupDB($con, $groupRowId, $group) {
	global $table, $debugMode, $NL;
	
	$vars = $group;
	$vars['groupRowId'] = $groupRowId;

	// -- Create Location ---
	$sql = "UPDATE ".$table['groups']." ".
			"SET updatedDate = now() ".
			"  , name = '$(name)' ".
			"  , description = '$(description)' ".
			"  , updatedIp = '$(updatedIp)' ".
			"  , updatedDate = '$(updatedDate)' ".
			"WHERE deletedDate is null AND groupRowId = $(groupRowId)  "; 
	
	$sql = replaceFields($con, $sql, $vars);
	if ($debugMode) print "UPDATE Group SQL: ".$sql.$NL;
		
	$result = executeSql($sql, $con);
	
	$rows = mysqli_affected_rows($con);

	$success = ($rows === 1);
	return $success;
}



//-------------
// DELETE GROUP 
//
function deleteGroup($groupCode) {
	global $NL, $debugMode;
	
	$con = connectDb();

	// Lookup (and validate) shareCode / groupId
	$ids = lookupGroupIds($con, $groupCode);
	if ($ids == null || !$ids) {
		throw new GeoException("ERROR: Not found group $groupCode", 404);
	}
	
	if ($debugMode)
		print "Deleting '".$groupCode."': IDs: '".$ids[0]."' - '".$ids[1]."'".$NL;
	$groupRowId = $ids[1];
	
	$deleted = deleteGroupDB($con, $groupRowId);

	closeConnection($con);

	return $deleted;
}

function deleteGroupDB($con, $groupRowId) {
	global $table, $debugMode, $NL;
	
	$vars = ['groupRowId'=>$groupRowId];
	
	// -- Create Location ---
	$sql = "UPDATE ".$table['groups']." ".
			"SET deletedDate = now() ".
			"WHERE deletedDate is null AND groupRowId = ".$groupRowId."  "; 
	
	$sql = replaceFields($con, $sql, $vars);
	if ($debugMode) print "DELETE Group SQL: ".$sql.$NL;
		
	$result = executeSql($sql, $con);
	
	$rows = mysqli_affected_rows($con);

	$success = ($rows === 1);
	return $success;
}




// --------------------------
// READ GROUP LOCATION - POST   -  IMPLEMENTATION NOT COMPLETE (Is it needed?)
function getGroupLocations($groupCode) {
	global $table, $NL, $debugMode;

	$con = connectDb();

	// Lookup (and validate) shareCode / groupId
	$ids = lookupGroupIds($con, $groupCode);
	$groupRowId = $ids[1];

	if ($debugMode)
		print "Getting locations for '".$groupId."': IDs: '".$ids[0]."' - '".$ids[1]."'".$NL;
	
	$locations = getLocationsDB($con, $groupRowId);
	
	closeConnection($con);
	return Array('statuscode'=>201, 'locations'=>$locations);
}
// --------------------------
// GET: GROUP LOCATION - POST   
// --------------------------
function getGroupLocation($groupCode, $locationId) {
	global $table, $NL, $debugMode;

	$con = connectDb();

	// Lookup (and validate) shareCode / groupId
	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		$status = ['statuscode'=>404, 'statusmessage'=>"Group Not found"];
	} else {
		$groupRowId = $ids[1];

		if ($debugMode)
			print "Getting location ".$locationId." for '".$groupId."': IDs: '".$ids[0]."' - '".$ids[1]."'".$NL;
		
		$location = getLocationDB($con, $groupRowId, $locationId);
	}
	closeConnection($con);

	return $location;
}

function getLocationDB($con, $groupRowId, $locationId) {
	$locations = getLocationsDB($con, $groupRowId, $locationId);
	if ($locations)
		return $locations[0];
}
function getLocationsDB($con, $groupRowId, $locationId=null) {
	
	global $table, $debugMode, $NL;
	
	$vars = ['groupRowId'=>$groupRowId];
	// -- Create Location ---
	$sql = "SELECT locationId, label, lat, lng FROM ".$table['locations']." WHERE deletedDate is null AND groupRowId = $(groupRowId) ";  
	// If locationId is spesified, include
	if ($locationId !== null) {
		$vars['locationId'] =$locationId;
		$sql .= " AND locationId = $(locationId) ";  
	}
	
	$sql = replaceFields($con, $sql, $vars);
	if ($debugMode) print "SQL: ".$sql.$NL;
	
	$result = executeSql($sql, $con);
	
	$locations = [];
	while ($location = mysqli_fetch_assoc($result)) {
        array_push($locations, $location);
    }
    mysqli_free_result($result);
	
	return $locations;
}

// ----------------------------
// CREATE GROUP LOCATION - POST
// ----------------------------
function createGroupsLocation($groupCode, $jsonLocation) {
	global $table, $NL, $debugMode;
	if ($debugMode) print "createLocation(".$groupCode."): ".$jsonLocation.$NL;
	$location = json_decode($jsonLocation, true);

	if ($location == null) {
		if ($debugMode)
			print "ERROR: Missing location".$NL;
		return Array('statuscode'=>400, 'statusmessage'=>"ERROR: Missing location data");
	}
	
	$con = connectDb();

	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		// Return 404
		return Array('statuscode'=>404, 'statusmessage'=>"ERROR: Not found: group");
	}
	$groupRowId = $ids[1];
	
	$locationId = insertLocationDB($con, $groupRowId, $location);
	
	closeConnection($con);
	return Array('statuscode'=>201, 'locationId'=>$locationId);
}

function insertLocationDB($con, $groupRowId, $location) {
	global $table, $debugMode, $NL;
	
	// -- Create Location ---
	$sql = "INSERT INTO ".$table['locations']." ".
			"(groupRowId, label, lat, lng) ".
			"VALUES (".$groupRowId.", '$(label)', '$(lat)', '$(lng)')";  // $groupRowId cannot have SQL injections. Can be inserted directly
	if ($debugMode) {
		print "Insert Location: ";
		var_dump($location);
	}
	$sql = replaceFields($con, $sql, $location);
	if ($debugMode) print "SQL: ".$sql.$NL;
		
	$result = executeSql($sql, $con);
	
	$locationId = mysqli_insert_id($con);
	return $locationId;
}

// ------------------------------
// UPDATE GROUP LOCATION - UPDATE
// ------------------------------
function updateLocation($groupCode, $locationId, $jsonLocation) {
	global $debugModeD1, $NL;
	
	if ($debugModeD2) print "updateLocation(".$groupCode."): ".$jsonLocation.$NL;
	$location = json_decode($jsonLocation, true);

	if ($location == null) {
		throw new GeoException("No location data", 201);
	}
	$con = connectDb();

	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		throw new GeoException("ERROR: Not found: group", 404);
	}
	$groupRowId = $ids[1];
	
	$dbLocation = getLocationDB($con, $groupRowId, $locationId);
	
	
	if (!isLocationEqual($dbLocation, $location)) {
		if ($debugModeD3) print "Location has changed, updates database.".$NL;
		$updated = updateLocationDB($con, $groupRowId, $locationId, $location);
		if (!$updated) {
			if ($debugModeD4) print "Update failed!".$NL;
			throw new GeoException("ERROR: Update: Location not found", 404);
		}
		closeConnection($con);
		return true;
	} else {
		if ($debugModeD5) print "Location has NOT been changed. Nothing to update".$NL;
		closeConnection($con);
		return false;
	}
}

function updateLocationDB($con, $groupRowId, $locationId, $location) {
	global $table, $debugMode, $NL;
	
	// -- Build SQL query ---
	$location['groupRowId'] = $groupRowId;
	$location['locationId'] = $locationId;  
	$sql = "UPDATE ".$table['locations']." ".
			"SET  label='$(label)', lat='$(lat)', lng='$(lng)', updatedDate = '$(updatedDate)' ".
			"WHERE deletedDate is null AND groupRowId = $(groupRowId) AND locationId = $(locationId) ";  

	if ($debugMode) {
		print "Update Location $locationId in group: $groupRowId";
		//var_dump($location);
	}
	$sql = replaceFields($con, $sql, $location);
	if ($debugMode) print "SQL: ".$sql.$NL;
		
	$result = executeSql($sql, $con);
	
	$count = mysqli_affected_rows($con);

	return ($count == 1)?true:false;

}

// -------------------------------


function createHash($array, $fieldname) {
	global $NL, $debugMode;
	$hash = [];

	foreach ($array as $element) {
		if (array_key_exists($fieldname, $element)) {
			#print "DBG: Adding: ".$element[$fieldname].$NL;
			$hash[$element[$fieldname]] = $element;
		} else {
			if (!array_key_exists("NULL", $hash))
				$hash['NULL'] = [];
			#print "DBG: Adding: NULL".$NL;
			array_push($hash['NULL'], $element);
		}
	}
	return $hash;
}

function isGroupHeadEqual($groupA, $groupB) {
	/*
	print "DBG: isGroupHeadEqual(): A:";
	var_dump($groupA);
	print "DBG: isGroupHeadEqual(): B:";
	var_dump($groupB);

	if ($locationA['name'] !== $locationB['name']
		|| $locationA['description'] !== $locationB['description']
		)
		return false;
	else
		return true;
	*/
}



function isLocationEqual($locationA, $locationB) {
	global $debugMode, $NL;
	
	#print "DBG: isLocationEqual(): A:";
	#var_dump($locationA);
	#print "DBG: isLocationEqual(): B:";
	#var_dump($locationB);
	if ($locationA['label'] !== $locationB['label']
		|| abs(floatval($locationA['lat']) - floatval($locationB['lat'])) > 0.0000001
		|| abs(floatval($locationA['lng']) - floatval($locationB['lng'])) > 0.0000001
		) 
	{
		return false;
	}
	
	return true;
}

// ------------------------------
// DELETE GROUP LOCATION - DELETE
// ------------------------------
function deleteLocation($groupCode, $locationId) {
	global $table, $NL, $debugMode;
	if ($debugMode) print "deleteLocation(".$groupCode.", ".$locationId.")".$NL;

	$con = connectDb();

	$ids = lookupGroupIds($con, $groupCode);
	if (!$ids) {
		// Return 404
		return Array('statuscode'=>404, 'statusmessage'=>"ERROR: Not found: group");
	}
	$groupRowId = $ids[1];
	
	$success = deleteLocationDB($con, $groupRowId, $locationId);
	
	closeConnection($con);
	
	if ($success)
		return Array('statuscode'=>200);
	else
		return Array('statuscode'=>404, 'statusmessage'=>"ERROR: Not found: location");
}

function deleteLocationDB($con, $groupRowId, $locationId) {
	global $table, $debugMode, $NL;
	
	$vars = ['groupRowId'=>$groupRowId, 'locationId'=>$locationId];
	
	// -- Create Location ---
	$sql = "UPDATE ".$table['locations']." ".
			"SET deletedDate = now() ".
			"WHERE deletedDate is null AND groupRowId = ".$groupRowId." AND  locationId = ".$locationId." "; 
	
	$sql = replaceFields($con, $sql, $vars);
	if ($debugMode) print "DELETE Location SQL: ".$sql.$NL;
		
	$result = executeSql($sql, $con);
	
	$rows = mysqli_affected_rows($con);

	$success = ($rows === 1);
	return $success;
}

//-------------------
// Database functions
//-------------------

function replaceFields($con, $sql, $set) {
	global $NL;

	$closeConnection = false;

	if ($con == null)  {
		$con = connectDb();
		$closeConnection = true;
	}
	
	foreach ($set as $field => $value) {
		if (! is_array($value) ) {
			#print "DBG: replaceFields() SQL inject ".$field."=".$value." -> (".mysqli_real_escape_string ($con, $value).")".$NL;
			$sql = str_replace("$(".$field.")", mysqli_real_escape_string ($con, $value), $sql);
		}
	}
	if ($closeConnection) {
		closeConnection($con);
	}
	#print "DBG: replaceFields() SQL injected returned ".$sql.$NL;
	return $sql;
}


function connectDb() {
	global $debugMode;
	global $NL;
	global $db_host;
	global $db_db;
	global $db_u;
	global $db_p;
	
	if ($debugMode) {
		print "Connecting to '".$db_db."' on ".$db_host." using ".$db_u." ".$NL;
	}

	$con = mysqli_connect($db_host, $db_u, $db_p, $db_db);
	
	if (mysqli_connect_errno()) {
		print "Failed to connect to MySQL: " . mysqli_connect_error();
	} else {
		if ($debugMode) {
			print "Connected".$NL;
		}
	}
	
	return $con;
}
function closeConnection($con) {
	mysqli_close($con);
}

function executeSql($sql, $con=null) {
	global $NL;
	$closeConnection = false;

	if ($con == null)  {
		$con = connectDb();
		$closeConnection = true;
	}

	$result = mysqli_query($con, $sql);

	if ($result === FALSE) {
		print "Failed to execute SQL: " . mysqli_error($con).$NL;
	} 
	
	if ($closeConnection) {
		closeConnection($con);
	}
	
	return $result;
}


function randomKey($maxlength, $prefix="") {
	global $NL;
	$str = $prefix;
	#print "DBG: randomKey(): max: $maxlength, prefix: $prefix".$NL;
	$randBaseDigits = "23456789";
	$randBaseUpperCase = "ABDEFGHJKLMNPQRSTUVWXYZ";
	//$randBaseLowerCase = "abcdefghijkmnrty";
	//$randBaseDigits = "23";
	//$randBaseUpperCase = "AB";
	$randBase = array(0 => $randBaseDigits, 1 => $randBaseUpperCase);
	$digitCount = strlen($randBaseDigits);
	$fullCount = $digitCount + strlen($randBaseUpperCase);
	#print 'DBG: randomKey() get Char'.$NL;

	$str = $str . randomChar($randBase, false);
	$useDigit = null;
	$useDigitPrevious = null;
	$useSameAgain = false;
	#print "0:$str:".$NL;
	for ($i=1; $i<$maxlength; $i++) {
		#print "Loop $i".$NL;
		$useDigitPrevious = $useDigit;
		// Find random type, unless we must use same type again. However, always change first time.
		if ($useSameAgain !== true || $useDigit === null) {
			$useDigit = (rand(0, $fullCount) < $digitCount) ? 1 : 0;
			#print "Swapped from ".$useDigitPrevious." to ".$useDigit.$NL;
		} 
		// Only use same again, if we changed type
		$useSameAgain = false;
		if ($useDigit && $useDigitPrevious===null)  {
			#print "Number first time. Bruk samme".$NL;
			$useSameAgain = true;
		} else if ($useDigit !== $useDigitPrevious && $useDigitPrevious!==null) {
			#print "Byttet. Bruke samme.".$NL;
			$useSameAgain = true;
		}
		
		#print "Use same again: ";var_dump($useSameAgain);
		$str = $str . randomChar($randBase, $useDigit);
		#print "$i:$str: Next: use same:";var_dump($useSameAgain);
	}
	return $str;
}

function randomChar($randBase, $useDigit) {
	#print "DBG: randomChar()"
	$type = ($useDigit) ? 0 : 1;
	$max = strlen($randBase[$type])-1;

	return $randBase[$type][rand(0, $max)];
}

// quote
function q($str) {
	return "'".str_replace("'", "''", $str)."'";
}
function left($str, $len) {
	return substr($str, 0, $len);
}
function right($str, $len) {
	return substr($str, -$len);
}

function d ($str) {
	$str = preg_replace('/[^A-Za-z0-9+\/]/', '', $str);
	while (strlen($str) % 4 != 0) {
		$str = $str."=";
	}
	$str = base64_decode($str);
	return $str;
}

if ($TestDB) {
	TestModuleDB();
}



?>