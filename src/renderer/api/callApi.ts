declare const electron: {
  ipcRenderer: {
    on: any;
    once: any;
    send: any;
  }
}

/**
 * 调用 API 方法
 * @param type
 * @param params
 */
export default async function callApi(type: string, params: any) {
  const promise = new Promise((resolve, reject) => {
    electron.ipcRenderer.send('ipc-api-request', { type, params });
    electron.ipcRenderer.once('ipc-api-response', (t, res) => {
      if (type === t) {
        if (res.code === 0) {
          resolve(res)
        } else {
          reject(res)
        }
      }
    })
  });
  const result = await promise;
  return result;
}
