import callApi from "./callApi";

export async function getFileListRecursive(dir: string) {
  const res = await callApi('getFileListRecursive', dir);
  return res;
}

/**
 * 获取指定文件夹下的所有文件信息
 * @param dir
 */
export async function getFileListCurrent(dir: string) {
  const res = await callApi('getFileListCurrent', dir);
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

export async function readImageList(params) {
  const res = await callApi('readImageList', params);
  return res;
}

export async function getImage(path) {
  const res = await callApi('getImage', path);
  return res;
}

export async function renameFile(path) {
  const res = await callApi('renameFile', path);
  return res;
}

export async function saveImage(params: { dirpath: string,filename: string, data: string }) {
  const res = await callApi('saveImage', params);
  return res;
}

export async function getDirList(params: string) {
  const res = await callApi('getDirList', params);
  return res;
}

export default {
  getFileListRecursive,
  getFileListCurrent,
  getDirTree,
  getFileStats,
  openFile,
  readExcel,
  readImageList,
  getImage,
  renameFile,
  saveImage,
  getDirList,
}
