import callApi from "./callApi";

export async function getFileListRecursive(dir: string) {
  const res = await callApi('getFileList', dir);
  return res;
}

export async function getDirTree(dir: string) {
  const res = await callApi('getDirTree', dir);
  return res;
}

/**
 * 根据路径获取stats对象
 * @param dir
 */
export async function getFileStats(dir: string): Promise<any> {
  const res = await callApi('getFileStats', dir);
  return res;
}

/**
 * 根据文件路径使用electron shell打开文件
 * @param path
 */
export async function openFile(path: string) {
  const res = await callApi('openFile', path);
  return res;
}

/**
 * 读取Excel文件
 * @param path
 */
export async function readExcel(path: string) {
  const res = await callApi('readExcel', path);
  return res;
}

export async function getThumbnails(params) {
  const res = await callApi('getThumbnails', params);
  return res;
}

export async function getImage(path) {
  const res = await callApi('getImage', path);
  return res;
}

export default {
  getFileListRecursive,
  getDirTree,
  getFileStats,
  readExcel,
  getThumbnails,
  getImage,
}
