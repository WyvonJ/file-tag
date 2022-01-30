const { contextBridge, ipcRenderer } = require('electron');

// import apiHandler from "./api";
// const apiHandler = require('./api')
const validChannels = ['ipc-api-request', 'ipc-api-response'];


contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-api-request', 'ping');
    },
    send(channel, ...args) {
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      }
    },
    on(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
