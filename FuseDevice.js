var MessageProcessor = require('./MessageProcessor.js');
const os = require('os');

class FuseDevice {
    constructor(usbDevice, messages, operators) {
        this.Devices = {};
        this.Presets = [];
        var msgProc = new MessageProcessor(this, messages, operators);
        this.msgProc = msgProc;

        function sendBuffer(buffer) {
            //if(os.platform() === "win32") {
                buffer.unshift(0);
            //}
            usbDevice.write(buffer);
        }

        usbDevice.on("data", msgProc.ReadMessage);

        var handshake = Array(64).fill(0x00);
        handshake[1] = 0xC3;
        sendBuffer(handshake);
        console.log("Handshake: " + new Buffer.from(usbDevice.readSync()).toString('ascii'));

        var handshake2 = Array(64).fill(0x00);
        handshake2[0] = 0x1A;
        handshake2[1] = 0xC1;
        sendBuffer(handshake2);
        console.log("Handshake 2: " + new Buffer.from(usbDevice.readSync()).toString('ascii'));

        var handshake3 = Array(64).fill(0x00);
        handshake3[0] = 0xFF;
        handshake3[1] = 0xC1;
        sendBuffer(handshake3);
    }

    SendPatch(patchData) {
        this.msgProc.Build(patchData);
    }
}

module.exports = FuseDevice;