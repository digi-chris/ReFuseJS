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

    }

    ReadMessage(data) {
        var reader = new BufferReader(data);
        var msgId = reader.nextUInt8();
        var flags = reader.nextUInt8();
        
        if(messages[msgId]) {
            if(messages[msgId].args) {
                var messageData = process(messages[msgId], reader, { __data : [ msgId, flags ] });
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
    if(!msgObj) {
      msgObj = { __data : [] };
    }
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