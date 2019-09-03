var deviceClient = function(deviceGuid) {
    var ws = new WebSocket("ws://" + window.location.hostname + "/" + deviceGuid);

    var callbacks = {};
    var ServerList = {};
    var wsConnections = {};

    var tobj = this;

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    ws.onopen = function (event) {
        console.log("ws open");
        /*SendCommand("GetObjects", [], function (resp) {
            console.log("Objects:");
            console.log(resp);
        });*/
        if(tobj.onconnect) {
            tobj.onconnect();
        }
    };

    ws.onmessage = function (event) {
        //console.log('onmessage');
        //console.log(event.data);
        var respObj = JSON.parse(event.data);
        if (respObj.name === "__response") {
            // this command is a reply
            if (callbacks[respObj.guid]) {
                callbacks[respObj.guid](respObj.arguments[0]);
                delete callbacks[respObj];
            }
        } else if (CommandLink[respObj.name]) {
            // we have a function in the CommandLink
            CommandLink[respObj.name].apply(this, respObj.arguments);
        }
    };

    this.SendCommand = function(commandName, args, callback, hectorServerName) {
        var cmdObj = { "name": commandName, "arguments": args };
        cmdObj.TimeSent = new Date();
        cmdObj.guid = guid();
        //console.log("sending " + commandName + " with guid " + cmdObj.guid);
        callbacks[cmdObj.guid] = callback;
        if (hectorServerName) {
            var websocket = tobj.wsConnections[hectorServerName];
            if (websocket) {
                websocket.send(JSON.stringify(cmdObj));
            }
            else {
                console.log("WARNING: Can't find server '" + hectorServerName + "'. Command not sent.");
            }
        }
        else {
            ws.send(JSON.stringify(cmdObj));
        }
    };
    
    var SendCommand = this.SendCommand;
};