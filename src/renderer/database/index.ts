import Dexie, { Table } from 'dexie';

/**
 * 标签描述
 */
export interface FtTag {
  id?: number;
  name: string;
  color: string;
  icon: string;
  priority: number;
  fileIds?: number[];
  desc?: string; // 标签描述
  star?: boolean; // 是否收藏
}

/**
 * 文件描述
 */
export interface FtFile {
  id: number;
  name: string;
  path: string;
  size: string;
  tagIds: number[];
  remark: string; // 用户评论字段
  rate: number; // 给文件打分
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
  ftTag!: Table<FtTag, number>;

  ftFile!: Table<FtFile, number>;

  constructor() {
    super('FileTagDataBase');
    this.version(1).stores({
      ftTag: '++id, fileIds',
      ftFile: '++id, tagIds',
    });
  }

  async getTagById(id: number) {
    console.log(id)
  }

  /**
   * 列表查询
   * @param params
   */
  async getTags({ page, size }: TagPageParams): Promise<PageResult<FtTag>> {
    const pageResult: PageResult<FtTag> = {
      page,
      size,
      list: [],
      total: 0,
    };
    try {
      const offset = (page - 1) * size;
      const list = await this.ftTag.offset(offset).limit(size).toArray();
      const total = await this.ftTag.count();
      pageResult.list = list;
      pageResult.total = total;
    } catch (e) {
      console.log(e);
    }
    return pageResult;
  }

  /**
   * 添加标签
   * @param tag
   */
  async addTag(tag: FtTag): Promise<number> {
    try {
      const id = await this.ftTag.add(tag);
      return id;
    } catch (e) {
      return -1;
    }
  }

  /**
   * 更新标签
   * @param tag
   */
  async updateTag(tag: FtTag) {
    if (!tag || !tag.id) {
      return null;
    }
    try {
      await this.ftTag.where({ id: tag.id }).modify(tag);
    } catch (e) {
      return e;
    }
  }

  /**
   * 删除标签，需要将标签以及关联了该标签的所有文件下的该标签id也删除
   * @param id
   */
  deleteTag(id: number) {
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
            await this.ftFile.update(file.id, {
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
   * 添加文件
   * @param files
   */
  async addFiles(files: Array<FtFile>) {
    console.log(files);
  }

  /**
   * 删除文件
   * 需要从关联的所有标签中删除对应的文件id
   * @param id
   */
  async deleteFile(id: number) {
    console.log(id)
  }
}

export const db = new FileTagDataBase();

// 数据库连接初始化完成调用
db.on('populate', () => {});
