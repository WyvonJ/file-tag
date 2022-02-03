
export function getSep(): '/' | '\\' {
  return window.navigator.userAgent.match("Mac OS") ? "/" : "\\"
}

export default {
  getSep
}