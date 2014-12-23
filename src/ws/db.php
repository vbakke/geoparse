<?php

require "db_conf.php";

$NL = "<br/>\n";
$debugMode = true&&false;


$TestDB = true&&false;
function TestModuleDB() {
	global $NL;
	
	
	// GET
	$row = getSet("aa");
	print "Row: [".$row['ShareCode']."] v".$row['Version'].": ".$row['Json'].$NL;
/*
	// CREATE
	$shareCode = rand(10, 99);
	print "Create: ".$shareCode.$NL;
	$set = array("set" => "{set: [$shareCode, 22, 33, 44], label: 'My test'}",
			"CreatedIp" => "127.0.0.1",
			"CreatedPos" => "32 V");
	$jsonSet = json_encode($set);

	print "JSON: ".$jsonSet.$NL;

	$result = createSet($jsonSet);
	print "CREATE: returned: ".$result.$NL;
*/
	print "Random Key".$NL;
	print "Rnd U, 3, '': ".randomKey(1, 3).$NL;
	print "Rnd U, 5, '': ".randomKey(1, 5).$NL;
	print "Rnd L, 3, '': ".randomKey(0, 3).$NL;
	print "Rnd L, 3, 'S': ".randomKey(0, 3, "S").$NL;
	print "Rnd L, 3, 'For lang': ".randomKey(0, 3, "For lang").$NL;

	print "Done Testing.".$NL.$NL;
	
}

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

/*
*/
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

/*
*/
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

function randomKey($case, $maxlength, $base="") {
	$str = $base;

	for ($i=strlen($base); $i<$maxlength; $i++) {
		$str = $str . randomChar($case);
	}
	return $str;
}

function randomChar($case) {
	$randBaseLowerCase = "23456789abcdefghijkmnrty";
	$randBaseUpperCase = "23456789ABDEFGHJKLMNPQRSTUVWXYZ";
	$randBase = array(0 => $randBaseLowerCase, 1 => $randBaseUpperCase);

	$max = strlen($randBase[$case])-1;

	return $randBase[$case][rand(0, $max)];
}

function q($str) {
	return "'".str_replace("'", "''", $str)."'";
}
?>