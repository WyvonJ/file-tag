import { Button, Input, message, Upload } from "antd";
import { useEffect, useRef, useState } from "react";
import './ConfigManager.scss'
import { readExcel } from "../api";
import { db, importDatabase } from "../database";

function ConfigManager() {
  async function handlerBeforeUpload(file) {
    const { data }: any = await readExcel(file.path);
    const { Sheets } = data;
    // 将excel转成数组 []
    // Sheets 格式为 A1 A2 B1 B2等 直接从2开始取
    // 先取出所有A开头的, 即name，根据它的长度判断有多少条数据
    const sheet = Sheets.Sheet1;
    const As = Object.keys(sheet || {}).filter(
      (key) => key.startsWith("A") && key !== "A1"
    );
    const tags = As.map((key) => {
      const index = key.match(/\d+/);
      return {
        name: sheet[key]?.v,
        icon: sheet[`B${index}`]?.v,
        color: sheet[`C${index}`]?.v,
        priority: sheet[`D${index}`]?.v || 0,
        desc: sheet[`E${index}`]?.v || "",
      };
    }).filter(({ name, icon, color }) => name && icon && color); // 过滤空

    const ids = await db.bulkAddTags(tags);
    message.success("导入标签成功");
    console.log("tags", tags, ids);
    return false;
  }

  // const [imageList, setImageList] = useState<Array<any>>([]);
  //
  const [thumbnailPath, setThumbnailPath] = useState<any>('')

  useEffect(() => {
    setThumbnailPath(localStorage.getItem('thumbnail_path'));
  }, []);

  function handlerConfirmPath() {
    localStorage.setItem('thumbnail_path', thumbnailPath)
  }


  const [downloadUrl, setDownloadUrl] = useState<any>('')

  async function handlerExportDatabase() {
    const data: any = await db.export({ prettyJson: true });
    const url = window.URL.createObjectURL(data);
    setDownloadUrl(url);
  }

  async function handlerImportDatabase(file) {
    await importDatabase(file);
    message.success("数据库导入成功");
  }

  return (
    <div className="config-manager">
      <Upload
        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        beforeUpload={handlerBeforeUpload}
        maxCount={1}
      >
        <Button shape="round">导入标签</Button>
      </Upload>
      <span>缩略图地址</span>
      <Input value={thumbnailPath} onChange={(v) => setThumbnailPath(v.target.value)}/>
      <Button onClick={() => handlerConfirmPath()}>确认修改</Button>

      <br />
      <a href={downloadUrl} download="data.json">下载</a>
      <Button shape="round" onClick={handlerExportDatabase}>导出数据库</Button>
      <Upload
        accept="application/json"
        beforeUpload={handlerImportDatabase}
        maxCount={1}
      >
      <Button shape="round">导入数据库</Button>
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
