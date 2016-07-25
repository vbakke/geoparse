<?php

require "db_conf.php";

$NL = "<br/>\n";
if ( !"debug")
	$debugMode = true;
else
	$debugMode = false;

$TestDB = true&&false;

$table = array("groups" => "vafe.".$db_tb_pre."Groups"
				,"locations" => "vafe.".$db_tb_pre."Locations"
				);


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
// SHARE_CODE functions
// --------------------

function isShareCodeFree($con, $shareCode) {
	global $NL;
	
	$ids = getIdFromShareCode($con, $shareCode);
	if (!$ids) {
		return true;
	} else {
		return false;
	}
}
function getFreeShareCode($con, $length, $prefix="") {
	global $NL;

	$attempts = 2;
	$maxlength = 2*$length;
	
	for ($len=$length; $len<$maxlength; $len++) {  //Safe-guard to avoid infinit loops
		for ($i=0; $i<$attempts; $i++) {
			$shareCode = randomKey($len, $prefix);
			
			if (isShareCodeFree($con, $shareCode)) {
				return $shareCode;
			} 
		}
	}
	return null;
}

function getIdFromShareCode($con, $shareCode) {
	global $table, $NL, $debugMode;
	
	$vars['shareCode'] = $shareCode;
	$sql = "SELECT groupRandId, groupRowId FROM ".$table['groups']." WHERE shareCode = '$(shareCode)' ORDER BY CreatedDate DESC";
	$sql = replaceFields($con, $sql, $vars);
	
	if ($debugMode)
		print $NL."GROUP SQL testing shareCode: ".$sql.$NL;
	$result = executeSql($sql, $con);
	
	if ($result !== FALSE) {
		$group = mysqli_fetch_assoc($result);
		if ($group)
			$ids = array($group['groupRandId'],$group['groupRowId']);
	}
	return $ids;
}


// --------------------
// READ GROUP - GET :id
// --------------------
function getGroup($groupId) {
	global $table, $NL, $debugMode;

	$con = connectDb();

	// Testing if groupId is a used ShareCode first
	$ids = getIdFromShareCode($con, $groupId);
	if (!$ids) {
		$ids = explode("-", $groupId, 2);
	}
	$set = array("groupRandId" => $ids[0], "groupRowId" => $ids[1]);

	// Try looking up 
	if ($debugMode)
		print "Searching for '".$groupId."': '".$ids[0]."' - '".$ids[1]."'".$NL;
	
	// --- Get Group ---
	$sql = "SELECT CONCAT(groupRandId, '-', groupRowId) as groupId, shareCode, name, description FROM ".$table['groups']." WHERE groupRowId = '$(groupRowId)' AND groupRandId = '$(groupRandId)' ORDER BY CreatedDate DESC Limit 1";
	$sql = replaceFields($con, $sql, $set);
	
	if ($debugMode)
		print $NL."GROUP SQL: ".$sql.$NL.$NL;
	$result = executeSql($sql, $con);
	if ($result !== FALSE) {
		$group = mysqli_fetch_assoc($result);
		
		// --- Get Locations ---
		$sql = "SELECT label, lat, lng FROM ".$table['locations']." WHERE groupRowId = '$(groupRowId)'";
		$sql = replaceFields($con, $sql, $set);
		
		if ($debugMode)
			print $NL."LOCATIONS SQL: ".$sql.$NL.$NL;
		$result = executeSql($sql, $con);
		$locations = array();

		while($location = mysqli_fetch_assoc($result)) {
			$location["lat"] = floatval($location["lat"]);
			$location["lng"] = floatval($location["lng"]);
			array_push($locations, $location);
		} 
		if ($locations)
			$group["locations"] = $locations;
	}

	closeConnection($con);
	return $group;
}

// -------------------
// CREATE GROUP - POST
// -------------------
function createGroup($jsonGroup) {
	global $table, $NL, $debugMode;
	if ($debugMode) print "createGroup(): ".$jsonGroup.$NL;
	$groupObj = json_decode($jsonGroup, true);

	$con = connectDb();

	$groupObj['groupRandId'] = rand(0, 99);
	$groupObj['createdIp'] = $_SERVER['REMOTE_ADDR'];
	if (!$groupObj['shareCode'])
		$groupObj['shareCode'] = getFreeShareCode($con, 2);


	
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
	
	closeConnection($con);

	// Tidy ID
	$groupObj["groupId"] = $groupObj["groupRandId"]."-".$groupRowId;
	unset($groupObj->$groupRandId);
	return $groupObj;
}

// 2016-version end




// Return the lastest version of a given shareCode
function getSet($shareCode) {
	global $NL, $debugMode;

	$set = array("ShareCode" => $shareCode);

	$con = connectDb();
	$sql = "SELECT ShareCode, Version, Json, UNIX_TIMESTAMP(CreatedTime) AS CreatedTime FROM vafe.geoSets WHERE ShareCode = '$(ShareCode)' ORDER BY Version DESC Limit 1";
	$sql = replaceFields($con, $sql, $set);
	
	$result = executeSql($sql, $con);
	
	$row = mysqli_fetch_array($result);
	closeConnection($con);
	return $row;
}

function createSet($jsonSet) {
	global $NL, $debugMode;
	if ($debugMode) print "createSet(): ".$jsonSet.$NL;
	$setObj = json_decode($jsonSet, true);

	if (array_key_exists('version', $setObj)) {
		if ($debugMode) print "Set.version: ".$setObj['Version'].$NL;
		if ($setObj['version'] != 1)
			throw new Exception("Cannot create a SET with version not equat to 1");
	}

	$shareCode = "S".strval(rand(10,99));
	$setObj['sharecode'] = $shareCode;
	$setObj['version'] = 1;

	$jsonSet = json_encode($setObj);

	$injects = array();
	$injects['ShareCode'] = $setObj['sharecode'];
	$injects['Version'] = $setObj['version'];
	$injects['CreatedIp'] = $_SERVER['REMOTE_ADDR'];
	$injects['Json'] = $jsonSet;


	$con = connectDb();
	$sql = "INSERT INTO vafe.geoSets ".
			"(ShareCode, Version, Json, CreatedIp, CreatedPos) ".
			"VALUES ('$(ShareCode)', $(Version), '$(Json)', '$(CreatedIp)', '$(CreatedPos)' )";
	$sql = replaceFields($con, $sql, $injects);
	if ($debugMode) print "createSet(), SQL: ".$sql.$NL;
	
	$result = executeSql($sql, $con);

	closeConnection($con);

	return $setObj;
}

function updateSet($jsonSet) {
	global $NL, $debugMode;
	if ($debugMode) print "updateSet(): ".$jsonSet.$NL;
	$setObj = json_decode($jsonSet, true);

	if (array_key_exists('Version', $setObj)) {
		if ($debugMode) print "Set.version: ".$setObj['Version'].$NL;
		if ($setObj['Version'] != 1)
			throw new Exception("Cannot create a SET with version not equat to 1");
	}

	$shareCode = "S".strval(rand(10,99));
	$injects = array();
	$injects['ShareCode'] = $shareCode;
	$injects['Version'] = 1;
	$injects['CreatedIp'] = $_SERVER['REMOTE_ADDR'];
	$injects['Json'] = $jsonSet;

	$con = connectDb();
	$sql = "INSERT INTO vafe.geoSets ".
			"(ShareCode, Version, Json, CreatedIp, CreatedPos) ".
			"VALUES ('$(ShareCode)', $(Version), '$(Json)', '$(CreatedIp)', '$(CreatedPos)' )";
	$sql = replaceFields($con, $sql, $injects);
	if ($debugMode) print "createSet(), SQL: ".$sql.$NL;
	
	$result = executeSql($sql, $con);

	closeConnection($con);
	return $shareCode;
}

function replaceFields($con, $sql, $set) {
	global $NL;
	foreach ($set as $field => $value) {
		//print "DBG: SQL inject ".$field."=".$value.$NL;
		$sql = str_replace("$(".$field.")", mysqli_real_escape_string ($con, $value), $sql);
	}
	return $sql;
}

if ($TestDB) {
	TestModuleDB();
}


function sqlSelect($con, $table, $keys=null, $where=null) {
	global $NL;
	
	$sql = makeSelectSql($table, $keys, $where);
	print "DBG: SQL: [".$sql."]".$NL;
	$result = executeSql($sql, $con);
	print "DBG: Result:".$NL;
	
	$i = 0;
	while($row = mysqli_fetch_array($result))
	{	
		$array[$i] = $row;
		#print "Row #".$i;
		#print ": [".$row['quakeId']."] ".$row['depth']." ".$row['locationText'];
		#print "<br>";
		$i++;
	}

	return $array;
}

function sqlStore($con, $table, $hash, $idName, $keys=null) {
	$result = sqlInsert($con, $table, $hash, $keys);
	if ($result === FALSE) {
		$insertError =  mysqli_error($con);
		$result = sqlUpdate($con, $table, $hash, $idName, $keys);
		if ($result === FALSE) {
			$updateError =  mysqli_error($con);
			
			print "DBG: Cannot store to DB: INSERT failed: '".$insertError."' and UPDATE failed: '".$updateError."'".$NL;
		}
	}
	return $result;
}

function sqlInsert($con, $table, $hash, $keys=null) {
	global $NL;
	
	print "DBG: sqlInsert(".$table.")".$NL;
	$sql = makeInsertSql($table, $hash, $idName, $keys);
	print "DBG: sqlInsert: ".$sql.$NL;
	$result = executeSql($sql, $con);
	
	if ($result != FALSE)
		print "DBG: Inserted.".$NL;
		
	return $result;
}

function sqlUpdate($con, $table, $hash, $idName, $keys=null) {
	global $NL;
	
	print "sqlUpdate(".$table.")".$NL;
	$sql = makeUpdateSql($table, $hash, $idName, $keys);
	print "sqlUpdate: ".$sql.$NL;
	$result = executeSql($sql, $con);
	
	if ($result != FALSE)
		print "Updated.".$NL;
	return $result;
}


function makeSelectSql($table, $keys=null, $where=null) {
	if ($keys == null) {    
		$columns = '*';
	} else {
		$columns = join(', ', $keys);
	}
	
	$sql = "SELECT ".$columns." FROM ".$table." ";
	if ($where) {
		$sql = $sql." WHERE ".$where;
	}

	return $sql;
}

function makeInsertSql($table, $hash, $keys=null) {
	if ($keys == null) {    
		$keys = array_keys($hash);
	}
	$i = 0;
	foreach ($keys as $key) {
		if (!is_numeric($key)) {
			$value = $hash[$key];
			if ($value == "")
				$value = "NULL";
			elseif (!is_numeric($value))
				$value = q($value);
			
			$insertKeys[$i] = $key;
			$insertValues[$i] = $value;
			$i += 1;
		}
	}
	
	$sql = "INSERT INTO ".$table." (".join(", ", $insertKeys).") VALUES (".join(", ", $insertValues).")";
	
	return $sql;
}

function makeUpdateSql($table, $hash, $idName, $keys=null) {
	if ($idName == null or !array_key_exists($idName, $hash)) {
		$errMsg = "makeUpdateSql() requires the id field '".$idName."' to be present in data hash";
		print $errMsg."<br/>\n";
		throw new Exception($errMsg);
	}
		
	if ($keys == null) {    
		$keys = array_keys($hash);
	}
	$i = 0;
	foreach ($keys as $key) {
		if (!is_numeric($key)) {
			$value = $hash[$key];
			if ($value == "")
				$value = "NULL";
			elseif (!is_numeric($value))
				$value = q($value);
			
			if ($key == $idName)
				$idValue = $value;
			$pair[$i] = $key."=".$value;
			$i += 1;
		}
	}
	
	$sql = "UPDATE ".$table." SET ".join(", ", $pair)." WHERE ".$idName."=".$idValue;
	
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
		print "Connecting to '".$db_db."'".$NL;
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
	
	if ($digit != 1 && $digit != 2)
		$digit = rand(0,1);

	$str = $str . randomChar(0);
	for ($i=1; $i<$maxlength; $i++) {
		$str = $str . randomChar($digit);
	}
	return $str;
}

function randomChar($digit) {
	$randBaseDigits = "23456789";
	$randBaseLowerCase = "abcdefghijkmnrty";
	$randBaseUpperCase = "ABDEFGHJKLMNPQRSTUVWXYZ";
	$randBaseLowerCase = "ab";
	$randBaseUpperCase = "AB";
	$randBase = array(0 => $randBaseDigits, 1 => $randBaseLowerCase, 2 => $randBaseUpperCase);

	if ($digit)
		$type = 0;
	else
		$type = 2;
	
	$max = strlen($randBase[$type])-1;

	return $randBase[$type][rand(0, $max)];
}

// quote
function q($str) {
	return "'".str_replace("'", "''", $str)."'";
}

?>