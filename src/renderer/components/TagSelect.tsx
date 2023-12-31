import Tag from "./Tag";
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { db, FtTag } from "../database";
import './TagSelect.scss'

function TagSelect({  selectedKeys = [] }: any, ref) {
  const [tagList, setTagList] = useState<FtTag[]>([]);
  const [selected, setSelected] = useState<FtTag[]>([]);

  async function getTagList() {
    const list = await db.getTagList();
    // 过滤掉已选择的
    setTagList(list.filter(({ id }) => !selectedKeys.includes(id)));
    if (Array.isArray(selectedKeys)) {
      // @ts-ignore
      setSelected(selectedKeys.map((key) => list.find(({ id }) => id === key)))
    }
  }

  function handlerSelect(tag) {
    if (!selected.find(({ id }) => tag.id === id)) {
      setSelected(selected.concat([tag]))
    }
  }
  function handlerCancelSelect(tag) {
    setSelected(selected.filter(({ id }) => tag.id !== id))
  }

  useEffect(() => {
    getTagList();
  }, [selectedKeys]);

  useImperativeHandle(ref, () => ({
    selected,
    getSelectedTags() {
      return selected;
    },
    setSelectedTags(tagIds) {
      console.log('tagIds', tagIds);
    },
  }))

  return (
    <div className="tag-select">
      <h2>已选标签</h2>
      <div className='tag-select__selected'>
        {selected.map((tag) => (
          <Tag
            key={tag.id}
            name={tag.name}
            color={tag.color}
            icon={tag.icon}
            closable={true}
            onClose={() => handlerCancelSelect(tag)}
            desc={tag.desc}
          ></Tag>
        ))}
      </div>
      <h2>全部标签</h2>
      <div className='tag-select__all'>
        {tagList.map((tag) => (
          <Tag
            key={tag.id}
            name={tag.name}
            color={tag.color}
            icon={tag.icon}
            onClick={() => handlerSelect(tag)}
            desc={tag.desc}
          ></Tag>
        ))}
      </div>
    </div>
  );
}

export default forwardRef(TagSelect);
