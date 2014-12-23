<?php
require 'Slim/Slim.php';
require 'db.php';

\Slim\Slim::registerAutoloader();

$NL = "<br/>\n";

$app = new \Slim\Slim(array(
    'debug' => true
));

$app->get('/hello/:name', function ($name) {
    echo "Hello, $name";
});


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


$app->run();


?>