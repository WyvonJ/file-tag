import { Button, message, Upload, Switch, Image } from "antd";
import { readImageList, readExcel } from "../api";
import { db } from "../database";
import { useRef, useState } from "react";
import { combineImages } from "../utils/imageUtils";
import './ConfigManager.scss'

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

  const [thumbnail, setThumbnail] = useState("");
  // const [imageList, setImageList] = useState<Array<any>>([]);
  //
  // const [videoMeta, setVideoMeta] = useState<any>({})

  const containerRef = useRef<any>();

  const [generate, setGenerate] = useState(false);
  const [cleanTemp, setCleanTemp] = useState(false);

  async function handlerThumbnails() {
    const hide = message.loading("生成缩略图中", 60000);
    const source =
      "/Users/wuji/Downloads/Videos/Test/入门盲目虐 白练四个月 | 腹肌训练经验分享.mp4";
    const { data: { images, info } }: any = await readImageList({
      source,
      options: {
        generate,
        cleanTemp,
      },
    });
    const base64 = await combineImages(images, info);
    setThumbnail(base64);
    hide();
  }

  return (
    <div className="config-manager">
      是否生成: <Switch onChange={(v) => setGenerate(v)}></Switch><br/>
      是否清理: <Switch onChange={(v) => setCleanTemp(v)}></Switch>
      <Button shape="round" onClick={() => handlerThumbnails()}>
        缩略图
      </Button>
      <Upload
        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        beforeUpload={handlerBeforeUpload}
        maxCount={1}
      >
        <Button shape="round">导入标签</Button>
      </Upload>
      <div className="canvas-container" ref={containerRef}></div>
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
      {thumbnail && <Image src={thumbnail} alt="" style={{ width: "400px" }} />}
    </div>
  );
}

export default ConfigManager;
