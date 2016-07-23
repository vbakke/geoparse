<?php
require 'Slim/Slim.php';
require 'db.php';

\Slim\Slim::registerAutoloader();

$NL = "<br/>\n";

$app = new \Slim\Slim(array(
    'debug' => false
));

if (new DateTime() <= new Datetime("2016-07-24"))
	$app->response->headers->set('Access-Control-Allow-Origin', 'http://localhost');
$app->response->headers->set('Content-Type', 'application/json;charset=utf-8');



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
	echo(json_encode($row));
});
$app->post('/freeShareCode', function () {
	global $NL;
	$free = getFreeShareCode(4,"D-");
	
	$row = array(shareCode => $free);
	echo(json_encode($row));
});


// -----------
// ROUTE GROUP
// -----------

$app->get('/groups/:groupId', function ($groupId) {
	global $NL;
	//print "Searching for group: ".$groupId.$NL;
	$row = getGroup($groupId);
	
	echo(json_encode($row));
});

$app->post('/groups', function () {
	global $NL;
	$body = file_get_contents('php://input');
	$result = createGroup($body);
	echo(json_encode($result));
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