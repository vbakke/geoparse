<?php
require 'Slim/Slim.php';
require 'db.php';

class GeoException extends Exception { }
\Slim\Slim::registerAutoloader();


$NL = "<br/>\n";


$app = new \Slim\Slim(array(
    'debug' => false
));

if (new DateTime() < new Datetime("2016-09-30"))
	$app->response->headers->set('Access-Control-Allow-Origin', 'http://localhost');
$app->response->headers->set('Content-Type', 'application/json;charset=utf-8');


function safe_json($object) {
	if (!$object) {
		$object = array(errorCode => "NO_DATA", error => "No data");
	}
	return json_encode($object);
}



$app->get('/ping', function () {
	echo "Ping!";
});

$app->get('/hello/:name', function ($name) {
	echo "Hello! <br/>\n";
    echo "How are you, $name?";
});

// -------------------
// ROUTE: FREESHARECODE
// -------------------

$app->get('/freeShareCode/:shareCode', function ($shareCode) {
	global $NL;
	$row = array(free => isShareCodeFree(null, $shareCode));  // ToDo: Check if sharecode is used in db
	echo(safe_json($row));
});
$app->post('/freeShareCode', function () {
	global $NL;
	$free = getFreeShareCode(null, 2);
	
	$row = array(shareCode => $free);
	echo(safe_json($row));
});


// -----------
// ROUTE: GROUP
// -----------
function allOptions() {
	global $app;
	$app->response->headers->set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	$app->response()->setStatus(200);
}
$app->options('/groups/:groupId', function ($groupCode) {
	allOptions();
});

$app->get('/groups/:groupId', function ($groupCode) {
	global $app, $environment, $NL;
	//print "Searching for group: ".$groupCode.$NL;

	try {
		$result = getGroup($groupCode);
	} catch (Exception $e) {
		$app->response()->setStatus($e->getCode());
		echo($e->getMessage());
		return;
	}
	
	if ($result && strtoupper($environment) != "PROD")
		$result["environment"] = $environment;
	
	$app->response()->setStatus(200);
	echo(safe_json($result));
});

$app->post('/groups', function () {
	global $app, $environment, $NL;
	$request = \Slim\Slim::getInstance()->request();
	$body = $request->getBody();

	$result = createGroup($body);
	
	if ($result && strtoupper($environment) != "PROD")
		$result["environment"] = $environment;
	
	if ($result)
		$app->response()->setStatus(201);
	echo(safe_json($result));
});

$app->put('/groups/:groupId', function ($groupId) {
	global $app, $environment, $NL;
	$request = $app->request();
	$body = $request->getBody();

	try {
		$result = updateGroup($groupId, $body);
	} catch (Exception $e) {
		$app->response()->setStatus($e->getCode());
		echo($e->getMessage());
		return;
	}
	
	if ($result && strtoupper($environment) != "PROD")
		$result["environment"] = $environment;
	
	if ($result)
		$app->response()->setStatus(204);
	else
		$app->response()->setStatus(404);
	//echo(safe_json($result));
});

$app->delete('/groups/:groupId', function ($groupCode) {
	global $app, $environment, $NL;
	try {
		$result = deleteGroup($groupCode);
	} catch (GeoException $e) {
		$app->response()->setStatus($e->getCode());
		echo($e->getMessage());
		return;
	}
	if ($result)
		$app->response()->setStatus(204);
	else
		$app->response()->setStatus(404);
});

// ----------------------
// ROUTE: GROUP / LOCATION
// ----------------------


$app->options('/groups/:groupId/locations/:locationId', function ($groupCode, $locationId) {
	global $app;
	$app->response->headers->set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	$app->response()->setStatus(200);
});


$app->get('/groups/:groupId/locations/:locationId', function ($groupCode, $locationId) {
	global $app, $environment, $NL, $debugMode;
	
	$result = getGroupLocation($groupCode, $locationId);

	if ($result && strtoupper($environment) != "PROD")
		$result["environment"] = $environment;
	//$app->response()->setStatus($status['statuscode']);

	if ($result) {
		$app->response()->setStatus(200);
		echo(safe_json($result));
	} else {
		$app->response()->setStatus(404);
		echo "Not found";
	}
});


$app->post('/groups/:groupId/locations', function ($groupCode) {
	global $app, $environment, $NL, $debugMode;
	$request = \Slim\Slim::getInstance()->request();
	$body = $request->getBody();

	$status = createGroupsLocation($groupCode, $body);

	if ($debugMode) { 
		print "POST location ".$groupCode.": "; 
		var_dump($status); 
	}
	
	$locationId = $status['locationId'];
	if ($locationId) {
		$url = $app->request->getRootUri();
		$url .= $app->request->getResourceUri();
		$url .= "/".$status['locationId'];
		$app->response->headers->set("Location", $url);
		
		$result = getGroupLocation($groupCode, $locationId);
		if ($result && strtoupper($environment) != "PROD")
			$result["environment"] = $environment;
		
		echo(safe_json($result));
		}
	$app->response()->setStatus($status['statuscode']);
});


$app->put('/groups/:groupId/locations/:locationId', function ($groupCode, $locationId) {
	global $app, $NL, $debugMode;

	$request = \Slim\Slim::getInstance()->request();
	$body = $request->getBody();
	
	try {
		$result = updateLocation($groupCode, $locationId, $body);
	} catch (GeoException $e) {
		$app->response()->setStatus($e->getCode());
		echo($e->getMessage());
		return;
	}
	
	
	if ($result)
		$app->response()->setStatus(204);
	else
		$app->response()->setStatus(404);
});


$app->delete('/groups/:groupId/locations/:locationId', function ($groupCode, $locationId) {
	global $app, $NL, $debugMode;

	$status = deleteLocation($groupCode, $locationId);

	if ($debugMode) { 
		print "DELETE location ".$groupCode.", ".$locationId.": "; 
		var_dump($status); 
	}
	
	$app->response()->setStatus($status['statuscode']);
});



// -------------
// OBSOLETE SET
// -------------
/*
$app->get('/set/:code', function ($code) {
	global $NL;
	$row = getSet($code);
	print '{ "sharecode": "'.$row['ShareCode'].'", "version":'.$row['Version'].', "modified": "'.$row['CreatedTime'].'", "set": '.$row['Json']."}";
    //echo "{ label: 'REST-test', version: 1 set: [11,12,13]}";
});

$app->post('/set', function () {
	global $NL;
	$body = file_get_contents('php://input');
	//print "POST: { body: ".$body."}".$NL.$NL;
	$result = createSet($body);
	//print $NL.$NL;
	print $result;
    //echo "{ label: 'REST-test', version: 1 set: [11,12,13]}";
});
*/

$app->run();


?>