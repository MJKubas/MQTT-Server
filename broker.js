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

var jsonConnectedDevices = {}
var name = 'DeviceName'
var connectedDevices = 'ConnectedDevices'
jsonConnectedDevices[name] = deviceName
jsonConnectedDevices[connectedDevices] = []

app.post("/register", function(req, res){
    var body = req.body;
    var toAdd = true;
    console.log(body);
    if(body.AuthToken == "TEST"){
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
})

broker.on('published', (packet)=>{
    message = packet.payload.toString()
    topic = packet.topic.toString()
    console.log(topic)
    console.log(message)
    console.log(broker.clients.toString())
})
