import {
  Button,
  Col,
  Input,
  Modal,
  Rate,
  Row,
  Tree,
  Empty,
  message,
  Tooltip,
} from 'antd';
import Draggable from 'react-draggable';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDirList,
  getDirTree,
  getFileListCurrent,
  getFileStats,
  openFile,
  readImageList,
  renameFile,
  saveImage,
} from '../api';
import { db, FtFile, FtTag } from '../database';
import MaterialIcon from '../components/MaterialIcon';
import TagSelect from '../components/TagSelect';
import Tag from '../components/Tag';
import Thumbnails from 'renderer/components/Thumbnails';
import { formatSeconds, sizeToStr } from 'common/utils';
import { diffFileTree, filterTreeData, getSep } from 'renderer/utils/commonUtils';
import { combineImages } from 'renderer/utils/imageUtils';
import './FileManager.scss';

/**
 * 文件管理器
 * @return {*}
 */
const FileManager = () => {
  const [treeData, setTreeData] = useState<any[]>([]);
  // 当前选中的文件
  const [currentFile, setCurrentFile] = useState<
    FtFile & { tagList: Array<FtTag> }
  >({
    name: '',
    path: '',
    isFile: true,
    tagList: [],
  });

  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });

  const [dirVisible, setDirVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const tagSelectRef = useRef<any>();

  const draggleRef: any = useRef();

  /**
   * 保存树到数据库中
   * 递归读取数据，根据上一次生成的id
   * @param data
   */
  async function saveTreeData(data: FtFile[]) {
    const result = await db.addTreeFiles(data);
    console.log('saveTreeData', result);
    return result;
  }

  async function handlerDrop(e) {
    e.preventDefault();
    // 拖拽的文件夹路径
    const [{ path }] = e.dataTransfer.files;
    // 获取Stats属性
    const { data: stats } = await getFileStats(path);

    if (stats.isFile) {
      message.error('请拖拽文件夹');
      return;
    }

    Modal.confirm({
      title: '提示',
      content: `将添加${path}文件夹，是否确认`,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { data }: any = await getDirTree(path);
          // 保存树到数据库
          await saveTreeData([data]);
          console.log(JSON.stringify(data, null, 2));
          await loadTree();
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
      setCurrentFile(file);
      setRate(file.rate || 0);
      setRemarkValue(file.remark);
    } else {
      message.error('找不到该文件');
    }
  }

  /**
   * 添加
   */
  function handlerAddTag() {
    if (!currentFile.id) {
      message.info('请选择文件');
      return;
    }
    setTagModalVisible(true);
  }

  /**
   * 给选定文件贴上标签
   */
  async function handlerAddTagsToFile() {
    const selected = tagSelectRef.current.getSelectedTags();
    const selectedIds = selected.map(({ id }) => id);
    if (!currentFile?.id) {
      message.error('请选择文件');
      return;
    }
    await db.attachTagsToFile(currentFile.id, selectedIds);
    message.success('添加标签成功');
    setTagModalVisible(false);
    await handlerSelectTreeNode(currentFile.id);
    console.log('selectedIds', selectedIds, currentFile);
  }

  /**
   * 加载树
   * 取出所有的文件数据，构建树
   * TODO: 读取所有根节点, 对每个根节点进行遍历, 查找文件变化, 并同步更新
   * 多出的文件存到库里, 删掉的文件从库中删除, 以文件夹为中心判断
   */
  async function loadTree() {
    const hide = message.loading('加载目录数据中...', Infinity);
    const result = await db.getTree();
    console.log('loadTree 树数据', result);
    setTreeData(result);
    hide();
  }

  const [searchValue, setSearchValue]=useState('')
  async function handlerSearchChange({ target: { value } }) {
    setSearchValue(value)
  }

  const searchTreeData = useMemo(() => {
    if (!searchValue) {
      return treeData;
    }

    return filterTreeData(treeData, searchValue);

  }, [treeData, searchValue])

  // 删除文件绑定的标签
  async function handlerDelTagAttachment(id, name) {
    Modal.confirm({
      title: '提示',
      centered: true,
      content: `将删除${name}标签，是否确认`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        if (currentFile && currentFile.id) {
          await db.delTagAttachment(currentFile.id, [id]);
          message.success(`删除${name}标签成功`);
          handlerSelectTreeNode(currentFile.id);
        }
      },
    });
  }

  /**
   * 重命名本地文件，并修改数据库
   */
  async function handlerRename() {
    const oldPath = currentFile.path;
    const newPath = oldPath?.replace(currentFile.name || '', renameValue);
    console.log({
      oldPath,
      newPath,
    });
    try {
      const result = await renameFile({
        oldPath,
        newPath,
      });
      console.log('重命名结果', result);
      await db.updateFile({
        id: currentFile.id,
        name: renameValue,
        path: newPath,
      });
      message.success('文件重命名成功');
      setRenameVisible(false);
      await loadTree();
      await handlerSelectTreeNode(currentFile.id);
      // TODO: 将树
    } catch (error) {
      console.log(error);
    }
  }

  // 评分
  const [rate, setRate] = useState(0);
  /**
   * 文件评分
   * @param {*} v
   */
  async function handlerRate(v) {
    if (!currentFile?.id) {
      message.info('请先选择文件');
      return;
    }
    setRate(v);
    await db.updateFile({
      id: currentFile.id,
      rate: v,
    });
    message.success('评分成功');
  }

  // 文件评论
  const [remarkValue, setRemarkValue] = useState('');

  /**
   * 提交评论
   */
  async function handlerSubmitRemark() {
    if (!remarkValue) {
      message.info('请填写评价内容');
      return;
    }
    await db.updateFile({
      id: currentFile.id,
      remark: remarkValue,
    });
    message.success('提交成功');
  }

  // 文件树容器
  const dirContainer = useRef<any>(null);
  // 动态变动树高
  const [treeHeight, setTreeHeight] = useState(800);

  function handlerResize() {
    if (dirContainer && dirContainer.current) {
      const { height } = dirContainer.current.getBoundingClientRect();
      setTreeHeight(height - 90);
    }
  }

  useEffect(() => {
    loadTree();
    handlerResize();
    window.addEventListener('resize', handlerResize);
    return () => {
      window.removeEventListener('resize', handlerResize);
    };
  }, []);

  /**
   * 拖拽树节点
   * @param {*} { dragNode, node } dragNode拖拽的节点， node目标节点
   */
  async function handlerTreeNodeDrop({ dragNode, node }) {
    if (dragNode.isFile && !node.isFile) {
      // 只能从文件节点拖拽到文件夹节点
      // await moveFile(dragNode, node)
      // 直接调用rename的api
      // await renameFile()
      const oldPath = dragNode.path;
      const newPath = `${node.path}${getSep()}${dragNode.name}`;
      console.log(oldPath, newPath);
      await renameFile({
        oldPath,
        newPath,
      });
      // 更新数据库
      await db.updateFile({
        id: dragNode.id,
        path: newPath,
        parentId: node.id,
      });
      message.success('文件移动成功');
      await loadTree();
    } else {
      message.info('只能将文件移动到文件夹');
    }
  }

  /**
   * 一键生成所有文件的缩略图
   */
  async function handlerGenerateAllThumbnails() {
    const timeStart = Date.now();
    message.loading('开始生成缩略图，将会耗时较长，请耐心等待');
    const files = await db.getFileList();
    const total = files.length;
    if (total === 0) {
      message.info('还未添加文件, 请先添加文件后再生成');
      return;
    }
    message.info(`一共将生成${total}个文件缩略图`);
    for (const [index, file] of files.entries()) {
      try {
        const h = message.loading(
          `当前生成第${index + 1}个文件：${file.name}，还有${
            total - index - 1
          }个文件`,
          Infinity
        );
        const {
          data: { images, info },
        }: any = await readImageList({
          source: file.path,
        });

        const base64 = await combineImages(images, info);
        const dirpath = localStorage.getItem('thumbnail_path') || '';
        const [, data] = base64.split('base64,');
        const id = file.id;
        const filename = `${id}.png`;
        await saveImage({
          dirpath,
          filename,
          data,
        });
        db.updateFile({
          id,
          thumbnail: filename,
        });
        h();
        message.success(`${file.name} 缩略图保存成功`);
      } catch (error) {
        message.error(`文件：${file.name}缩略图生成失败。`);
      }
    }
    // hide();
    const timeEnd = Date.now();
    message.success(
      `缩略图全部生成完成, 共耗时${formatSeconds((timeEnd - timeStart) / 1000)}`
    );
  }

  /**
   * 刷新该目录下的文件
   * @param {*} node
   */
  async function handlerRefreshDir(node) {
    console.log(node);
    const { data: currentFileList }: any = await getDirList(node.path);
    console.log('currentFileList', currentFileList);
    // 根据名字对比增加的和删除的文件
    const { deleted, added } = diffFileTree(
      node.children,
      currentFileList,
      'name'
    );
    console.log({ deleted, added });
    for (const file of deleted) {
      if (file.isFile) {
        // 删文件
        await db.deleteFile(file.id);
      } else {
        await db.deleteDir(file.id);
      }
    }
    // for (const file of added) {
    //   file.parentId = node.id;
    //   file.isFile = true;
    //   file.isLeaf = true;
    //   await db.addFile(file);
    // }
    // await loadTree();
  }

  async function handlerDeleteFile(node) {
    Modal.confirm({
      title: '注意',
      centered: true,
      content: '是否确认删除该文件？',
      onOk: async () => {
        await db.deleteFile(node.id);
        message.success('删除文件成功');
        await loadTree();
      },
    });
  }

  return (
    <div className="file-manager">
      <div className="file-manager__directories" ref={dirContainer}>
        <Button shape="round" onClick={() => setDirVisible(true)}>
          <MaterialIcon icon="add" />
          <span className="btn-text">添加文件夹</span>
        </Button>

        <Button
          shape="round"
          onClick={handlerGenerateAllThumbnails}
          style={{ marginLeft: '20px' }}
        >
          <MaterialIcon icon="image" />
          <span className="btn-text">一键生成缩略图</span>
        </Button>

        <div className="file-manager__directories--tree">
          <Input.Search
            style={{ marginBottom: 8, marginTop: 8 }}
            placeholder="Search"
            onChange={handlerSearchChange}
          />
          {searchTreeData?.length ? (
            <Tree.DirectoryTree
              draggable={true}
              blockNode={true}
              showIcon={false}
              height={treeHeight}
              onSelect={async (_, { node }) => {
                const { isFile, id }: any = node;
                if (isFile) {
                  handlerSelectTreeNode(id);
                } else {
                  // const fList = await getFileListCurrent((node as any).path);
                  // console.log('fList', fList);
                }
              }}
              treeData={searchTreeData}
              fieldNames={{
                key: 'id',
                title: 'name',
              }}
              onDrop={handlerTreeNodeDrop}
              titleRender={(node: any) => {
                return node.isFile ? (
                  <Tooltip title={node.name} placement="right">
                    {node.name}
                  </Tooltip>
                ) : (
                  // <Row justify="space-between" align="middle">
                  //   <Col span={19}>

                  //   </Col>
                  //   <Col span={5}>
                  //     <div className="dir-actions">
                  //       <Button
                  //         shape="round"
                  //         onClick={(e) => {
                  //           e.stopPropagation();
                  //           handlerDeleteFile(node);
                  //         }}
                  //         className="delete-btn"
                  //         title="删除文件"
                  //       >
                  //         <MaterialIcon icon="delete" />
                  //       </Button>
                  //     </div>
                  //   </Col>
                  // </Row>
                  <Row justify="space-between" align="middle">
                    <Col span={19}>
                      <span className="ant-tree-title-node">{node.name}</span>
                    </Col>
                    <Col span={5}>
                      <div className="dir-actions">
                        <Button
                          shape="round"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlerRefreshDir(node);
                          }}
                          className="refresh-btn"
                          title="刷新目录"
                        >
                          <MaterialIcon icon="refresh" />
                        </Button>
                        <Button
                          shape="round"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlerRefreshDir(node);
                          }}
                          className="delete-btn"
                          title="删除目录"
                        >
                          <MaterialIcon icon="delete" />
                        </Button>
                      </div>
                    </Col>
                  </Row>
                );
              }}
            />
          ) : (
            <Empty
              description="暂无数据, 请添加文件夹"
              style={{ paddingTop: '120px' }}
            />
          )}
        </div>
      </div>
      {/* 文件信息 */}
      <div className="file-manager__files">
        {currentFile?.id ? (
          <>
            <Button
              type="link"
              onClick={() => {
                setRenameValue(currentFile.name || '');
                setRenameVisible(true);
              }}
            >
              重命名
            </Button>
            <Button
              type="link"
              onClick={() => {
                if (!currentFile?.path) {
                  message.info('请选择文件');
                  return;
                }
                openFile(currentFile.path);
              }}
            >
              打开文件
            </Button>
            <Button
              type="link"
              onClick={() => {
                if (!currentFile?.path) {
                  message.info('请选择文件');
                  return;
                }
                openFile(currentFile.path.replace(currentFile.name + '', ''));
              }}
            >
              打开文件夹
            </Button>
            <h1>{currentFile.name}</h1>
            <h2>{currentFile.path}</h2>
            <h2>{sizeToStr(currentFile.size)}</h2>

            {/* 缩略图 */}
            <Thumbnails file={currentFile} />
          </>
        ) : (
          <Empty description="未选择文件" style={{ paddingTop: '150px' }} />
        )}
      </div>
      {/* 标签管理等 */}
      <div className="file-manager__manage">
        {currentFile?.id ? <Row>
          <Col span={24}>
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
            <Button
              onClick={handlerAddTag}
              shape="round"
              type="primary"
              style={{
                marginBottom: 12,
              }}
              icon={<MaterialIcon icon="add" />}
            >
              <span style={{ position: 'relative', bottom: 4 }}>添加标签</span>
            </Button>
          </Col>
          <Col span={24} style={{ marginBottom: 12 }}>
            <span
              style={{ marginRight: 12, width: 64, display: 'inline-block' }}
            >
              评分: {rate}
            </span>
            <Rate
              allowHalf={true}
              onChange={(v) => {
                handlerRate(v);
              }}
              value={rate}
            />
          </Col>
          <Col span={24}>
            <Input.TextArea
              rows={4}
              value={remarkValue}
              onChange={(v) => {
                setRemarkValue(v.target.value);
              }}
              placeholder="请填写评论内容"
              maxLength={500}
            />
            <Button
              onClick={handlerSubmitRemark}
              shape="round"
              type="primary"
              style={{
                marginTop: 12,
                marginBottom: 12,
              }}
            >
              <span className="btn-text">提交评论</span>
            </Button>
          </Col>
        </Row> : <Empty description="未选择文件"></Empty>}
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
        <TagSelect
          ref={tagSelectRef}
          selectedKeys={currentFile.tagList?.map(({ id }) => id)}
        />
      </Modal>

      <Modal
        visible={dirVisible}
        centered={true}
        title="请拖拽文件夹上传"
        onOk={() => setDirVisible(false)}
        onCancel={() => setDirVisible(false)}
      >
        <div
          className="file-manager__directories--drop"
          onDrop={handlerDrop}
          onDragEnter={handlerDragEnter}
          onDragOver={handlerDragOver}
        >
          <span>拖拽文件夹到此处.</span>
        </div>
      </Modal>

      <Modal
        visible={renameVisible}
        centered={true}
        title="重命名"
        onOk={() => handlerRename()}
        onCancel={() => setRenameVisible(false)}
        maskClosable={false}
      >
        <Input
          value={renameValue}
          onChange={(v) => setRenameValue(v.target.value)}
        />
      </Modal>
    </div>
  );
};

export default FileManager;
