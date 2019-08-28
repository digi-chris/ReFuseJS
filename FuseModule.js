class FuseModule {
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

  module.exports = FuseModule;