import dayjs from 'dayjs';
import fs from 'fs/promises';
import path from 'path';
// import * as uuid from "uuid";
import mimeTypes from 'mime-types';
import { generateThumbnails } from '../utils';
import { Stats } from 'fs';
import { shell } from 'electron';
import Xlsx from 'xlsx';
import { sizeToStr } from '../../common/utils';
import sharp from 'sharp';

interface FileDesc {
  name: string;
  path: string;
  size: string;
  type: string;
  fileCreateDate: string;
}

// const imageTypes = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp']
const videoTypes = [
  'mp4',
  'mkv',
  'ts',
  'avi',
  'wmv',
  'm4v',
  'flv',
  'f4v',
  'rm',
  'rmvb',
  'mov',
];
// const audioTypes = ['mp3', 'flac', 'ape', 'ogg', 'wav', 'wma', 'aac']
// 过滤文件
const fileFilter = ['.DS_Store'];

/**
 * 递归获取文件列表
 * @param dir
 */
export async function getFileListRecursive(dir: string): Promise<FileDesc[]> {
  const fileList: FileDesc[] = [];
  async function getFiles(dirPath: string) {
    try {
      const files: string[] = await fs.readdir(dirPath);
      for (const file of files) {
        if (file.split('.').pop() === 'app' || fileFilter.includes(file)) {
          return;
        }
        const data = await fs.stat(path.join(dirPath, file));
        if (data.isFile()) {
          const ext = file?.split('.')?.pop()?.toLowerCase() || '';
          fileList.push({
            name: file,
            path: path.join(dirPath, file),
            size: sizeToStr(data.size),
            type: ext,
            fileCreateDate: dayjs(data.birthtime).format('YYYY-MM-DD HH:mm:ss'),
          });
        }
        if (data.isDirectory()) {
          await getFiles(path.join(dirPath, file));
        }
      }
    } catch (e) {
      console.log('File read error', e);
    }
  }
  await getFiles(dir);
  return fileList;
}

/**
 * 获取当前目录下的所有文件列表
 * @param dir
 */
export async function getFileListCurrent(dir: string): Promise<FileDesc[]> {
  const fileList: FileDesc[] = [];
  try {
    const files: string[] = await fs.readdir(dir);
    for (const file of files) {
      const data = await fs.stat(path.join(dir, file));
      if (data.isFile() && !fileFilter.includes(file)) {
        const ext = file?.split('.')?.pop()?.toLowerCase() || '';
        if (videoTypes.includes(ext)) {
          fileList.push({
            name: file,
            path: path.join(dir, file),
            size: sizeToStr(data.size),
            type: ext,
            fileCreateDate: dayjs(data.birthtime).format('YYYY-MM-DD HH:mm:ss'),
          });
        }
      }
    }
  } catch (e) {
    console.log('File read error', e);
  }
  return fileList;
}

/**
 * 获取目录下的文件列表, 包含文件夹
 * @export
 * @param {string} dir
 * @return {*}
 */
export async function getDirList(dir: string) {
  const dirList: any[] = [];
  try {
    const files = await fs.readdir(dir);
    for (const d of files) {
      const stats = await fs.stat(path.join(dir, d));
      if (d.split('.').pop() !== 'app' && !fileFilter.includes(d)) {
        const ext = d?.split('.')?.pop()?.toLowerCase() || '';
        const isFile = stats.isFile();
        dirList.push({
          name: d,
          path: path.join(dir, d),
          size: sizeToStr(stats.size),
          type: ext,
          fileCreateDate: dayjs(stats.birthtime).format('YYYY-MM-DD HH:mm:ss'),
          isFile,
          isLeaf: isFile,
        });
      }
    }
    return dirList;
  } catch (error) {
    return null;
  }
}

/**
 * 根据路径获取
 * @param dirPath
 * @returns {Promise<*>}
 */
export async function getDirTree(dirPath: string) {
  const name = dirPath.split('/').pop() || '';
  const dirStats = await fs.stat(dirPath);
  if (
    !dirStats.isDirectory() ||
    dirPath.split('.').pop() === 'app' ||
    fileFilter.includes(name)
  ) {
    return [];
  }
  const treeRoot = {
    // id: uuid.v4(),
    parentId: -1,
    name,
    path: dirPath,
    children: [],
  };
  async function getTree(root) {
    if (root) {
      const rootStats = await fs.stat(root.path);
      // 1. 必须为文件夹
      // 2. 必须为非.app文件
      // 3. 特定平台需要排除一些文件夹
      // 4. 只包含所有视频文件
      if (
        !rootStats.isDirectory() ||
        root.path.split('.').pop() === 'app' ||
        fileFilter.includes(root.name)
      ) {
        return;
      }
      const dirs = await fs.readdir(root.path);
      // const realDirs = []
      // for (const dir of dirs) {
      //     const stats = await fs.stat(path.join(root.path, dir))
      //     if (stats.isDirectory() && dir.split('.').pop() !== 'app') {
      //         realDirs.push(dir)
      //     }
      // }
      let children = await Promise.all(
        dirs
          .filter((dir) => !fileFilter.includes(dir))
          .map(async (dir) => {
            const name = dir.split('/').pop();
            const ext = (name?.split('.')?.pop() || '').toLowerCase();
            const stats = await fs.stat(path.join(root.path, dir));
            const node = {
              // id: uuid.v4(),
              name,
              path: path.join(root.path, dir),
              // parentId: root.id,
            };
            if (stats.isDirectory() && dir.split('.').pop() !== 'app') {
              const result = await getTree({
                ...node,
                isLeaf: false,
                isFile: false,
              });
              return result;
            } else if (videoTypes.includes(ext)) {
              return {
                ...node,
                isLeaf: true,
                isFile: true,
                type: ext,
                size: stats.size,
                createDate: stats.birthtime,
              };
            } else {
              return null;
            }
          })
      );
      children = children.filter((v) => v);
      if (children.length) {
        root.children = children.sort((a, b) => {
          if (a.isLeaf === true && b.isLeaf === false) {
            return 1;
          }
          if (a.isLeaf === false && b.isLeaf === true) {
            return -1;
          }
          return 0;
        });
      }
      return root;
    }
  }
  const tree = await getTree(treeRoot);
  return tree;
}

export async function getFileStats(
  dir: string
): Promise<Stats | { isFile: boolean; isDirectory: boolean }> {
  const stats = await fs.stat(dir);
  const isFile = stats.isFile();
  const isDirectory = stats.isDirectory();
  return { ...stats, isFile, isDirectory };
}

export async function openFile(path: string) {
  const message = await shell.openPath(path);
  return message;
}

export async function readExcel(path: string) {
  const file = Xlsx.readFile(path);
  return file;
}

export async function readImageList({ source, options }) {
  try {
    console.log('开始生成缩略图');
    console.time('耗时');
    const images = await generateThumbnails(source, options);
    console.timeEnd('耗时');
    console.log('已生成缩略图');
    return images;
  } catch (e) {
    console.log('生成缩略图 Error', e);
    return e;
  }
}

/**
 * 根据图片路径读取base64字符串
 * @param path
 */
export async function getImage(path: string) {
  try {
    console.log('开始加载图片');
    const image = await fs.readFile(path);
    const data = new Buffer(image).toString('base64');
    console.log('完成加载图片');
    console.log(mimeTypes.lookup(path));
    return `data:${mimeTypes.lookup(path)};base64,${data}`;
  } catch (e) {
    console.log(e);
    return e;
  }
}

export async function renameFile({ oldPath, newPath }) {
  try {
    await fs.rename(oldPath, newPath);
    return true;
  } catch (error) {
    console.log('Failed to rename file', error);
    return false;
  }
}

/**
 * 写入图片到指定的位置
 * @export
 * @param {*} {
 *   dirpath,
 *   filename,
 *   data
 * }
 */
export async function saveImage({ dirpath, filename, data }) {
  try {
    const filepath = path.join(dirpath, filename);
    const compressedFilepath = path.join(dirpath, '[C]' + filename);
    await fs.writeFile(filepath, data, 'base64');
    // 写完文件后进行压缩
    await sharp(filepath)
      .jpeg({
        quality: 90,
      })
      .toFile(compressedFilepath);
    await fs.rm(filepath);
    await fs.rename(compressedFilepath, filepath)
    return true;
  } catch (error) {
    console.log('Failed to write iamge', error);
    return false;
  }
}

export default {
  getFileListRecursive,
  getFileListCurrent,
  getDirList,
  getDirTree,
  getFileStats,
  openFile,
  readExcel,
  readImageList,
  getImage,
  renameFile,
  saveImage,
};
