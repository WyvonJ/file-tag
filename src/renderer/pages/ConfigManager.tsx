import { Button, Col, Input, message, Row, Upload } from 'antd';
import { useEffect, useRef, useState } from 'react';
import './ConfigManager.scss';
import { getFileStats, readExcel } from '../api';
import { db, importDatabase } from '../database';
import MaterialIcon from 'renderer/components/MaterialIcon';

function ConfigManager() {
  async function handlerBeforeUpload(file) {
    const { data }: any = await readExcel(file.path);
    const { Sheets } = data;
    // 将excel转成数组 []
    // Sheets 格式为 A1 A2 B1 B2等 直接从2开始取
    // 先取出所有A开头的, 即name，根据它的长度判断有多少条数据
    const sheet = Sheets.Sheet1;
    const As = Object.keys(sheet || {}).filter(
      (key) => key.startsWith('A') && key !== 'A1'
    );
    const tags = As.map((key) => {
      const index = key.match(/\d+/);
      return {
        name: sheet[key]?.v,
        icon: sheet[`B${index}`]?.v,
        color: sheet[`C${index}`]?.v,
        priority: sheet[`D${index}`]?.v || 0,
        desc: sheet[`E${index}`]?.v || '',
      };
    }).filter(({ name, icon, color }) => name && icon && color); // 过滤空

    const ids = await db.bulkAddTags(tags);
    message.success('导入标签成功');
    console.log('tags', tags, ids);
    return false;
  }

  // const [imageList, setImageList] = useState<Array<any>>([]);
  //
  const [thumbnailPath, setThumbnailPath] = useState<any>('');

  useEffect(() => {
    setThumbnailPath(localStorage.getItem('thumbnail_path'));
  }, []);

  function handlerConfirmPath() {
    localStorage.setItem('thumbnail_path', thumbnailPath);
    message.success('缩略图路径修改成功');
  }

  // 下载链接
  const [downloadUrl, setDownloadUrl] = useState<any>('');
  // 下载引用
  const downloadRef = useRef<any>(null);

  async function handlerExportDatabase() {
    const data: any = await db.export({ prettyJson: true });
    const url = window.URL.createObjectURL(data);
    setDownloadUrl(url);
    if (downloadRef && downloadRef.current) {
      downloadRef.current.click();
    }
  }

  async function handlerImportDatabase(file) {
    await importDatabase(file);
    message.success('数据库导入成功');
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
    setThumbnailPath(path);
  }

  function handlerDragEnter(e) {
    e.preventDefault();
  }

  function handlerDragOver(e) {
    e.preventDefault();
  }

  return (
    <div className="config-manager">
      <Row align="middle">
        <Col span={24} style={{ marginBottom: 12 }}>
          <Upload
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            beforeUpload={handlerBeforeUpload}
            maxCount={1}
          >
            <Button shape="round">
              <MaterialIcon icon="file_upload" />
              <span className="btn-text">导入标签</span>
            </Button>
          </Upload>
        </Col>
        <Col span={2}>
          <span>缩略图地址</span>
        </Col>
        <Col span={10}>
          <Input
            value={thumbnailPath}
            onChange={(v) => setThumbnailPath(v.target.value)}
            disabled={true}
          />
        </Col>
        <Col>
          <div
            className="config-manager__drop"
            onDrop={handlerDrop}
            onDragEnter={handlerDragEnter}
            onDragOver={handlerDragOver}
          >
            <span>拖拽文件夹到此处.</span>
          </div>
        </Col>
        <Col span={2}>
          <Button
            onClick={() => handlerConfirmPath()}
            type="primary"
            shape="round"
          >
            确认修改
          </Button>
        </Col>
      </Row>

      <br />
      <a
        href={downloadUrl}
        download="database.json"
        ref={downloadRef}
        style={{ display: 'none' }}
      ></a>
      <Button shape="round" onClick={handlerExportDatabase} style={{ marginRight: 10 }}>
        <MaterialIcon icon="file_download" />
        <span className="btn-text">导出数据库</span>
      </Button>
      <Upload
        accept="application/json"
        beforeUpload={handlerImportDatabase}
        maxCount={1}
      >
        <Button shape="round">
          <MaterialIcon icon="file_upload" />
          <span className="btn-text">导入数据库</span>
        </Button>
      </Upload>

      {/*<div style={{ height: '600px', overflowY: 'auto', width: '1000px' }}>*/}
      {/*  <div>{videoMeta.filename}</div>*/}
      {/*  <div>{videoMeta.width}x{videoMeta.height}</div>*/}
      {/*  <ul style={{*/}
      {/*    display: 'flex',*/}
      {/*    flexWrap: 'wrap'*/}
      {/*  }}>*/}
      {/*    {imageList.length &&*/}
      {/*      imageList.map(({ image, file }) => (*/}
      {/*        <li key={file}><img src={image} alt={file} /></li>*/}
      {/*      ))}*/}
      {/*  </ul>*/}
      {/*</div>*/}
    </div>
  );
}

export default ConfigManager;
