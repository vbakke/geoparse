<?php
require 'Slim/Slim.php';
require 'db.php';

\Slim\Slim::registerAutoloader();

$NL = "<br/>\n";

$app = new \Slim\Slim(array(
    'debug' => false
));

if (new DateTime() < new Datetime("2016-08-31"))
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
// ROUTE FREESHARECODE
// -------------------

$app->get('/freeShareCode/:shareCode', function ($shareCode) {
	global $NL;
	$row = array(free => isShareCodeFree($shareCode));  // ToDo: Check if sharecode is used in db
	echo(safe_json($row));
});
$app->post('/freeShareCode', function () {
	global $NL;
	$free = getFreeShareCode(4,"D-");
	
	$row = array(shareCode => $free);
	echo(safe_json($row));
});


// -----------
// ROUTE GROUP
// -----------

$app->get('/groups/:groupId', function ($groupCode) {
	global $environment, $NL;
	//print "Searching for group: ".$groupCode.$NL;
	$result = getGroup($groupCode);

	if (strtoupper($environment) != "PROD")
		$result["environment"] = $environment;

	echo(safe_json($result));
});

$app->post('/groups', function () {
	global $app, $environment, $NL;
	$body = file_get_contents('php://input');
	$result = createGroup($body);
	
	if (strtoupper($environment) != "PROD")
		$result["environment"] = $environment;
	
	if ($result)
		$app->response()->setStatus(201);
	echo(safe_json($result));
});

// ----------------------
// ROUTE GROUP / LOCATION
// ----------------------

$app->post('/groups/:groupId/locations', function ($groupCode) {
	global $app, $NL, $debugMode;
	$body = file_get_contents('php://input');

	$status = createLocation($groupCode, $body);

	if ($debugMode) { 
		print "POST location ".$groupCode.": "; 
		var_dump($status); 
	}
	
	$app->response()->setStatus($status['statuscode']);
	
	if ($status['locationId'])
		echo(safe_json($status));
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