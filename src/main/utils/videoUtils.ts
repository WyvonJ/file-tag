import FfmpegCommand from "fluent-ffmpeg";
import fs from "fs/promises";
// import { loadImage, createCanvas } from 'canvas';
import path from "path";
import { formatSeconds, sizeToStr } from "../../common/utils";
import chalk from "chalk";

export interface ThumbnailOptions {
  size?: string;
  filename?: string;
  logger?: any;
  count?: number;
  // 是否清理临时文件夹
  cleanTemp?: boolean;
  // 是否生成图片, 设为false则直接从已有文件夹读取
  generate: boolean;
}

export interface ThumbnailConfig {
  source: string;
  options?: ThumbnailOptions;
}

/**
 * 检查目标目录是否存在, 不存在则新建
 * @param {string} destination
 */
async function checkDestination(destination: string) {
  try {
    await fs.stat(destination);
    console.log(chalk.redBright(`文件目录已存在，将删除文件夹 ${destination}`));
    // 存在则删除
    await fs.rm(destination, { recursive: true });
    console.log(chalk.redBright('删除文件夹成功'));
  } catch (error) {
    console.log(chalk.redBright('文件目录不存在，将新建文件夹' + destination + error))
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
// export async function combineImages(source: string, info) {
// const dirs = await fs.readdir(source);
// // console.log(dirs);
// const files = await Promise.all(
//   dirs.map(async (file) => {
//     const match = file.match(/thumb-\[(.+)\]-\[(.+)\].png/);
//     if (match) {
//       const image = await loadImage(path.join(source, file));
//       const [, time, index] = match;
//       return {
//         file,
//         time: formatSeconds(time),
//         index: +index,
//         image,
//       };
//     }
//     return null;
//   }),
// );
// const images = files.filter((v) => v) as Array<any>;
// images.sort((a, b) => a.index - b.index);

// await fs.writeFile(path.join(destination, combinedFile), base64, 'base64');
// if (cleanTemp) {
//   // 递归删除
//   await fs.rmdir(source, { recursive: true });
// }
// return combinedFile;
// }

export async function readImages(source: string) {
  const dirs = await fs.readdir(source);
  // console.log(dirs);
  const files = await Promise.all(
    dirs.map(async (file) => {
      const match = file.match(/thumb-\[(.+)\]-\[(.+)\].png/);
      if (match) {
        const image = await fs.readFile(path.join(source, file), "base64");
        const [, time, index] = match;
        return {
          name: file,
          time: formatSeconds(time),
          index: +index,
          data: `data:image/png;base64,${image}`,
        };
      }
      return null;
    })
  );
  const images = files.filter((v) => v) as Array<any>;
  images.sort((a, b) => a.index - b.index);
  return images;
}

/**
 * 生成视频缩略图
 * @export
 * @param {*} source
 * @param {ThumbnailOptions} [options]
 * @return {*}
 */
export async function generateThumbnails(source, options?: ThumbnailOptions) {
  console.log("options", options);
  // 图片分辨率
  let WIDTH = 640;
  let HEIGHT;
  // 标题栏
  const HEADER = 80;

  // 10 像素的间距, 每张图片10px
  const GUTTER = 10;

  // 目标文件夹即文件所在文件夹
  const dirname = source.split(path.sep);
  // 弹出文件名
  dirname.pop();
  const destination = path.join(path.sep, ...dirname);

  let tempDir = path.join(destination, `${path.sep}thumbtemp${path.sep}${path.sep}`);
  if (options?.generate !== false) {
    if (process.platform === 'win32') {
      tempDir = tempDir.slice(1)
    }
    await checkDestination(tempDir);
  }
  // 获取文件元信息
  const metadata: any = await getMetaData(source);
  const { format, streams } = metadata;
  const { duration, size } = format;
  // 找到视频流, 获取视频宽高
  const { width, height } = streams.find(
    ({ codec_type }) => codec_type === "video"
  );
  const { rows: ROWS, columns: COLUMNS } = calcColumnsAndRows(width / height);

  console.log(
    `时长 ${formatSeconds(duration)} 大小 ${sizeToStr(
      size
    )} 分辨率 ${width}x${height} ${ROWS}行 ${COLUMNS}列`
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

  return new Promise(async (resolve, reject) => {
    const info = {
      // 视频宽高
      videoWidth: width,
      videoHeight: height,
      // 缩略图宽高
      thumbWidth: WIDTH,
      thumbHeight: HEIGHT,
      size,
      duration,
      filename: source.split(path.sep).pop().replace(/\..+$/, ""),
      columns: COLUMNS,
      rows: ROWS,
      gutter: GUTTER,
      header: HEADER,
    }
    // 调用FFmpeg生成缩略图
    if (options?.generate !== false) {
      async function end() {
        const imageList: any[] = await readImages(tempDir);
        if (options?.cleanTemp !== false) {
          // 递归删除
          await fs.rm(tempDir, { recursive: true });
        }
        resolve({
          images: imageList,
          info,
        });
      }
      command.on("end", end).on("error", reject).screenshots(settings);
    } else {
      // 直接从图片文件夹读取
      const imageList: any[] = await readImages(tempDir);
      resolve({
        images: imageList,
        info,
      });
    }
  });
}

export default {
  generateThumbnails,
  // combineImages,
  getMetaData,
  formatSeconds,
  readImages,
};
