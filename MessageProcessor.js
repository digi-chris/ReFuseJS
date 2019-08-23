class MessageProcessor {
    constructor(device) {
        this.device = device;
    }
  
    Process (messageType, reader, msgObj) {
      var messageArgs = messageType.args;
      if(!msgObj) {
        msgObj = { };
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
          if(messageArgs[i].lookup) {
            msgObj[messageArgs[i].name] = messageArgs[i].lookup[msgObj[messageArgs[i].name]];
          }
          if(messageArgs[i].followon) {
            // this message should forward to a subtype
            var followOnId = '' + msgObj[messageArgs[i].name];
            var followOnObj = messageArgs[i].followon;
            
            if(followOnObj[followOnId]) {
              //console.log('found followon:', followOnId, followOnObj);
              msgObj = this.Process(followOnObj[followOnId], reader, msgObj);
              //console.log('followOn response:', msgObj);
            }
          }
        }
      }
      return msgObj;
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