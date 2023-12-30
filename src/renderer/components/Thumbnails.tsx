import { Button, message, Switch, Image, Row, Col } from 'antd';
import { useEffect, useState } from 'react';
import { combineImages } from '../utils/imageUtils';
import { readImageList, saveImage } from '../api';
import { db } from 'renderer/database';
import { getSep } from 'renderer/utils/commonUtils';
import MaterialIcon from './MaterialIcon';

function Thumbnails({ file }) {
  const { path, id } = file;

  const [thumbnail, setThumbnail] = useState('');
  const [generate, setGenerate] = useState(true);
  const [cleanTemp, setCleanTemp] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const thumbnailPath = localStorage.getItem('thumbnail_path');
    if (file.thumbnail && thumbnailPath) {
      setThumbnail(`file:///${thumbnailPath}${getSep()}${file.thumbnail}`);
      // getImage(`${thumbnailPath}${getSep()}${file.thumbnail}`).then(
      //   ({ data }: any) => {
      //     setThumbnail(data);
      //   }
      // );
    } else {
      setThumbnail('');
    }
  }, [file.thumbnail, file.id]);

  async function handlerGenerate() {
    if (!path) {
      message.info('请选择文件！');
      return;
    }
    const hide = message.loading('生成缩略图中', 60000);
    setLoading(true);
    const source = path;
    const {
      data: { images, info },
    }: any = await readImageList({
      source,
      options: {
        generate,
        cleanTemp,
      },
    });
    const base64 = await combineImages(images, info);
    setThumbnail(base64);
    await handlerSave(base64);
    hide();
    setLoading(false);
  }

  /**
   * 保存缩略图
   */
  async function handlerSave(base64?: string) {
    const dirpath = localStorage.getItem('thumbnail_path');
    if (!dirpath) {
      message.error('缩略图保存位置未设置，请先到配置管理中设置');
      return;
    }
    const [, data] = (base64 || thumbnail).split('base64,');
    const filename = `[${id}][${file.name}].jpg`;
    console.log('file,', file);
    await saveImage({
      dirpath,
      filename,
      data,
    });
    db.updateFile({
      id,
      thumbnail: filename,
    });
    message.success('缩略图保存成功');
  }

  return (
    <div className="thumbnails">
      <Row align="middle">
        <Col
          span={4}
          title="是否生成缩略图, 否则直接使用thumbtemp文件夹下已生成图片"
        >
          是否生成:
        </Col>
        <Col span={4}>
          <Switch
            onChange={(v) => setGenerate(v)}
            defaultChecked={generate}
          ></Switch>
        </Col>
        <Col span={4} title="是否清理thumbtemp文件夹">
          是否清理:
        </Col>
        <Col span={4}>
          <Switch
            onChange={(v) => setCleanTemp(v)}
            defaultChecked={cleanTemp}
          ></Switch>
        </Col>
      </Row>
      <br />
      <Button
        loading={loading}
        onClick={() => handlerGenerate()}
        shape="round"
        style={{ marginRight: 12 }}
      >
        <MaterialIcon icon="image" />
        <span className="btn-text">生成缩略图</span>
      </Button>
      <Button loading={loading} onClick={() => handlerSave()} shape="round">
        <MaterialIcon icon="save" />
        <span className="btn-text">保存缩略图</span>
      </Button>
      <div style={{ marginTop: 12 }}>
        {thumbnail && (
          <Image src={thumbnail} alt="" style={{ width: '100%' }} />
        )}
      </div>
    </div>
  );
}

export default Thumbnails;
