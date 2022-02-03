import Dexie, { Table } from 'dexie';
import 'dexie-export-import';
import dayjs from 'dayjs';

/**
 * 标签描述
 */
export interface FtTag {
  id?: number;
  name?: string;
  color?: string;
  icon?: string;
  priority?: number;
  fileIds?: number[];
  desc?: string; // 标签描述
  star?: boolean; // 是否收藏
  createDate?: number | string | undefined; // 创建时间戳
  updateDate?: number | string | undefined; // 更新时间戳
}

/**
 * 文件描述
 */
export interface FtFile {
  id?: number;
  parentId?: number; // 父级id
  name?: string;
  path?: string;
  size?: string;
  tagIds?: number[]; // 关联的标签id
  remark?: string; // 用户评论字段
  rate?: number; // 给文件打分
  star?: boolean; // 是否收藏
  isFile?: boolean; // 是否为文件/文件夹
  createDate?: number; // 创建时间戳
  updateDate?: number; // 更新时间戳
  children?: FtFile[];
  thumbnail?: string; // 缩略图地址
}

export interface PageResult<T> {
  page: number;
  size: number;
  total: number;
  list: Array<T>;
}

export interface PageParams {
  page: number;
  size: number;
}

export interface TagPageParams extends PageParams {
  name?: string;
  color?: string;
  icon?: string;
}

export interface FilePageParams extends PageParams {
  name?: string;
}

export class FileTagDataBase extends Dexie {
  [x: string]: any;
  ftTag!: Table<FtTag, number>;

  ftFile!: Table<FtFile, number>;

  constructor() {
    super('FileTagDataBase');
    this.version(2).stores({
      ftTag: '++id, name, color, star, priority, *fileIds',
      ftFile: '++id, parentId, name, path, star, rate, *tagIds',
    });
  }

  async getTagById(id: number) {
    const result = await this.ftTag.get(id);
    if (result) {
      return result;
    }
    return null;
  }

  /**
   * 根据id数组找到所有tag
   * @param ids
   */
  async getTagByIds(ids: number[]) {
    const result = await this.ftTag.bulkGet(ids);
    return result;
  }

  /**
   * 列表查询
   * @param params
   */
  async getTagPage({ page, size }: TagPageParams): Promise<PageResult<FtTag>> {
    const pageResult: PageResult<FtTag> = {
      page,
      size,
      list: [],
      total: 0,
    };
    try {
      const offset = (page - 1) * size;
      const list = await this.ftTag
        .orderBy('color')
        .offset(offset)
        .limit(size)
        .toArray();
      const total = await this.ftTag.count();
      list.forEach((item) => {
        const { createDate, updateDate } = item;
        if (createDate) {
          item.createDate = dayjs(createDate).format('YYYY-MM-DD HH:mm:ss');
        }
        if (updateDate) {
          item.updateDate = dayjs(updateDate).format('YYYY-MM-DD HH:mm:ss');
        }
      });
      pageResult.list = list;
      pageResult.total = total;
    } catch (e) {
      console.log(e);
    }
    return pageResult;
  }

  /**
   * 获取全部的标签
   */
  async getTagList(): Promise<Array<FtTag>> {
    let result: FtTag[] = [];
    try {
      result = await this.ftTag.toArray();
    } catch (e) {
      console.log('getTagList Error', e);
    }
    return result;
  }

  async attachTagsToFile(fileId: number, tagIds: number[]) {
    try {
      // 查找文件信息
      const [file] = await this.ftFile.where({ id: fileId }).toArray();
      console.log(file);
      let newTagIds = tagIds;
      if (Array.isArray(file.tagIds)) {
        newTagIds = Array.from(new Set([...tagIds, ...file.tagIds]));
      }
      // 给文件加上标签信息
      await this.ftFile.update(fileId, {
        tagIds: newTagIds,
      });
      // 给对应的标签加上文件信息
      await Promise.all(
        newTagIds.map(async (tagId) => {
          // 先查出标签
          const tag = await this.getTagById(tagId);
          if (tag) {
            const { fileIds } = tag;
            let newFileIds = [fileId];
            if (Array.isArray(fileIds)) {
              newFileIds = Array.from(new Set([...fileIds, fileId]));
            }
            await this.updateTag({
              id: tagId,
              fileIds: newFileIds,
            });
          } else {
            throw new Error('Tag does not exist, tag id is ' + tagId);
          }
        })
      );
    } catch (e) {
      console.log('attachTagToFile', e);
    }
  }

  /**
   * 添加标签
   * @param tag
   */
  async addTag(tag: FtTag): Promise<number> {
    try {
      const createDate = Date.now();
      const id = await this.ftTag.add({ ...tag, createDate });
      return id;
    } catch (e) {
      return -1;
    }
  }

  /**
   * 批量添加标签，用于上传
   * @param tags
   */
  async bulkAddTags(tags: FtTag[]) {
    try {
      const createDate = Date.now();
      const ids = await this.ftTag.bulkAdd(
        tags.map((tag) => ({ ...tag, createDate }))
      );
      return ids;
    } catch (e) {
      return -1;
    }
  }

  /**
   * 更新标签
   * @param tag
   */
  async updateTag({ id, ...restTag }: FtTag) {
    if (!id) {
      return null;
    }
    const updateDate = Date.now();
    try {
      await this.ftTag.update(id, {
        ...restTag,
        updateDate,
      });
      console.log(`Update tag success width tag id: ${id}`);
    } catch (e) {
      return e;
    }
  }

  /**
   * 删除标签，需要将标签以及关联了该标签的所有文件下的该标签id也删除
   * @param id
   */
  async deleteTag(id: number) {
    return this.transaction('rw', this.ftTag, this.ftFile, async () => {
      try {
        const tag = await this.ftTag.where({ id }).first();
        if (tag) {
          const { fileIds = [] } = tag;
          const files = await this.ftFile.where(fileIds).toArray();
          // eslint-disable-next-line no-restricted-syntax
          for (const file of files) {
            const { tagIds = [] } = file;
            const newTagIds = tagIds.filter((tagId) => tagId !== id);
            // eslint-disable-next-line no-await-in-loop
            await this.ftFile.update(file.id as number, {
              tagIds: newTagIds,
            });
          }
        }
      } catch (e) {
        return e;
      }
    });
  }

  /**
   * 添加树文件
   * @param files
   */
  async addTreeFiles(files: Array<FtFile>) {
    const ids = await Promise.all(
      files.map(async ({ children, ...file }) => {
        const id = await this.ftFile.add(file);
        if (children?.length) {
          (children || []).forEach((child: FtFile) => {
            child.parentId = id;
          });
          await this.addTreeFiles(children);
        }
        return id;
      })
    );
    console.log('addTreeFiles', ids);
    return ids;
  }

  /**
   * 新增文件
   * @param {FtFile} file
   * @return {*}
   * @memberof FileTagDataBase
   */
  async addFile(file: FtFile) {
    try {
      const id = await this.ftFile.add(file);
      return id;
    } catch (error) {
      console.log('新增文件失败', error);
      return null;
    }
  }

  /**
   * 获取到文件树
   * 1. 获取所有根节点 parentId==-1
   * 2.
   */
  async getTree() {
    // Find out all the root nodes, where their parentIds are -1
    const roots = await this.ftFile
      .where({
        parentId: -1,
      })
      .toArray();
    // Get children
    const getChildren = async (node) => {
      // 文件夹
      if (node && !node.isFile) {
        const { id: nodeId } = node;
        // 查找库中文件夹的子节点
        const dbChildren = await this.ftFile
          .where({ parentId: nodeId })
          .toArray();
        // fs读取文件夹下的所有文件, 进行一次diff
        // const dirChildren = await fs.readdir(node.path);
        // const dirChildren = await getFileListCurrent(node.path);
        if (dbChildren.length) {
          node.children = await Promise.all(
            dbChildren.map(async (child) => await getChildren(child))
          );
        }
      }
      return node;
    };
    const tree = await Promise.all(
      roots.map(async (root) => await getChildren(root))
    );
    return tree;
  }

  /**
   * 删除文件
   * 需要从关联的所有标签中删除对应的文件id
   * @param id
   */
  async deleteFile(id: number) {
    try {
      this.transaction('rw', this.ftFile, this.ftTag, async () => {
        // 解除所有关联的tag
        const { tagIds = [] } = await this.getFileById(id);
        for (const tagId of tagIds) {
          const tag = await this.getTagById(tagId);
          if (tag) {
            await this.updateTag({
              id: tagId,
              fileIds: tag.fileIds?.filter((fileId) => fileId !== id),
            });
          }
        }
        await this.ftFile.delete(id);
      });
    } catch (error) {
      console.log('文件删除失败', error);
    }
  }

  /**
   * 删文件夹
   * 递归删文件和文件夹
   * @param {number} id
   * @memberof FileTagDataBase
   */
  async deleteDir(id: number) {
    
  }

  async addDir() {

  }

  async updateFile(file: FtFile) {
    if (!file || !file.id) {
      return;
    }
    await this.ftFile.update(file.id, file);
  }

  /**
   * 删除文件绑定的标签
   * @param fileId
   * @param tagIds
   */
  async delTagAttachment(fileId: number, tagIds: number[]) {
    try {
      // 通过事务完成
      await this.transaction('rw', this.ftFile, this.ftTag, async () => {
        console.log('delTagAttachment');
        const file = await this.getFileById(fileId);
        console.log(file.tagIds, tagIds);
        const newTagIds = file.tagIds.filter(
          (tagId) => !tagIds.includes(tagId)
        );
        console.log('更新文件的标签关联 newTagIds', newTagIds);
        // 更新文件的标签关联
        await this.updateFile({
          id: fileId,
          tagIds: newTagIds,
        });
        console.log('更新标签的文件关联 tagIds', tagIds);
        // 更新标签的文件关联
        await Promise.all(
          tagIds.map(async (tagId) => {
            const tag = await this.getTagById(tagId);
            const { fileIds = [] } = tag || {};
            const newFileIds = fileIds.filter((id) => id !== fileId);
            console.log('newFileIds', newFileIds);
            await this.updateTag({
              id: tagId,
              fileIds: newFileIds,
            });
          })
        );
      });
    } catch (e) {
      console.log('delTagAttachment', e);
    }
  }

  /**
   * 根据id获取文件
   * 包含标签信息
   * @param id
   */
  async getFileById(id: number): Promise<any> {
    try {
      const [file] = await this.ftFile.where({ id }).toArray();
      if (!file) return null;
      // 查询所有tag信息
      const tagList = await this.getTagByIds(file.tagIds || []);
      return { ...file, tagList };
    } catch (e) {
      return null;
    }
  }

  async getFilesByIds(ids: number[]): Promise<any> {
    const files = await db.ftFile.bulkGet(ids);
    return files;
  }

  /**
   * 根据标签ids获取文件，多个id则获取交集
   * @param tagIds
   */
  async getFilesByTagIds(tagIds: number[]): Promise<Array<FtFile>> {
    if (tagIds.length === 0) {
      return [];
    }
    const tags = (await this.getTagByIds(tagIds)) as Array<FtTag>;
    // 求所有的文件交集
    const intersectFileIds = getIntersection(
      tags.map(({ fileIds = [] }) => fileIds) || []
    );
    const files = await this.getFilesByIds(intersectFileIds);
    console.log(files);
    return files;
  }

  /**
   * 获取所有文件 即isFile为true
   */
  async getFileList() {
    const files = await this.ftFile.toArray();
    return files.filter(({ isFile }) => isFile);
  }

  async getDirList() {}
}

function getIntersection(arr: Array<Array<number>>) {
  return arr.reduce((a, b) => a.filter((c) => b.includes(c)));
}

export const db = new FileTagDataBase();

// 数据库连接初始化完成调用
db.on('populate', () => {});

export async function importDatabase(data) {
  try {
    // @ts-ignore
    await Dexie.import(data);
    return true;
  } catch (error) {
    console.log('Import database error', error);
    return false;
  }
}
