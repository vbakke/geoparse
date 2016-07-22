var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var GROUPS_COLLECTION = "groups";
var LOCATIONS_COLLECTION = "locations";

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = database;
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function () {
        var port = server.address().port;
        console.log("App now running on port", port);
    });
});


// ---------------
// ERROR HANDLING
// ---------------

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

var dbg = function (name, obj) {
    var msg = "\n" + name + ": " + obj;
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            msg += "\n - " + key + ": " + obj[key] + "; ";
        else
            msg += "\n - " + "No Own Property for '" + key + "'; ";
    }
    return msg;
}



// ---------------
// ROUTES: GROUPS
// ---------------

// Get all Groups
app.get("/groups", function(req, res) {
    res.status(400).json({"error": "Not allowed."})
});

// Create Group
app.post("/groups", function(req, res) {
    var newGroup = req.body;
    newGroup.createdTime = new Date();


    if (!(req.body.name)) {
        var msg = "";
        msg += dbg("req.header", req.header);
        msg += dbg("req.headers", req.headers);
        msg += dbg("req.url", req.url);
        msg += dbg("req.params", req.params);
        msg += dbg("req.query", req.query);
        msg += dbg("req.body", req.body);
        handleError(res, "Invalid user input", "Must provide a name. Body: "+msg, 400);
    }
    var b = dbg("req.body", req.body);
    console.log("POST /groups got: " + b);


    // Store to database
    db.collection(GROUPS_COLLECTION).insertOne(newGroup, function(err, doc) {
        console.log("POST /groups INSERT ONE. "+dbg("newGroup: ", newGroup));
        console.log("POST /groups INSERT ONE. "+dbg("doc.ops[0]: "+doc.ops[0]));
        if (err) {
            handleError(res, err.message, "Failed to create new contact.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
        console.log("POST /groups INSERT ONE. End");
    });
    console.log("POST /groups done.");
    //res.status(200).send("Body:"+b);
});

// Get Group by id
app.get("/groups/:id", function(req, res) {
    console.log("GET /groups ID: "+req.params.id);
    db.collection(GROUPS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get group");
        } else {
            res.status(200).json(doc);
        }
    });
});

// Update Group by id
app.put("/groups/:id", function(req, res) {
    var updateDoc = req.body;
    console.log("PUT /groups Erstatter ID: "+req.body._id+" med "+req.params.id);
    delete updateDoc._id;
    updateDoc.updatedTime = new Date();

    db.collection(GROUPS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update group");
        } else {
            res.status(204).end();
        }
    });
});

// Delete Group by id
app.delete("/groups/:id", function(req, res) {
    res.status(400).json({"error": "Not allowed."});
    return;

    console.log("DELETE /groups ID: "+req.params.id);
    db.collection(GROUPS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete group");
        } else {
            res.status(204).end();
        }
    });
});



// ------------------
// ROUTES: LOCATIONS
// ------------------

// Get all locations for a Group
app.get("/groups/:groupId/locations", function(req, res) {
    var groupId = req.params.groupId;
    console.log("CREATE Location for groupID: "+groupId);

    db.collection(LOCATIONS_COLLECTION).find({groupId: groupId}).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get locations.");
        } else {
            res.status(200).json(docs);
        }
    });
});

// Create a location for a Group
app.post("/groups/:groupId/locations", function(req, res) {
    var groupId = req.params.groupId;
    var newLoc = req.body;
    newLoc.createdTime = new Date();

    console.log("CREATE Location for groupID: " + groupId);

    // Check content
    if (!(req.body.groupId || req.body.lat || req.body.lng || req.body.name )) {
        handleError(res, "Invalid user input", "Must provide groupId, lat, lng and name", 400);
    }
    // Check parent
    if (!db.collection(GROUPS_COLLECTION).find({_id: groupId})) {
        handleError(res, "Invalid user input", "Non-existing groupId: '" + groupId + "'", 400);
    }
    newLoc.groupId = groupId;

    // Store to database
    db.collection(LOCATIONS_COLLECTION).insertOne(newLoc, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new location.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
        console.log("POST /groups/loc INSERT ONE. End");
    });
    console.log("POST /groups/loc done.");
    //res.status(200).send("Body:"+b);
});


// Get Location by groupId and id
app.get("/groups/:groupId/locations/:id", function(req, res) {
    var groupId = req.params.groupId;
    var locId = req.params.id;

    console.log("GET /groups/"+groupId+"/locations/"+locId);
    db.collection(LOCATIONS_COLLECTION).findOne({ _id: new ObjectID(locId) }, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get group location");
        } else {
            console.log("Got: "+dbg("doc", doc));
            if (doc.groupId != groupId)
                console.log("WARNING: Returned Locations contains different groupId ("+doc.groupId+") than specified ("+groupId+")")
            res.status(200).json(doc);
        }
    });
});

// Update Location by groupId and d
app.put("/groups/:groupId/locations/:id", function(req, res) {
    var groupId = req.params.groupId;
    var locId = req.params.id;

    console.log("UPDATE /groups/"+groupId+"/locations/"+locId);
    console.log("Incoming obj: "+dbg("req.body", req.body));
    var updateDoc = req.body;
    delete updateDoc._id;
    delete updateDoc.createdTime;
    updateDoc.groupId = groupId;
    updateDoc.updatedTime = new Date();
    console.log("Storing obj: "+dbg("req.body", req.body));

    db.collection(LOCATIONS_COLLECTION).updateOne({ _id: new ObjectID(locId) }, {"$set": updateDoc}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update group location");
        } else {
            console.log("Stored obj: "+dbg("doc", doc));
            if (doc.groupId != groupId)
                console.log("WARNING: Returned Locations contains different groupId ("+doc.groupId+") than specified ("+groupId+")")
            res.status(204).end();
        }
    });
});
