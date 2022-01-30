import dayjs from "dayjs";
import fs from "fs/promises";
import path from "path";
// import * as uuid from "uuid";
import mimeTypes from 'mime-types'
import { generateThumbnails, sizeToStr } from '../utils';
import { Stats } from 'fs';
import {shell} from 'electron'
import Xlsx from 'xlsx'

interface FileDesc {
  name: string;
  path: string;
  size: string;
  type: string;
  fileCreateDate: string;
}

// 过滤文件
const fileFilter = ['.DS_Store']

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
        if (file.split(".").pop() === "app" || fileFilter.includes(file)) {
          return;
        }
        const data = await fs.stat(path.join(dirPath, file));
        if (data.isFile()) {
          const ext = file?.split(".")?.pop()?.toLowerCase() || "";
          fileList.push({
            name: file,
            path: path.join(dirPath, file),
            size: sizeToStr(data.size),
            type: ext,
            fileCreateDate: dayjs(data.birthtime).format("YYYY-MM-DD HH:mm:ss"),
          });
        }
        if (data.isDirectory()) {
          await getFiles(path.join(dirPath, file));
        }
      }
    } catch (e) {
      console.log("File read error", e);
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
        const ext = file?.split(".")?.pop()?.toLowerCase() || "";
        fileList.push({
          name: file,
          path: path.join(dir, file),
          size: sizeToStr(data.size),
          type: ext,
          fileCreateDate: dayjs(data.birthtime).format("YYYY-MM-DD HH:mm:ss"),
        });
      }
    }
  } catch (e) {
    console.log("File read error", e);
  }
  return fileList;
}

// const imageTypes = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp']
// const videoTypes = ['mp4', 'mkv', 'ts', 'avi', 'wmv', 'm4v', 'flv', 'f4v', 'rm', 'rmvb', 'mov']
// const audioTypes = ['mp3', 'flac', 'ape', 'ogg', 'wav', 'wma', 'aac']
/**
 * 根据路径获取
 * @param dirPath
 * @returns {Promise<*>}
 */
export async function getDirTree(dirPath: string) {
  const name = dirPath.split("/").pop() || '';
  const dirStats = await fs.stat(dirPath);
  if (!dirStats.isDirectory() || dirPath.split(".").pop() === "app" || fileFilter.includes(name)) {
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
      if (!rootStats.isDirectory() || root.path.split(".").pop() === "app" || fileFilter.includes(root.name)) {
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
      const children = await Promise.all(
        dirs.filter((dir) => !fileFilter.includes(dir)).map(async (dir) => {
          const stats = await fs.stat(path.join(root.path, dir));
          const node = {
            // id: uuid.v4(),
            name: dir.split("/").pop(),
            path: path.join(root.path, dir),
            // parentId: root.id,
          };
          if (stats.isDirectory() && dir.split(".").pop() !== "app") {
            const result = await getTree({
              ...node,
              isLeaf: false,
              isFile: false,
            });
            return result;
          } else {
            return {
              ...node,
              isLeaf: true,
              isFile: true,
            };
          }
        })
      );
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

export async function getFileStats(dir: string): Promise<Stats | {isFile : boolean, isDirectory: boolean}> {
  const stats = await fs.stat(dir);
  const isFile = stats.isFile()
  const isDirectory = stats.isDirectory()
  return { ...stats, isFile, isDirectory };
}

export async function openFile(path: string) {
  const message = await shell.openPath(path);
  return message
}

export async function readExcel(path: string) {
  const file = Xlsx.readFile(path)
  return file;
}

export async function getThumbnails({ source, options }) {
  try {
    console.log('开始生成缩略图')
    console.time('耗时')
    const image = await generateThumbnails(source, options);
    console.timeEnd('耗时')
    console.log('已生成缩略图')
    return image;
  } catch (e) {
    console.log('getThumbnails Error', e)
    return e
  }
}

/**
 * 根据图片路径读取base64字符串
 * @param path
 */
export async function getImage(path: string) {
  try {
    console.log('开始加载图片')
    const image = await fs.readFile(path);
    const data = new Buffer(image).toString('base64');
    console.log('完成加载图片')
    console.log(mimeTypes.lookup(path))
    return `data:${mimeTypes.lookup(path)};base64,${data}`;
  } catch (e) {
    console.log(e)
    return e;
  }
}

export default {
  getFileListRecursive,
  getDirTree,
  getFileStats,
  openFile,
  readExcel,
  getThumbnails,
  getImage
};