import fileHandlers from './file'

const handlers = {
  ...fileHandlers
}

export default async function apiHandler(event: any, {type, params}) {
  console.log(`Api Handler type is ${type}`)
  const handler = handlers[type];
  let response = {
    code: 500,
    msg: 'fail',
    data: null,
    error: null
  };
  if (typeof handler === 'function') {
    try {
      const res = await handler(params)
      response = {
        code: 0,
        data: res,
        msg: 'success',
        error: null
      }
    } catch (e) {
      console.log(e)
      response.error = e as any;
    }
  }
  // console.log(type, response)
  event.reply('ipc-api-response', type, response)
  // event.sender.sendSync('ipc-api-response', type, response)
}
