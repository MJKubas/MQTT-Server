// Mosca MQTT broker
var mosca = require('mosca')
var settings = {port: 1235};
const bp = require('body-parser');
var broker = new mosca.Server(settings);
var Gpio = require('onoff').Gpio;
var buzzer = new Gpio(4, 'out');


var express = require("express");
var app = express();

var mysql = require('mysql');
const e = require('express');
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

app.post("/register", async(req, res) => {
    var body = req.body;
    var toAdd = true;
    console.log(body);
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
                var sqlValueClear = `CREATE EVENT cleaning_${body.Device.Topic} ON SCHEDULE EVERY 1 MONTH ENABLE DO DELETE FROM ${body.Device.Topic} WHERE 'timeStamp' < CURRENT_TIMESTAMP - INTERVAL 6 MONTH;`
                con.query(sqlValueClear, function (err, result) {
    		        if (err) throw err;
    		        console.log("Delete event set");
		        });
            }
            res.send("Done")
        }
        else if(body.MqttType == "Viewer"){
	    jsonConnectedDevices[connectedDevices].length = 0

	    await getDevices();
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

app.get("/data", async(req, res) => {
    var result = await getData(req.query.topic);
    console.log(result);
    res.json(result);
});

app.listen(8080, () => {
 console.log("Server running on port 8080");
});

broker.on('ready', ()=>{
    console.log('Broker is ready!')
    console.log(jsonConnectedDevices[connectedDevices]);
})

broker.on('published', (packet)=>{
    var toAdd = true;
    var message = packet.payload.toString()
    var topic = packet.topic.toString()
    if(topic == "alert"){
        if(message=="on" && buzzer.readSync() == 0){
            buzzer.writeSync(1);
        }
        else if(message == "off" && buzzer.readSync() == 1){
            buzzer.writeSync(0);
        }
    }
    else{
        var parsed
        try {
            parsed = JSON.parse(message);
        } catch (e) {
            return console.log("error " + message);
        }

        if(parsed.AuthToken == "TEST"){
            if(parsed.MqttType == "Publisher"){
                if(jsonConnectedDevices[connectedDevices]){
                    jsonConnectedDevices[connectedDevices].forEach(element => {
                        if(element.Topic == topic){
                            toAdd = false
                        }
                    });                
                }
                if(toAdd){
                    jsonConnectedDevices[connectedDevices].push(parsed.Device)
                    var sqlDeviceAdd = `INSERT INTO Devices (Type, Topic, View) VALUES ('${parsed.Device.Type}', '${topic}', '${parsed.Device.View}')`;
                    con.query(sqlDeviceAdd, function (err, result) {
                        if (err) throw err;
                        console.log("Table created");
                    });
                    var sqlValueAdd = `CREATE TABLE IF NOT EXISTS ${topic} (id INT AUTO_INCREMENT PRIMARY KEY, timeStamp VARCHAR(255), value VARCHAR(255))`;
                    con.query(sqlValueAdd, function (err, result) {
                        if (err) throw err;
                        console.log("Table created");
                    });
                    var sqlValueClear = `CREATE EVENT cleaning_${topic} ON SCHEDULE EVERY 1 MONTH ENABLE DO DELETE FROM ${topic} WHERE 'timeStamp' < CURRENT_TIMESTAMP - INTERVAL 6 MONTH;`
                    con.query(sqlValueClear, function (err, result) {
                        if (err) throw err;
                        console.log("Delete event set");
                    });
                }

                //jsonConnectedDevices[connectedDevices].forEach(element => {
                //    if(element.Topic == topic){
                        var sql = `INSERT INTO ${topic} (timeStamp, value) VALUES (CURRENT_TIMESTAMP, '${parsed.Value}')`
                        con.query(sql, function (err, result) {
                            if (err) throw err;
                            console.log("1 record inserted");
                        });
                        console.log(topic)
                        console.log(message)
                  //  }
                //});            
            }        
        }        
    }
})

queryDevices = () =>{
    return new Promise((resolve, reject) =>{
	con.query("SELECT * FROM Devices", function (err, result, fields) {
    	    if (err) return reject(err);
	    return resolve(result)
	});
    });
};

async function getDevices(){
    try{
	const devices = await queryDevices();
	devices.forEach(element => {
            device = {
            	Type: element.Type,
            	Topic: element.Topic,
            	View: element.View
            };
            jsonConnectedDevices[connectedDevices].push(device);
    	})
    } catch(error){
	console.log(error)
    }
    console.log(jsonConnectedDevices[connectedDevices])
}

queryData = (topic) => {
    return new Promise((resolve, reject) =>{
	var sqlGetData = `SELECT date(timeStamp) as day, avg(value) as avgValue FROM ${topic} WHERE timeStamp BETWEEN CURRENT_TIMESTAMP - INTERVAL 1 MONTH AND CURRENT_TIMESTAMP GROUP BY date(timeStamp)`;
	con.query(sqlGetData, function (err, result, fields) {
    	    if (err) return reject(err);
	    return resolve(result)
	});
    });
};

async function getData(topic){
    var data;
    try{
	data = await queryData(topic);
    } catch(error){
	console.log(error)
    }
    return data;
}
