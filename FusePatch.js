class FusePatch {
    constructor(name) {
        this.Name = name;
        this.Modules = [];
    }
  
    AddModule(module) {
        this.Modules.push(module);
    }
}

module.exports = FusePatch;