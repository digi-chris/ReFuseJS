var HID = require('node-hid');
var BufferReader = require('buffer-reader');
var devices = HID.devices();
const os = require('os');

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

  //device.on("data", function(data) {
  //  console.log("Data");
  //  console.log(data);
  //});

  //console.log(device.readSync());

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

  var effectsTypes = {
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
    if(!effectsTypes[i]) {
      effectsTypes[i] = { id: i, name: "unknown" };
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

  // controlId in messages
  var controls = {
    VOICE : 1,
    FXSELECT : 2
  };

  var devices = {
    11 : { name: "reverb", controls: ["amount"] },
    22 : { name: "delay", controls: ["amount", "tap"] },
    106 : { name: "amplifier", controls: ["volume", "gain", "unknown", "unknown", "treble", "unknown", "bass" ] }
  }

  //var device = { presets: [] };
  

  var messages = {
    0 : { name: "Handshake" },
    1 : { name: "Version" },
    5 : { name: "ControlParameter", process: (flags, reader) => { return { effectType: effectsTypes[reader.nextUInt8()], deviceId: reader.nextUInt16LE(), index: reader.nextUInt8(), controlIndex: reader.nextUInt8(), parameterType: parameterTypes[reader.nextUInt16LE()], parameterValue: reader.nextUInt8() }; } },
    6 : { name: "EffectsUnit" },
    8 : { name: "Preset?" },
    28: { name: "PresetMessage",
      process: (flags, reader) => {
        var retObj = {
          presetMessageType: reader.nextUInt8(),
          controlId: reader.nextUInt8(),
          position: reader.nextUInt16LE(),
          isModified: reader.nextUInt8(),
          isCurrent: reader.nextUInt8()
        };
        switch(retObj.presetMessageType) {
          case presetMessageTypes.NAME:
              retObj.zeroData = reader.nextBuffer(8);
              retObj.name = reader.nextString(48).replace(/\0/g, '');
              device.presets
              break;
            case presetMessageTypes.DISTORTION:
            case presetMessageTypes.MODULATION:
            case presetMessageTypes.DELAY:
            case presetMessageTypes.REVERB:
              retObj.zeroData = reader.nextBuffer(8);
              retObj.deviceId = reader.nextUInt16LE();
              retObj.controlIndex = reader.nextUInt8();
              retObj.expressionIndex = reader.nextUInt8();
              retObj.tapIndex = reader.nextUInt8();
              retObj.bypassMode = reader.nextUInt16LE();
              retObj.bypass = reader.nextUInt8();
              retObj.pedal = true;
              retObj.finalData = reader.nextBuffer(40);
              break;
            case presetMessageTypes.EXPRESSION:
              retObj.expressionPedal = true;
              retObj.finalData = reader.nextBuffer(56);
              break;
            case presetMessageTypes.COMPLETE:
              retObj.complete = true;
              break;
            default:
              retObj.finalData = reader.nextBuffer(56);
              break;
        }
        return retObj;
      }},
    29: { name: "RotarySwitch", process: (flags, reader) => { return { position: reader.nextUInt8(), knobIndex: reader.nextUInt8() }; } }
  };


  function sendBuffer(buffer) {
      if(os.platform() === "win32") {
          buffer.unshift(0);
      }
      device.write(buffer);
  }

  device.on("data", function(data) {
      //console.log(data);
      var reader = new BufferReader(data);
      var msgId = reader.nextUInt8();
      var flags = reader.nextUInt8();
      if(messages[msgId]) {
          console.log(messages[msgId].name);
          if(messages[msgId].process) {
              console.log(messages[msgId].process(flags, reader));
          } else {
              console.log("Cannot process message.");
          }
      } else {
          console.log("Unknown message: " + msgId);
      }
  });

  sendBuffer(handshake3);
}