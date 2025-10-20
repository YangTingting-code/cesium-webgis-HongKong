// colorRamps.ts
export interface Ramp {
  name: string;
  colors: string[]; // 连续色标，可任意长度
}

export const ramps: Ramp[] = [
  {
    name: '冷系-热',
    colors: ['#0571b0', '#92c5de', '#f7f7f7', '#f4a582', '#ca0020']
  },
  {
    name: '蓝-紫-红',
    colors: ['#313695', '#4575b4', '#74add1', '#feb24c', '#f46d43', '#a50026']
  },
  {
    name: '灰-橙',
    colors: ['#f7f7f7', '#cccccc', '#969696', '#525252', '#ff7f00', '#bf5f00']
  },
  {
    name: '彩虹',
    colors: ['#5e4fa2', '#3288bd', '#66c2a5', '#abdda4', '#e6f598', '#fee08b', '#fdae61', '#f46d43', '#d53e4f', '#9e0142']
  },
  {
    name: '绿-黄-红',
    colors: ['#006837', '#1a9850', '#66bd63', '#a6d96a', '#d9ef8b', '#fee08b', '#fdae61', '#f46d43', '#d73027', '#a50026']
  },
  {
    name: '单色-蓝',
    colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c']
  },
  {
    name: '单色-红',
    colors: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d']
  }
];