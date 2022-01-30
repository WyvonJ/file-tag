import { Button, message, Upload } from 'antd';
import { getThumbnails, readExcel } from '../api';
import { db } from '../database';
import { useState } from 'react';
import { getImage } from '../api/file';

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

    const ids = await db.bulkAddTags(tags)
    message.success('导入标签成功');
    console.log("tags", tags, ids);
    return false;
  }

  const [thumbnail, setThumbnail] = useState('')

  return (
    <div className="config-manager">
      <Button shape="round" onClick={async () => {
        const hide = message.loading('生成缩略图中');
        const { data }: any = await getThumbnails({
          source: '',
        });

        const { data: base64 }: any = await getImage(`/Users/wuji/Downloads/Porn/${data}`)
        setThumbnail(base64);
        hide()
      }}>
        缩略图
      </Button>
      <Upload
        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        beforeUpload={handlerBeforeUpload}
        maxCount={1}
      >
        <Button shape="round">
          导入标签
        </Button>
      </Upload>
      {
        thumbnail && <img src={thumbnail} alt='' style={{width: '70%'}}/>
      }
    </div>
  );
}

export default ConfigManager;
