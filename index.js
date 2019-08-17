var HID = require('node-hid');
var BufferReader = require('buffer-reader');
var devices = HID.devices();
var MessageProcessor = require('./MessageProcessor.js');
const os = require('os');

var messageChain = [];
var inChain = false;
class FuseDevice {
  constructor(usbDevice) {
    this.Devices = {};
    this.Presets = [];
    var msgProc = new MessageProcessor(this);
    //msgProc["PresetMessage"]();
    //console.log(msgProc);
    //console.log(MessageProcessor);
    function sendBuffer(buffer) {
      if(os.platform() === "win32") {
          buffer.unshift(0);
      }
      device.write(buffer);
    }

    usbDevice.on("data", function(data) {
      var reader = new BufferReader(data);
      var msgId = reader.nextUInt8();
      var flags = reader.nextUInt8();
      if(messages[msgId]) {
        if(messages[msgId].args) {
          var messageData = msgProc.Process(messages[msgId], reader);
          console.log(messageData);
          if(messageData._startchain) {
            inChain = true;
            messageChain = [];
          }
          if(messageData._endchain) {
            inChain = false;
            //console.log('Chained message:');
            //console.log(messageChain);
          }
          if(inChain) {
            messageChain.push(messageData);
          } else if(operators[messageData.messageName]) {
            operators[messageData.messageName](messageData, messageChain);
            //console.log(devices);
            //console.log(JSON.stringify(devices, null, 4));
          }
        }
      } else {
          console.log("Unknown message: " + msgId);
      }
    });

    var handshake = Array(64).fill(0x00);
    handshake[1] = 0xC3;
    sendBuffer(handshake);
    console.log("Handshake: " + new Buffer.from(device.readSync()).toString('ascii'));
  
    var handshake2 = Array(64).fill(0x00);
    handshake2[0] = 0x1A;
    handshake2[1] = 0xC1;
    sendBuffer(handshake2);
    console.log("Handshake 2: " + new Buffer.from(device.readSync()).toString('ascii'));

    var handshake3 = Array(64).fill(0x00);
    handshake3[0] = 0xFF;
    handshake3[1] = 0xC1;
    sendBuffer(handshake3);
  }
}

//console.log(devices);
var devicePath;
for(var i = 0; i < devices.length; i++) {
  console.log(devices[i]);
  if(devices[i].vendorId === 7896 && devices[i].productId === 14) {
    devicePath = devices[i].path;
  }
}

if(devicePath) {
  var device = new HID.HID(devicePath);

  console.log(device);

  // var handshake = Array(64).fill(0x00);
  // handshake[1] = 0xC3;
  // sendBuffer(handshake);
  // console.log("Handshake: " + new Buffer.from(device.readSync()).toString('ascii'));

  // var handshake2 = Array(64).fill(0x00);
  // handshake2[0] = 0x1A;
  // handshake2[1] = 0xC1;
  // sendBuffer(handshake2);
  // console.log("Handshake 2: " + new Buffer.from(device.readSync()).toString('ascii'));

  // var handshake3 = Array(64).fill(0x00);
  // handshake3[0] = 0xFF;
  // handshake3[1] = 0xC1;

  var effectTypes = {
    0 : { id: 0, name: "unknown" },
    1 : { id: 1, name: "unknown" },
    2 : { id: 2, name: "amplifier" },
    3 : { id: 3, name: "distortion" },
    4 : { id: 4, name: "modulation" },
    5 : { id: 5, name: "delay" },
    6 : { id: 6, name: "reverb" }
  }

  // fill in unknown effects types
  for(var i = 0; i < 255; i++) {
    if(!effectTypes[i]) {
      effectTypes[i] = { id: i, name: "unknown" };
    }
  }

  var parameterTypes = {
    0 : { id: 0, name: "unknown" },
    1 : { id: 1, name: "percent" },
    12 : { id: 12, name: "potentiometer" }
  }

  // fill in unknown effects types
  for(var i = 0; i < 65537; i++) {
    if(!parameterTypes[i]) {
      parameterTypes[i] = { id: i, name: "unknown" };
    }
  }

  var presetMessageTypes = {
    COMPLETE: 0,
    CHANGE: 1,
    SAVE: 2,
    SAVENAME: 3,
    NAME: 4,
    AMPLIFIER: 5,
    DISTORTION: 6,
    MODULATION: 7,
    DELAY: 8,
    REVERB: 9,
    EXPRESSION: 10,
    SYSTEM: 11,
    COMPRESSOR: !2,
    USBAUDIO: 13,
    EFFECTSLOOP: 14
  }

  // controlId in messages`
  var controls = {
    VOICE : 1,
    FXSELECT : 2
  };

  var devices = {
    11 : { name: "reverb", controls: [{ label: "amount" }] },
    22 : { name: "delay", controls: [{ label: "amount" }, { label: "tap" }] },
    106 : { name: "amplifier", controls: [{ label: "volume" }, { label: "gain" }, { label: "unknown" }, { label: "unknown" }, { label: "treble" }, { label: "unknown" } , { label: "bass" } ] }
  }

  var operators = {
    "ControlParameter" : (data) => {
      console.log('ControlParameter operator running..');
      if(!devices[data.deviceId]) {
        devices[data.deviceId] = {};
        devices[data.deviceId].name = "unknown";
        devices[data.deviceId].controls = [];
      }
      for(var obj in data) {
        if(!devices[data.deviceId].controls[data.controlIndex]) {
          devices[data.deviceId].controls[data.controlIndex] = { label: "unknown" };
        }
        devices[data.deviceId].controls[data.controlIndex][obj] = data[obj];
      }
    }
  }

  //var device = { presets: [] };

  var presetMessages = {
    0: { name: "PresetComplete", endchain: true},
    1: { name: "PresetChange" },
    2: { name: "PresetSave" },
    3: { name: "PresetSaveName" },
    4: { name: "PresetName",
      args: [
        { name: 'controlId', type: 'UInt8' }
        ,{ name: 'position', type: 'UInt16LE' }
        ,{ name: 'isModified', type: 'UInt8' }
        ,{ name: 'isCurrent', type: 'UInt8' }
        ,{ name: 'zeroData', type: 'Buffer', count: 8}
        ,{ name: 'name', type: 'String', count: 48}
      ],
      startchain: true
    },
    5: { name: "PresetAmplifier" },
    6: { name: "PresetDistortion",
         args: [
           { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8}
          ,{ name: 'deviceId', type: 'UInt16LE' }
          ,{ name: 'controlIndex', type: 'UInt8' }
          ,{ name: 'expressionIndex', type: 'UInt8' }
          ,{ name: 'tapIndex', type: 'UInt8' }
          ,{ name: 'bypassMode', type: 'UInt16LE' }
          ,{ name: 'bypass', type: 'UInt8' }
          ,{ name: 'finalData', type: 'Buffer', count: 40 }
         ] },
    7: { name: "PresetModulation",
          args: [
            { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8}
          ,{ name: 'deviceId', type: 'UInt16LE' }
          ,{ name: 'controlIndex', type: 'UInt8' }
          ,{ name: 'expressionIndex', type: 'UInt8' }
          ,{ name: 'tapIndex', type: 'UInt8' }
          ,{ name: 'bypassMode', type: 'UInt16LE' }
          ,{ name: 'bypass', type: 'UInt8' }
          ,{ name: 'finalData', type: 'Buffer', count: 40 }
          ] },
    8: { name: "PresetDelay",
          args: [
            { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8}
          ,{ name: 'deviceId', type: 'UInt16LE' }
          ,{ name: 'controlIndex', type: 'UInt8' }
          ,{ name: 'expressionIndex', type: 'UInt8' }
          ,{ name: 'tapIndex', type: 'UInt8' }
          ,{ name: 'bypassMode', type: 'UInt16LE' }
          ,{ name: 'bypass', type: 'UInt8' }
          ,{ name: 'finalData', type: 'Buffer', count: 40 }
          ] },
    9: { name: "PresetReverb",
          args: [
            { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8}
          ,{ name: 'deviceId', type: 'UInt16LE' }
          ,{ name: 'controlIndex', type: 'UInt8' }
          ,{ name: 'expressionIndex', type: 'UInt8' }
          ,{ name: 'tapIndex', type: 'UInt8' }
          ,{ name: 'bypassMode', type: 'UInt16LE' }
          ,{ name: 'bypass', type: 'UInt8' }
          ,{ name: 'finalData', type: 'Buffer', count: 40 }
          ] },
    10: { name: "PresetExpression" },
    11: { name: "PresetSystem" },
    12: { name: "PresetCompressor" },
    13: { name: "PresetUSBAudio" },
    14: { name: "PresetEffectsLoop" }
  }

  var messages = {
    0 : { name: "Handshake" },
    1 : { name: "Version" },
    5 : { name: "ControlParameter",
          args: [
            { name: 'effectType', type: 'UInt8', lookup: effectTypes },
            { name: 'deviceId', type: 'UInt16LE' },
            { name: 'index', type: 'UInt8' },
            { name: 'controlIndex', type: 'UInt8' },
            { name: 'parameterType', type: 'UInt16LE', lookup: parameterTypes },
            { name: 'parameterValue', type: 'UInt8' }
          ]
        },
    6 : { name: "EffectsUnit" },
    8 : { name: "Preset?" },
    28: { name: "PresetMessage",
          args: [
                 { name: 'presetMessageType', type: 'UInt8', followon: presetMessages }
              ]
        },
    29: { name: "RotarySwitch",
          args: [
                { name: 'position', type: 'UInt8' },
                { name: 'knobIndex', type: 'UInt8' }
              ]
        }
  };


  // function sendBuffer(buffer) {
  //     if(os.platform() === "win32") {
  //         buffer.unshift(0);
  //     }
  //     device.write(buffer);
  // }

  // device.on("data", function(data) {
  //     //console.log(data);
  //     var reader = new BufferReader(data);
  //     var msgId = reader.nextUInt8();
  //     var flags = reader.nextUInt8();
  //     if(messages[msgId]) {
  //         console.log(messages[msgId].name);
  //         if(messages[msgId].process) {
  //             console.log(messages[msgId].process(flags, reader));
  //         } else {
  //             console.log("Cannot process message.");
  //         }
  //     } else {
  //         console.log("Unknown message: " + msgId);
  //     }
  // });

  //sendBuffer(handshake3);
  var fDevice = new FuseDevice(device);
}