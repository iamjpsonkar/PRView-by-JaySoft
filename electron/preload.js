const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronEnv', {
  apiBase: 'http://127.0.0.1:8121',
});
