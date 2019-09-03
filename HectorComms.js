var ws = require('nodejs-websocket');
var WebSocket = require('ws');
var dgram = require('dgram');
var bson = require('bson');
var os = require('os');
const uuidv1 = require('uuid/v1');

var ifaces = os.networkInterfaces();
var localAddress = '0.0.0.0';

function jsonReplacer(key, value)
{
    if (key.startsWith("_") && !key.startsWith('__')) {
        //console.log('Not serializing private key ' + key + '.');
        return undefined;
    } else {
        return value;
    }
}

Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }

    localAddress = iface.address;
    ++alias;
  });
});

module.exports.GCPServer = function(commandLink) {
    const wss = new WebSocket.Server({ port : 80 });//'ws://localhost/GCP');
    //var connections = [];

    this.SendMessage = function(messageName, args) {
        var msg = {
            "name" : messageName,
            "TimeSent" : (new Date()).toJSON(),
            "guid" : uuidv1(),
            "arguments" : args
        };

        //for(var i = 0; i < connections.length; i++) {
        //    connections[i].send(JSON.stringify(msg));
        //}

        var data = JSON.stringify(msg, jsonReplacer);
        //console.log(data);
        wss.clients.forEach(function each(client) {
            if(client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    };

    wss.on('connection', function connection(ws) {
        //console.log('connection open');
        //connections.push(ws);
        ws.on('message', function incoming(data) {
            //console.log('gcp', data);
            var cmdObj = JSON.parse(data);
            //console.log(cmdObj);
            if(cmdObj) {
                if(cmdObj.name) {
                    for(var obj in commandLink) {
                        if(typeof commandLink[obj] === 'function') {
                            if(obj === cmdObj.name) {
                                cmdObj.arguments.push(function(obj) {
                                    var response = {
                                        "name" : "__response",
                                        "TimeSent" : (new Date()).toJSON(),
                                        "guid" : cmdObj.guid,
                                        "arguments" : [obj]
                                    };
                                    var data = JSON.stringify(response, jsonReplacer);
                                    //console.log(data);
                                    ws.send(data);
                                });
                                commandLink[obj].apply(commandLink, cmdObj.arguments);
                                return;
                            }
                        }
                    }
                    console.log("WARNING: Client requested command '" + cmdObj.name + "' but it was not found in the CommandLink.");
                }
            }
        });

        ws.on('error', function error(err) {
            console.log('websocket error', err);
        });
    });
};

module.exports.Server = function(listenPort, commandLink) {
    var server = ws.createServer(function(conn) {
        console.log("HectorComms: New connection...");
        conn.on("text", function (str) {
            console.log("Received " + str);
            //conn.sendText(str.toUpperCase() + "!!!");
            var cmdObj = JSON.parse(str);
            console.log('searching for ' + cmdObj.name);
            if(cmdObj.name) {
                for(var obj in commandLink) {
                    console.log('found ' + obj + ' (' + typeof commandLink[obj] + ')');
                    if(typeof commandLink[obj] === 'function') {
                        if(obj === cmdObj.name) {
                            // push our callback into the args
                            cmdObj.arguments.push(function(obj) {
                                console.log('Callback from CommandLink');
                                var response = {
                                    "name" : "__response",
                                    "TimeSent" : (new Date()).toJSON(),
                                    "guid" : cmdObj.guid,
                                    "arguments" : [obj]
                                };
                                conn.sendText(JSON.stringify(response, jsonReplacer));
                            });
                            commandLink[obj].apply(commandLink, cmdObj.arguments);
                            break;
                        }
                    }
                }
            }
        });
        conn.on("binary", function (instream) {
            console.log("binary received");
            console.log(instream);
        });
        conn.on("close", function (code, reason) {
            console.log("Connection closed", code, reason);
        });
        conn.on("error", function (err) {
            console.log("error", err);
        });
    }).listen(listenPort);

    console.log('HectorComms started on port ' + listenPort + '.');
};

var serverGuid = uuidv1();
//console.log(serverGuid);

function HeartbeatObject() {
    this.ServerGuid = serverGuid;
    this.ServerName = os.hostname();
    this.ipAddress = localAddress;
    this.listenPort = 1001;
    this.httpPort = 8080;
    this.TCPPorts = [3001];
    this.UDPPorts = [];
    this.ServerConnections = [];
}

module.exports.Heartbeat = function(listenPort, heartbeatReceived) {
    console.log('HectorComms: creating heartbeat listener.');
    var host = '127.0.0.1';

    var socket = dgram.createSocket({type: 'udp4', reuseAddr: true});
    
    socket.on('listening', function() {
        var address = socket.address();
        console.log('HectorHeartbeat listening on ' + address.address + ':' + address.port);
        socket.setBroadcast(true);
        socket.setMulticastTTL(128);
        socket.addMembership('239.10.102.50', localAddress);

        var hb = new HeartbeatObject();
        hb.ServerName = os.hostname();

        var message = bson.serialize(hb);

        setInterval(function() {
            //console.log("Sending heartbeat (" + message + ")");
            //var message = new Buffer('This is a test');
            socket.send(message, 0, message.length, listenPort, '239.10.102.50', function(err, bytes) {
                if(err) {
                    console.log('Error sending:', err);
                } else {
                    //console.log('Sent ' + bytes);
                }
            });    
        }, 5000);
    });

    socket.on('message', function(message, remote) {
        var obj = bson.deserialize(message);
        //console.log('new message ------------');
        //console.log(obj);
        if(heartbeatReceived) {
            heartbeatReceived(obj);
        }
    });

    socket.bind(listenPort);
};