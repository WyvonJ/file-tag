import { formatSeconds, sizeToStr } from "../../common/utils";

export interface ThumbnailOptions {
  size?: string;
  filename?: string;
  logger?: any;
  count?: number;
  // 是否清理临时文件夹
  cleanTemp?: boolean;
}

/**
 * 获取指定张数的缩略图
 * @param source
 * @param options
 */
// export async function generateThumbnails(source: string, options?: ThumbnailOptions) {
//
// }

export interface VideoInfo {
  // 文件名
  filename: string;
  // 视频时长
  duration: number;
  // 视频文件大小
  size: number;
  // 视频宽高
  videoWidth: number;
  videoHeight: number;
  // 缩略图宽高
  thumbWidth: number;
  thumbHeight: number;
  // 列数
  columns: number;
  // 行数
  rows: number;
  // 间隔像素
  gutter: number;
  // 标题栏像素
  header: number;
}

async function loadImage(
  src: string,
  width: number,
  height: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(width, height);
    image.src = src;
    image.alt = "";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = (e) => {
      reject(e);
    };
  });
}

/**
 * 将图片在本地使用canvas拼接
 * 返回base64字符串
 * @param images
 */
export async function combineImages(
  images: any[],
  info: VideoInfo
): Promise<string> {
  const {
    filename,
    duration,
    size,
    videoWidth,
    videoHeight,
    thumbWidth,
    thumbHeight,
    columns,
    rows,
    gutter,
    header,
  } = info;

  console.log("info", info);

  const w = thumbWidth * columns + gutter * (columns + 1);
  const h = thumbHeight * rows + header + gutter * (rows + 1);

  const canvas = document.createElement("canvas");

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  /********************  开始绘制  ******************** */
  ctx.fillStyle = "#342C37";
  ctx.fillRect(0, 0, w, h);

  // 绘制文件名
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 40px Palatino';
  ctx.fillText(filename, 12, 50);
  // 绘制文件时长
  ctx.font = 'bold 26px Palatino';
  ctx.fillText(formatSeconds(duration), w - 160, 30);
  // 绘制文件大小
  ctx.font = 'bold 26px Palatino';
  ctx.fillText(sizeToStr(size), w - 160, 68);
  // 绘制文件分辨率
  ctx.font = 'bold 30px Palatino';
  ctx.fillText(`${videoWidth}×${videoHeight}`, w - 400, 30);
  // 绘制缩略图
  const imageCount = columns * rows;
  ctx.font = '400 30px Palatino';
  // 按顺序绘制所有缩略图
  for (let i = 0; i < imageCount; i += columns) {
    for (let j = 0; j < columns; j++) {
      let index = i + j;
      // console.log(`i=${i} j=${j} index=${index}`);
      const { data, time } = images[index] || {};
      if (data) {
        // 加载图片
        const imgEle = await loadImage(data, thumbWidth, thumbHeight);

        const x = j * (thumbWidth + gutter);
        const y = header + Math.ceil(i / columns) * (thumbHeight + gutter);
        ctx.drawImage(imgEle, x, y, thumbWidth, thumbHeight);
        // 绘制缩略图定位时间
        // 绘制背景
        ctx.fillStyle = "#d81b7a";
        ctx.fillRect(x + thumbWidth - 180, y + thumbHeight - 40, 180, 40);
        // 绘制文字
        ctx.fillStyle = "#ffffff";
        ctx.fillText(time, x + thumbWidth - 120, y + thumbHeight - 12);
      }
    }
  }
  /********************  结束绘制  ******************** */
  const [, base64] = canvas.toDataURL().split(",");
  // const combinedFile = `${filename}-[${videoWidth}×${videoHeight}].png`;
  // console.log(base64);
  // console.log(combinedFile);
  return `data:image/png;base64,${base64}`;
}

export default {
  combineImages,
  // generateThumbnails
};
