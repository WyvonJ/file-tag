import FfmpegCommand from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { loadImage, createCanvas } from 'canvas';
import path from 'path';

export interface ThumbnailOptions {
  size?: string;
  filename?: string;
  logger?: any;
  count?: number;
  // 是否清理临时文件夹
  cleanTemp?: boolean;
}

export interface ThumbnailConfig {
  source: string;
  options?: ThumbnailOptions;
}

export function formatSeconds(value) {
  let result = parseInt(value);
  let h = Math.floor(result / 3600) < 10 ? '0' + Math.floor(result / 3600) : Math.floor(result / 3600);
  let m = Math.floor((result / 60) % 60) < 10 ? '0' + Math.floor((result / 60) % 60) : Math.floor((result / 60) % 60);
  let s = Math.floor(result % 60) < 10 ? '0' + Math.floor(result % 60) : Math.floor(result % 60);

  let res = '';
  if (h !== '00') res += `${h}h`;
  if (m !== '00') res += `${m}m`;
  res += `${s}s`;
  return res;
}

export function sizeToStr(size) {
  let data = '';
  if (size < 0.1 * 1024) {
    //如果小于0.1KB转化成B
    data = size.toFixed(2) + 'B';
  } else if (size < 0.1 * 1024 * 1024) {
    //如果小于0.1MB转化成KB
    data = (size / 1024).toFixed(2) + 'KB';
  } else if (size < 0.1 * 1024 * 1024 * 1024) {
    //如果小于0.1GB转化成MB
    data = (size / (1024 * 1024)).toFixed(2) + 'MB';
  } else {
    //其他转化成GB
    data = (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
  }
  let sizeStr = data + '';
  let len = sizeStr.indexOf('.');
  let dec = sizeStr.substr(len + 1, 2);
  if (dec == '00') {
    //当小数点后为00时 去掉小数部分
    return sizeStr.substring(0, len) + sizeStr.substr(len + 3, 2);
  }
  return sizeStr;
}

/**
 * 检查目标目录是否存在, 不存在则新建
 * @param {string} destination
 */
async function checkDestination(destination: string) {
  try {
    await fs.stat(destination);
    // 存在则删除
    await fs.rmdir(destination, { recursive: true });
  } catch (error) {
    await fs.mkdir(destination);
  }
}

/**
 * 自定义计算缩略图分割点, 起点和终点都要
 * @param {number} count
 */
// function calcTimemarks(count: number) {}
/**
 * 根据视频比例计算行列
 * 写死大致的配置
 * @param {number} ratio
 * @return {*}
 */
function calcColumnsAndRows(ratio: number) {
  // 主要是这几种
  // 21:9 ≈ 2.33
  // 16:9 ≈ 1.78
  // 3:2 = 1.5
  // 4:3 ≈ 1.33
  // 1:1 为界
  // 9:21 ≈ 0.43
  // 9:16 = 0.5625
  // 2:3 ≈ 0.67
  // 3:4 = 0.75
  const ratioMap = [
    {
      ratio: 21 / 9,
      rows: 8,
      columns: 3,
    },
    {
      ratio: 16 / 9,
      rows: 7,
      columns: 4,
    },
    {
      ratio: 3 / 2,
      rows: 6,
      columns: 5,
    },
    {
      ratio: 4 / 3,
      rows: 6,
      columns: 5,
    },
    {
      ratio: 1,
      rows: 6,
      columns: 6,
    },
    {
      ratio: 9 / 21,
      rows: 3,
      columns: 8,
    },
    {
      ratio: 9 / 16,
      rows: 4,
      columns: 7,
    },
    {
      ratio: 3 / 2,
      rows: 5,
      columns: 6,
    },
    {
      ratio: 4 / 3,
      rows: 5,
      columns: 6,
    },
  ];
  let minRatio;
  let min = Infinity;
  ratioMap.forEach((r) => {
    const d = Math.abs(r.ratio - ratio);
    if (d < min) {
      min = d;
      minRatio = r;
    }
  });
  return {
    rows: minRatio.rows,
    columns: minRatio.columns,
  };
}

/**
 * 获取视频文件元信息
 * @export
 * @param {string} source
 * @return {*}
 */
export async function getMetaData(source: string) {
  return new Promise((resolve, reject) => {
    FfmpegCommand.ffprobe(source, function (err, metadata) {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata);
    });
  });
}

/**
 * 将生成的图片合并
 * @param {string} source
 */
export async function combineImages(source: string, info) {
  const dirs = await fs.readdir(source);
  // console.log(dirs);
  const files = await Promise.all(
    dirs.map(async (file) => {
      const match = file.match(/thumb-\[(.+)\]-\[(.+)\].png/);
      if (match) {
        const image = await loadImage(path.join(source, file));
        const [, time, index] = match;
        return {
          file,
          time: formatSeconds(time),
          index: +index,
          image,
        };
      }
      return null;
    }),
  );
  const images = files.filter((v) => v) as Array<any>;
  images.sort((a, b) => a.index - b.index);
  const { filename, duration, size, vw, vh, destination, width, height, columns, rows, gutter, header, cleanTemp } =
    info;

  const w = width * columns + gutter * (columns + 1);
  const h = height * rows + header + gutter * (rows + 1);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  /********************  开始绘制  ******************** */
  ctx.fillStyle = '#353637';
  ctx.fillRect(0, 0, w, h);

  // 绘制文件名
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "PingFang HK"';
  ctx.fillText(filename, 12, 50);
  // 绘制文件时长
  ctx.font = 'bold 26px "PingFang HK"';
  ctx.fillText(duration, w - 160, 30);
  // 绘制文件大小
  ctx.font = 'bold 26px "PingFang HK"';
  ctx.fillText(size, w - 160, 68);
  // 绘制文件分辨率
  ctx.font = 'bold 30px "PingFang HK"';
  ctx.fillText(`${vw}×${vh}`, w - 400, 30);
  // 绘制缩略图
  const imageCount = columns * rows;
  ctx.font = 'bold 30px "PingFang HK"';
  // 按顺序绘制所有缩略图
  for (let i = 0; i < imageCount; i += columns) {
    for (let j = 0; j < columns; j++) {
      let index = i + j;
      // console.log(`i=${i} j=${j} index=${index}`);
      const { image, time } = images[index] || {};
      if (image) {
        const x = j * (width + gutter);
        const y = header + Math.ceil(i / columns) * (height + gutter);
        ctx.drawImage(image, x, y, width, height);
        // 绘制缩略图定位时间
        // 绘制背景
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(x + width - 180, y + height - 40, 180, 40);
        // 绘制文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText(time, x + width - 120, y + height - 12);
      }
    }
  }
  /********************  结束绘制  ******************** */
  const [, base64] = canvas.toDataURL().split(',');
  const combinedFile = `${filename}-[${vw}×${vh}].png`
  await fs.writeFile(path.join(destination, combinedFile), base64, 'base64');
  if (cleanTemp) {
    // 递归删除
    await fs.rmdir(source, { recursive: true });
  }
  return combinedFile;
}

/**
 * 生成视频缩略图
 * @export
 * @param {*} source
 * @param {ThumbnailOptions} [options]
 * @return {*}
 */
export async function generateThumbnails(source, options?: ThumbnailOptions) {
  // 图片分辨率
  let WIDTH = 640;
  let HEIGHT = 360;
  // 标题栏
  const HEADER = 80;

  // 10 像素的间距, 每张图片10px
  const GUTTER = 10;

  // 目标文件夹即文件所在文件夹
  const dirname = source.split(path.sep);
  // 弹出文件名
  dirname.pop();
  const destination = path.join(path.sep, ...dirname);

  const tempDir = path.join(destination, `${path.sep}thumbtemp${path.sep}`);
  // console.log('tempDir', tempDir);
  // 检查临时文件夹
  await checkDestination(tempDir);
  // 获取文件元信息
  const metadata: any = await getMetaData(source);
  const { format, streams } = metadata;
  const { duration, size } = format;
  // 找到视频流, 获取视频宽高
  const { width, height } = streams.find(({ codec_type }) => codec_type === 'video');
  const { rows: ROWS, columns: COLUMNS } = calcColumnsAndRows(width / height);

  console.log(
    `时长 ${formatSeconds(duration)} 大小 ${sizeToStr(size)} 分辨率 ${width}x${height} ${ROWS}行 ${COLUMNS}列`,
  );
  // 读取源文件
  const command = new FfmpegCommand({
    source,
  });

  // 如果视频宽度比设定的还小, 则用它
  WIDTH = Math.min(WIDTH, width);
  // 按比例计算出height
  HEIGHT = Math.ceil((WIDTH * height) / width);

  const settings = {
    folder: tempDir,
    count: COLUMNS * ROWS,
    size: options?.size || `${WIDTH}x${HEIGHT}`,
    filename: `thumb-[%s]-[%0i]`,
    logger: options?.logger || console,
    // timemarks:
  };

  return new Promise((resolve, reject) => {
    async function end() {
      // 将所有的图片拼接为一张
      const combinedImage = await combineImages(tempDir, {
        filename: source.split(path.sep).pop().replace(/\..+$/, ''),
        duration: formatSeconds(duration),
        size: sizeToStr(size),
        cleanTemp: options?.cleanTemp !== false,
        vw: width,
        vh: height,
        destination,
        width: WIDTH,
        height: HEIGHT,
        columns: COLUMNS,
        rows: ROWS,
        gutter: GUTTER,
        header: HEADER,
      });
      // 返回拼好的文件名
      resolve(combinedImage);
    }
    //
    // function filenames(res) {
    //   filenamesArray = res; .on('filenames', filenames)
    // }
    command.on('end', end).on('error', reject).screenshots(settings);
  });
}

export default {
  generateThumbnails,
  combineImages,
  getMetaData,
  sizeToStr,
  formatSeconds,
};
