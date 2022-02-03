export function getSep(): '/' | '\\' {
  return window.navigator.userAgent.match('Mac OS') ? '/' : '\\';
}

/**
 * 找出文件树的不同
 * @export
 * @param {*} oldArr
 * @param {*} newArr
 * @param {*} compareKey
 * @return {*} 
 */
export function diffFileTree(oldArr, newArr, compareKey) {
  const deleted: any[] = [];
  const added: any[] = [];
  oldArr.forEach((o) => {
    if (!newArr.find((item) => item[compareKey] === o[compareKey])) {
      deleted.push(o);
    }
  });
  newArr.forEach((n) => {
    if (!oldArr.find((item) => item[compareKey] === n[compareKey])) {
      added.push(n);
    }
  });
  return {
    deleted,
    added,
  };
}

export default {
  getSep,
  diffFileTree,
};
