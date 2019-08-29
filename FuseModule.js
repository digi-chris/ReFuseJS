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

class FuseModule {
    constructor(data) {
      //console.log(data.__private);
      var tobj = this;
      this.Type = data.presetMessageType;
      this.Data = data;
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
            if(data.__data[data.__propertyIndex[propertyName]] !== value) {
              console.log('setting value ' + propertyName + ' = ' + value);
              data.__data[data.__propertyIndex[propertyName]] = value;
              //console.log(data.__data);
              if(tobj.onupdate) {
                tobj.onupdate(data);
              }
            }
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

  module.exports = FuseModule;