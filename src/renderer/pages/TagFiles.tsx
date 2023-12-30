import { db, FtFile, FtTag } from '../database';
import { useEffect, useState } from 'react';
import Tag from '../components/Tag';
import { Button, Col, Empty, Input, message, Row, Image, Tooltip } from 'antd';
import { openFile } from '../api';
import { getSep } from 'renderer/utils/commonUtils';
import MaterialIcon from 'renderer/components/MaterialIcon';
import './TagFiles.scss';
/**
 * 标签文件
 * @return {*}
 */
const TagFiles = () => {
  const [tagList, setTagList] = useState<FtTag[]>([]);
  const [fileList, setFileList] = useState<FtFile[]>([]);
  const [selectedTags, setSelectedTags] = useState<FtTag[]>([]);
  const [searchValue, setSearchValue] = useState('');

  async function getTagList() {
    const list = await db.getTagList();
    setTagList(list);
  }

  function handlerClickTag(tag: FtTag) {
    if (!selectedTags.find(({ id }) => id === tag.id)) {
      setSelectedTags(selectedTags.concat([tag]));
    }
  }

  async function getFilesByTagIds() {
    // @ts-ignore
    const list = await db.getFilesByTagIds(selectedTags.map(({ id }) => id));
    setFileList(list || []);
  }

  function handlerDelTag(tag) {
    setSelectedTags(selectedTags.filter(({ id }) => id !== tag.id));
  }

  async function handlerClickFile(file) {
    console.log(file);
    const msg: any = await openFile(file.path);
    if (msg.error) {
      message.error(msg);
    }
  }
  /**
   * 搜索文件
   * @param {*} v
   */
  async function handlerSearch(v) {
    console.log(v);
  }

  useEffect(() => {
    getFilesByTagIds();
  }, [selectedTags.length]);

  useEffect(() => {
    getTagList();
  }, []);

  const thumbnailPath = localStorage.getItem('thumbnail_path');

  return (
    <div className="tag-files">
      <Row>
        <Col span={1}>
          <Button onClick={() => getTagList()}>
            <MaterialIcon icon="refresh" />
          </Button>
        </Col>
        <Col span={6} style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="搜索文件"
            value={searchValue}
            onChange={(v) => setSearchValue(v.target.value)}
            onSearch={handlerSearch}
          />
        </Col>
      </Row>

      <div className="tag-files__tags">
        {tagList.length ? (
          tagList.map((tag) => (
            <Tag
              key={tag.id}
              name={tag.name}
              color={tag.color}
              icon={tag.icon}
              desc={tag.desc}
              onClick={() => handlerClickTag(tag)}
            ></Tag>
          ))
        ) : (
          <Empty
            description="暂无标签数据, 请先在标签管理中添加"
            style={{ marginTop: '120px' }}
          />
        )}
      </div>
      <div className="tag-files__files">
        <div className="tag-files__search">
          {selectedTags.map((tag) => (
            <Tag
              key={tag.id}
              name={tag.name}
              color={tag.color}
              icon={tag.icon}
              desc={tag.desc}
              closable={true}
              onClose={() => handlerDelTag(tag)}
            ></Tag>
          ))}
        </div>
        <ul className="tag-files__list">
          {fileList.map((file) => (
            <li className="tag-files__list--item" key={file.id}>
              <div className="tag-files__list--image">
                {file.thumbnail ? (
                  <Image
                    src={`file:///${thumbnailPath}${getSep()}${file.thumbnail}`}
                  />
                ) : (
                  <Empty description="暂无缩略图" />
                )}
              </div>
              <Tooltip title={file.name}>
                <div
                  className="tag-files__list--info"
                  onClick={() => handlerClickFile(file)}
                >
                  <span className="tag-files__list--name">{file.name}</span>
                </div>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TagFiles;
