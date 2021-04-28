// Mosca MQTT broker
var mosca = require('mosca')
const crypto = require('crypto');
const bp = require('body-parser');
var express = require("express");
var mysql = require('mysql');

var settings = {port: 1235};
var broker = new mosca.Server(settings);

var app = express();

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "sensors"
});


app.use(bp.json());
app.use(bp.urlencoded({extended:true}));

var deviceName = "RaspberryPi4B";

var jsonConnectedDevices = {}
var device = {}
var name = 'DeviceName'
var connectedDevices = 'ConnectedDevices'
jsonConnectedDevices[name] = deviceName
jsonConnectedDevices[connectedDevices] = []

con.query("SELECT * FROM Devices", function (err, result, fields) {
    if (err) throw err;
    result.forEach(element => {
        device = {
            Type: element.Type,
            Topic: element.Topic,
            View: element.View
        };
        jsonConnectedDevices[connectedDevices].push(device);
    })
});

app.post("/register", function(req, res){
    var body = req.body;
    var toAdd = true;
    if(body.AuthToken == "TEST"){ //Change auth value
        if(body.MqttType == "Publisher"){
            if(jsonConnectedDevices[connectedDevices]){
                jsonConnectedDevices[connectedDevices].forEach(element => {
                    if(element.Topic == body.Device.Topic){
                        toAdd = false
                    }
                });
            }
            if(toAdd){
                jsonConnectedDevices[connectedDevices].push(body.Device)
                var sqlDeviceAdd = `INSERT INTO Devices (Type, Topic, View) VALUES ('${body.Device.Type}', '${body.Device.Topic}', '${body.Device.View}')`;
                con.query(sqlDeviceAdd, function (err, result) {
    		        if (err) throw err;
    		        console.log("Table created");
		        });
                var sqlValueAdd = `CREATE TABLE IF NOT EXISTS ${body.Device.Topic} (id INT AUTO_INCREMENT PRIMARY KEY, timeStamp VARCHAR(255), value VARCHAR(255))`;
  		        con.query(sqlValueAdd, function (err, result) {
    		        if (err) throw err;
    		        console.log("Table created");
		        });
                var sqlValueClear = `CREATE EVENT cleaning ON SCHEDULE EVERY 1 MONTH ENABLE DO DELETE FROM ${body.Device.Topic} WHERE 'timeStamp' < CURRENT_TIMESTAMP - INTERVAL 6 MONTH;`
                con.query(sqlValueClear, function (err, result) {
    		        if (err) throw err;
    		        console.log("Delete event set");
		        });
            }
            res.send("Done")
        }
        else if(body.MqttType == "Viewer"){
            var test = JSON.stringify(jsonConnectedDevices)
            console.log(test)
            res.send(test)            
        }
    }
    else{
        res.json({
            "Authentication": "failed"
        })
    }
});

app.get("/", function(req, res){
    res.json({
        "DeviceName": "RaspberryPi4B"
    })
});

app.listen(8080, () => {
 console.log("Server running on port 8080");
});

broker.on('ready', ()=>{
    console.log('Broker is ready!')
    console.log(jsonConnectedDevices[connectedDevices]);
})

broker.on('published', (packet)=>{
    var message = packet.payload.toString()
    var topic = packet.topic.toString()
    if(jsonConnectedDevices[connectedDevices]){
        jsonConnectedDevices[connectedDevices].forEach(element => {
            if(element.Topic == topic){
                var sql = `INSERT INTO ${topic} (timeStamp, value) VALUES (CURRENT_TIMESTAMP, '${message}')`
                con.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
                console.log(topic)
                console.log(message)
            }
        });
    }
    console.log(broker.clients.toString())
})

function Authentication(input){
    const password = 'Password123';
    const storedHashString = 'J9IBFSw0U1EFsH/ysL+wak6wb8s=';
    const storedSaltString = '2nX0MZPZlwiW8bYLlVrfjBYLBKM=';

    const storedHashBytes = new Buffer.from(storedHashString, 'base64');
    const storedSaltBytes = new Buffer.from(storedSaltString, 'base64');

    crypto.pbkdf2(password, storedSaltBytes, 1000, 20, 'sha1',
        (err, calculatedHashBytes) => {
            const correct = calculatedHashBytes.equals(storedHashBytes);
            console.log('Password is ' + (correct ? 'correct 😎' : 'incorrect 😭'));
        }
    );
}