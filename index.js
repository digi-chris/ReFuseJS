const util = require('util');
var express = require('express');
var HID = require('node-hid');
var BufferReader = require('buffer-reader');
var devices = HID.devices();
var MessageProcessor = require('./MessageProcessor.js');
const os = require('os');
var msgProc;
var app = express();



//var messageChain = [];
//var inChain = false;
class FuseDevice {
  constructor(usbDevice) {
    this.Devices = {};
    this.Presets = [];
    msgProc = new MessageProcessor(this, messages, operators);
    //msgProc["PresetMessage"]();
    //console.log(msgProc);
    //console.log(MessageProcessor);
    function sendBuffer(buffer) {
      if(os.platform() === "win32") {
          buffer.unshift(0);
      }
      device.write(buffer);
    }

    usbDevice.on("data", msgProc.ReadMessage); /*function(data) {
      var reader = new BufferReader(data);
      var msgId = reader.nextUInt8();
      var flags = reader.nextUInt8();
      if(messages[msgId]) {
        if(messages[msgId].args) {
          var messageData = msgProc.Process(messages[msgId], reader);
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
    });*/

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
    //11 : { name: "reverb", controls: [{ label: "amount" }] },
    //22 : { name: "delay", controls: [{ label: "amount" }, { label: "tap" }] },
    //106 : { name: "amplifier", controls: [{ label: "volume" }, { label: "gain" }, { label: "unknown" }, { label: "unknown" }, { label: "treble" }, { label: "unknown" } , { label: "bass" } ] }
  }

  var operators = {
    "ControlParameter" : (data) => {
      console.log('ControlParameter operator running..');
      console.log(data);
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
    },
    "PresetAmplifier" : (data) => {
      console.log("PresetAmplifier-----------", data);
    },
    "PresetComplete" : (data, chain) => {
      //console.log('PresetComplete. Command chain:', chain);
      //console.log('----- Start of chain -----');
      for(var i = 0; i < chain.length; i++) {
        //if(chain[i].controlId === 0) {
        //  console.log('chain ' + i + ' ---------------');
        //  console.log(chain[i]);
        //  console.log('-------------------------------');
        //}
        var presetName;
        //console.log(chain[i].messageName);
        switch (chain[i].messageName) {
          case "PresetName":
            presetName = chain[i].name;
            //console.log(chain[i].name);
            break;
          case "PresetAmplifier":
            //console.log("PresetAmplifier", chain[i]);
            var patch = new fusePatch(presetName);
            patch.AddModule(new fuseModule(chain[i]));
            patches[chain[i].position] = patch;
            //console.log(JSON.parse(JSON.stringify(patch)));
            //if(patch.Name === '') {
              //console.log(util.inspect(JSON.parse(JSON.stringify(patch)), {depth: null}));
              //console.log('running build...');
              //msgProc.Build(chain[i]);
            //}
            //console.log(util.inspect(patch, {showHidden: false, depth: null}));
            //console.log(JSON.stringify(patches));
            break;
          default:
            //console.log('Not processed: ' + chain[i].messageName);

        }
      }
      //console.log('----- End of chain -----');
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
        ,{ name: 'zeroData', type: 'Buffer', count: 8 }
        ,{ name: 'name', type: 'String', count: 48 }
      ],
      startchain: true
    },
    5: { name: "PresetAmplifier",
         args: [
           { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8, private: true }
          ,{ name: 'modelId', type: 'UInt16LE' } // amplifier model
          ,{ name: 'controlIndex', type: 'UInt8' }
          ,{ name: 'expressionIndex', type: 'UInt8' }
          ,{ name: 'tapIndex', type: 'UInt8' }
          ,{ name: 'bypassMode', type: 'UInt16LE' }
          ,{ name: 'bypass', type: 'UInt8' }
          ,{ name: 'unknownData', type: 'Buffer', count: 8, private: true }
          ,{ name: 'volume2', type: 'UInt8' }
          ,{ name: 'gain', type: 'UInt8' }
          ,{ name: 'gain2', type: 'UInt8' } // gain 2?
          ,{ name: 'masterVolume', type: 'UInt8' } // master volume?
          ,{ name: 'treble', type: 'UInt8' }
          ,{ name: 'mid', type: 'UInt8' }
          ,{ name: 'bass', type: 'UInt8' }
          ,{ name: 'presence', type: 'UInt8' } // ?
          ,{ name: 'unknown0', type: 'UInt8', private: true }
          ,{ name: 'depth', type: 'UInt8' } // ?
          ,{ name: 'bias', type: 'UInt8' } // ?
          ,{ name: 'unknown1', type: 'UInt8', private: true }
          ,{ name: 'unknownData2', type: 'Buffer', count: 3, private: true }
          ,{ name: 'noiseGate', type: 'UInt8' }
          ,{ name: 'threshold', type: 'UInt8' }
          ,{ name: 'cabinet', type: 'UInt8' }
          ,{ name: 'unknown2', type: 'UInt8', private: true }
          ,{ name: 'sag', type: 'UInt8' }
          ,{ name: 'bright', type: 'UInt8' }
          ,{ name: 'unknown3', type: 'UInt8', private: true }
          ,{ name: 'unknown4', type: 'UInt8', private: true }
          ,{ name: 'zeroData2', type: 'Buffer', count: 9, private: true }
         ] },
    6: { name: "PresetDistortion",
         args: [
           { name: 'controlId', type: 'UInt8' }
          ,{ name: 'position', type: 'UInt16LE' }
          ,{ name: 'isModified', type: 'UInt8' }
          ,{ name: 'isCurrent', type: 'UInt8' }
          ,{ name: 'zeroData', type: 'Buffer', count: 8 }
          ,{ name: 'modelId', type: 'UInt16LE' }
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
           ,{ name: 'zeroData', type: 'Buffer', count: 8 }
           ,{ name: 'modelId', type: 'UInt16LE' }
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
           ,{ name: 'modelId', type: 'UInt16LE' }
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
          ,{ name: 'modelId', type: 'UInt16LE' }
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

var modelNames = {
  // amplifiers
  83 : "Fender 65 Deluxe Reverb",
  100 : "Fender 59 Bassman",
  103 : "Fender 57 Deluxe",
  124 : "Fender 57 Champ",
  106 : "Fender 65 Princeton",
  117 : "Fender 65 Twin Reverb",
  114 : "Fender Super Sonic",
  97 : "British 60's",
  121 : "British 70's",
  94 : "British 80's",
  93 : "American 90's",
  109 : "Metal 2000",

  // effects
  60 : 'Overdrive',
  73 : 'Fixed Wah',
  74 : 'Touch Wah',
  26 : 'Fuzz',
  28 : 'Fuzz Touch Wah',
  136 : 'Simple Compressor',
  7 : 'Compressor',
  18 : 'Sine Chorus',
  19 : 'Triangle Chorus',
  24 : 'Sine Flanger',
  25 : 'Triangle Flanger',
  45 : 'Vibratone',
  64 : 'Vintage Tremolo',
  65 : 'Sine Tremolo',
  34 : 'Ring Modulator',
  41 : 'Step Filter',
  79 : 'Phaser',
  31 : 'Pitch Shifer'

};

class fusePatch {
  constructor(name) {
    this.Name = name;
    this.Modules = [];
  }

  AddModule(module) {
    this.Modules.push(module);
  }
}

class fuseModule {
  constructor(data) {
    console.log(data.__private);
    var tobj = this;
    this.Type = data.presetMessageType;
    //this.Parameters = {};
    //console.log('fuseModule');
    //console.log(data);
    var addProperty = (propertyName) => {
      //console.log("Adding property " + propertyName);
      var isEnumerable;
      if(data.__private[propertyName]) {
        isEnumerable = false;
      } else {
        isEnumerable = true;
      }
      Object.defineProperty(tobj, propertyName, {
        get : () => {
          return data.__data[data.__propertyIndex[propertyName]];
        },
        set : (value) => {
          //data[propertyName] = value;
          data.__data[data.__propertyIndex[propertyName]] = value;
        },
        enumerable: isEnumerable
      });
      //tobj[propertyName] = data[propertyName];
      //console.log(tobj[propertyName]);
    };

    for(var obj in data) {
      addProperty(obj);
    }

    if(this.modelId) {
      if(modelNames[this.modelId]) {
        this.modelName = modelNames[this.modelId];
      }
    }
  }
}

// function fuseModule(data) {
//   var tobj = this;
//   var addProperty = (propertyName) => {
//     //console.log("Adding property " + propertyName);
//     Object.defineProperty(tobj, propertyName, {
//       get : () => {
//         return data[propertyName];
//       },
//       set : (value) => {
//         console.log('setting property');
//         data[propertyName] = value;
//       }
//     });
//     //tobj[propertyName] = data[propertyName];
//     //console.log(tobj[propertyName]);
//   };

//   for(var obj in data) {
//     addProperty(obj);
//   }
// }

var patches = [];

//var testobj = {};
//Object.defineProperty(testobj, 'test', { value: 'testing' });
//console.log('TESTING-----------------------------');
//console.log(testobj);

app.get('/patches', function (req, res) {
  res.json(patches);
});

app.get('/patches/:patchId', function(req, res) {
  //res.send('');
  console.log(req.params);
  if(req.params.patchId) {
    res.json(patches[req.params.patchId]);
  }
});

app.listen(3000);