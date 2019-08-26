var BufferReader = require('buffer-reader');
var messages;
var operators;
var inChain = false;
var messageChain = [];

class MessageProcessor {
    constructor(device, messageDescription, messageOperators) {
        this.device = device;
        messages = messageDescription;
        operators = messageOperators;
    }

    Build (msgObj) {
        console.log(msgObj);
        if(msgObj.__data) {
            var msgId = msgObj.__data[0];
            var flags = msgObj.__data[1];

            var buf = Buffer.alloc(64);
            buf.writeUInt8(msgId, 0);
            buf.writeUInt8(flags, 1);

            var position = 2;

            var buildMessage = function(buf, messageType) {
                var messageArgs = messageType.args;
                if(messageArgs) {
                    for(var i = 0; i < messageArgs.length; i++) {
                        console.log(messageArgs[i].name, i);
                        switch(messageArgs[i].type) {
                            case "Buffer":
                                var array = msgObj[messageArgs[i].name];
                                var bytes = messageArgs[i].count;
                                for(var j = 0; j < array.length; j++) {
                                    position = buf.writeUInt8(array[j], position);
                                }
                                var bytesRemaining = bytes - array.length;
                                for(var j = 0; j < bytesRemaining; j++) {
                                    position = buf.writeUInt8(0, position);
                                }
                                break;
                            case "String":
                                var bytes = messageArgs[i].count;
                                var bytesRemaining = bytes = msgObj[messageArgs[i].name].length;
                                position = buf.write(msgObj[messageArgs[i].name], position);
                                //position += bytes;
                                for(var j = 0; j < bytesRemaining; j++) {
                                    position = buf.writeUInt8(0, position);
                                }
                                break;
                            default:
                                position = buf["write" + messageArgs[i].type](msgObj[messageArgs[i].name], position);
                                break;
                        }

                        if(messageArgs[i].followon) {
                            if(messageArgs[i].followon[msgObj[messageArgs[i].name]]) {
                                console.log('found followon - ' + messageArgs[i].followon[msgObj[messageArgs[i].name]].args);
                                messageArgs = messageArgs[i].followon[msgObj[messageArgs[i].name]].args;
                                console.log(messageArgs.length);
                                i = 0;
                            }
                        }
                    }
                }

                console.log('finished buildMsg');
            };

            if(messages[msgId]) {
                buildMessage(buf, messages[msgId]);
            }

            console.log('message built', msgId);
            console.log(buf);
        }
    }

    ReadMessage(data) {
        var reader = new BufferReader(data);
        var msgId = reader.nextUInt8();
        var flags = reader.nextUInt8();
        
        if(messages[msgId]) {
            if(messages[msgId].args) {
                var messageData = process(messages[msgId], reader, { __data : [ msgId, flags ], __propertyIndex : { } });
                if(messageData._startchain) {
                    inChain = true;
                    messageChain = [];
                }
                if(messageData._endchain) {
                    inChain = false;
                }
                if(inChain) {
                    messageChain.push(messageData);
                } else if(operators[messageData.messageName]) {
                    operators[messageData.messageName](messageData, messageChain);
                } else {
                    console.log('No operator:', messageData);
                }
            }
        } else {
            console.log("Unknown message: " + msgId);
        }
    }
  
    Version (reader) {
      console.log("Processing Version");
    }
  
    ControlParameter (reader) {
      //console.log("ControlParameter...");
    }
  
    PresetMessage (reader) {
      //console.log("PresetMessage...");
    }
}
module.exports = MessageProcessor;

function process (messageType, reader, msgObj) {
    var messageArgs = messageType.args;
    //if(!msgObj) {
    //    msgObj = { __data : [] };
    //}
    msgObj.messageName = messageType.name;
    if(messageType.startchain) {
        msgObj._startchain = true;
    }
    if(messageType.endchain) {
        msgObj._endchain = true;
    }
    if(messageArgs) {
        for(var i = 0; i < messageArgs.length; i++) {
          switch(messageArgs[i].type) {
              case "Buffer":
                  msgObj[messageArgs[i].name] = reader.nextBuffer(messageArgs[i].count);
                  break;
              case "String":
                  msgObj[messageArgs[i].name] = reader.nextString(messageArgs[i].count).replace(/\0/g, '');
                  break;
              default:
                  msgObj[messageArgs[i].name] = reader['next' + messageArgs[i].type]();
                  break;
          }
          msgObj.__propertyIndex[messageArgs[i].name] = msgObj.__data.length;
          msgObj.__data.push(msgObj[messageArgs[i].name]);
          if(messageArgs[i].lookup) {
              msgObj[messageArgs[i].name] = messageArgs[i].lookup[msgObj[messageArgs[i].name]];
          }
          if(messageArgs[i].followon) {
              // this message should forward to a subtype
              var followOnId = '' + msgObj[messageArgs[i].name];
              var followOnObj = messageArgs[i].followon;
          
              if(followOnObj[followOnId]) {
                  //console.log('found followon:', followOnId, followOnObj);
                  msgObj = process(followOnObj[followOnId], reader, msgObj);
                  //console.log('followOn response:', msgObj);
              }
          }
          if(messageArgs[i].ignore) {
              delete msgObj[messageArgs[i].name];
          }
        }
    }
    return msgObj;
}