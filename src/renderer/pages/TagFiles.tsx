import "./TagFiles.scss";
import { db, FtFile, FtTag } from "../database";
import { useEffect, useState } from "react";
import Tag from "../components/Tag";
import { Button } from "antd";
import { openFile } from "../api";

function TagFiles() {
  const [tagList, setTagList] = useState<FtTag[]>([]);

  const [fileList, setFileList] = useState<FtFile[]>([]);

  const [selectedTags, setSelectedTags] = useState<FtTag[]>([]);

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
    console.log(msg)
    // if (msg) {
    //   message.error(msg);
    // }
  }

  useEffect(() => {
    getFilesByTagIds();
  }, [selectedTags.length]);

  useEffect(() => {
    getTagList();
  }, []);

  return (
    <div className="tag-files">
      <div className="tag-files__tags">
        {tagList.map((tag) => (
          <Tag
            key={tag.id}
            name={tag.name}
            color={tag.color}
            icon={tag.icon}
            desc={tag.desc}
            onClick={() => handlerClickTag(tag)}
          ></Tag>
        ))}
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
        <div className="tag-files__list">
          {fileList.map((file) => (
            <Button
              key={file.id}
              type="link"
              onClick={() => handlerClickFile(file)}
            >
              {file.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TagFiles;
