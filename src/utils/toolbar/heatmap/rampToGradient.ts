// rampToGradient.ts
import type { Ramp } from './colorRamps.ts';

/** 把连续色标切成 0-1 渐变表 */
export function rampToGradient(ramp: Ramp, steps = 10): Record<number, string> {
  const g: Record<number, string> = { 0: 'rgba(0,0,0,0)' }; // 0 透明
  const maxIdx = ramp.colors.length - 1;
  for (let i = 1; i <= steps; i++) {
    const pos = i / steps;
    const idx = pos * maxIdx;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const ratio = idx - lower;
    // 简单线性插值
    const color = interpolate(ramp.colors[lower], ramp.colors[upper], ratio);
    g[pos] = color;
  }
  return g;
}

/** 两色插值（rgb） */
function interpolate(c1: string, c2: string, ratio: number): string {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
  return `rgba(${r},${g},${b},1)`;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}