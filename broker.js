// Mosca MQTT broker
var mosca = require('mosca')
var settings = {port: 1235};
const bp = require('body-parser');
var broker = new mosca.Server(settings);

var express = require("express");
var app = express();

app.use(bp.json());
app.use(bp.urlencoded({extended:true}));

var deviceName = "RaspberryPi4B";

app.post("/register", function(req, res){
    var body = req.body;
    console.log(body);
    if(body.AuthToken == "TEST"){
        res.json({
            "DeviceName": "RaspberryPi4B",
            "ConnectedDevices": [
            {"Type": "TemperatureSensor","Topic": "TempSens", "View": "Text"},
            {"Type": "HumiditySensor","Topic": "HumSens", "View": "Text"},
            {"Type": "CameraSensor","Topic": "CamSens", "View": "Text"},
            {"Type": "MotionSensor","Topic": "MotSens", "View": "Text"},
            {"Type": "dupaSensor","Topic": "dupaDupa", "View": "Text"}
            ]
        })
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
})

broker.on('published', (packet)=>{
    message = packet.payload.toString()
    console.log(message)
})

