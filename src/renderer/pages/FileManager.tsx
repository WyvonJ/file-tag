import { Button, message, Modal, Tree } from "antd";
import Draggable from "react-draggable";
import { useEffect, useRef, useState } from "react";
import "./FileManager.scss";
import { getDirTree, getFileStats } from "../api";
import { db, FtFile, FtTag } from "../database";
import MaterialIcon from "../components/MaterialIcon";
import TagSelect from "../components/TagSelect";
import Tag from "../components/Tag";

export default function FileManager() {
  const [treeData, setTreeData] = useState<any[]>([]);
  // 当前选中的文件
  const [currentFile, setCurrentFile] = useState<
    FtFile & { tagList: Array<FtTag> }
  >({
    name: "",
    path: "",
    isFile: true,
    tagList: [],
  });

  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });

  const tagSelectRef = useRef<typeof TagSelect>();

  const draggleRef: any = useRef();

  const [tagModalVisible, setTagModalVisible] = useState(false);

  /**
   * 保存树到数据库中
   * 递归读取数据，根据上一次生成的id
   * @param data
   */
  async function saveTreeData(data: FtFile[]) {
    const result = await db.addTreeFiles(data);
    console.log("saveTreeData", result);
    return result;
  }

  async function handlerDrop(e) {
    e.preventDefault();
    const [{ path }] = e.dataTransfer.files;

    const { data: stats } = await getFileStats(path);

    if (stats.isFile) {
      message.error("请拖拽文件夹");
      return;
    }

    Modal.confirm({
      title: "提示",
      content: `将添加${path}文件夹，是否确认`,
      centered: true,
      onOk: async () => {
        try {
          const { data }: any = await getDirTree(path);
          // 保存树到数据库
          const treeData = await saveTreeData([data]);
          console.log(JSON.stringify(data, null, 2));
          setTreeData(treeData);
        } catch (e) {
          console.log(e);
        }
      },
    });
  }

  function handlerDragEnter(e) {
    e.preventDefault();
  }

  function handlerDragOver(e) {
    e.preventDefault();
  }

  async function handlerSelectTreeNode(id) {
    const file = await db.getFileById(id);
    if (file) {
      console.log("file", file);
      setCurrentFile(file);
    } else {
      message.error("找不到该文件");
    }
  }

  /**
   * 添加
   */
  function handlerAddTag() {
    if (!currentFile.id) {
      message.info("请选择文件");
      return;
    }
    setTagModalVisible(true);
  }

  /**
   * 给选定文件贴上标签
   */
  async function handlerAddTagsToFile() {
    const { selected = [] }: any = tagSelectRef.current;
    const selectedIds = selected.map(({ id }) => id);
    if (!currentFile?.id) {
      message.error("请选择文件");
      return;
    }
    await db.attachTagsToFile(currentFile.id, selectedIds);
    message.success("添加标签成功");
    setTagModalVisible(false);
    handlerSelectTreeNode(currentFile.id);
    console.log("selectedIds", selectedIds, currentFile);
  }

  /**
   * 加载树
   * 取出所有的文件数据，构建树
   */
  async function loadTree() {
    const hide = message.loading("加载目录数据中...");
    const result = await db.getTree();
    setTreeData(result);
    hide();
  }

  // 删除文件绑定的标签
  async function handlerDelTagAttachment(id, name) {
    Modal.confirm({
      title: "提示",
      centered: true,
      content: `将删除${name}标签，是否确认`,
      onOk: async () => {
        if (currentFile && currentFile.id) {
          await db.delTagAttachment(currentFile.id, [id]);
          message.success(`删除${name}标签成功`);
          handlerSelectTreeNode(currentFile.id);
        }
      },
    });
  }

  useEffect(() => {
    loadTree();
  }, []);

  return (
    <div className="file-manager">
      <div className="file-manager__directories">
        <div
          className="file-manager__directories--drop"
          onDrop={handlerDrop}
          onDragEnter={handlerDragEnter}
          onDragOver={handlerDragOver}
        >
          <span>Drag directory to start.</span>
        </div>
        <div className="file-manager__directories--tree">
          {treeData?.length ? (
            <Tree.DirectoryTree
              onSelect={(_, { node }) => {
                const { isFile, id }: any = node;
                if (isFile) {
                  handlerSelectTreeNode(id);
                }
              }}
              treeData={treeData}
              fieldNames={{
                key: "id",
                title: "name",
              }}
            />
          ) : null}
        </div>
      </div>
      {/* 文件信息 */}
      <div className="file-manager__files">
        <h1>{currentFile.name}</h1>
        <h2>{currentFile.path}</h2>
      </div>
      <div className="file-manager__manage">
        <Button
          onClick={handlerAddTag}
          shape="circle"
          size="large"
          style={{
            marginBottom: "12px",
          }}
        >
          <MaterialIcon icon="add" />
        </Button>
        <div className="file-manager__files--tags">
          {currentFile.tagList.map((tag) => (
            <Tag
              key={tag.id}
              name={tag.name}
              color={tag.color}
              icon={tag.icon}
              desc={tag.desc}
              closable={true}
              onClose={() => handlerDelTagAttachment(tag.id, tag.name)}
            ></Tag>
          ))}
        </div>
      </div>

      <Modal
        centered={true}
        visible={tagModalVisible}
        title="请选择标签"
        onCancel={() => setTagModalVisible(false)}
        onOk={handlerAddTagsToFile}
        width="80%"
        modalRender={(modal) => (
          <Draggable
            bounds={bounds}
            onStart={(_event, uiData) => {
              const { clientWidth, clientHeight } =
                window.document.documentElement;
              const targetRect = draggleRef.current?.getBoundingClientRect();
              if (!targetRect) {
                return;
              }
              setBounds({
                left: -targetRect.left + uiData.x,
                right: clientWidth - (targetRect.right - uiData.x),
                top: -targetRect.top + uiData.y,
                bottom: clientHeight - (targetRect.bottom - uiData.y),
              });
            }}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <TagSelect ref={tagSelectRef} selectedKeys={currentFile.tagIds} />
      </Modal>
    </div>
  );
}
