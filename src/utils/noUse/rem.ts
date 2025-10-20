// rem.ts
export function setRem() {
  const baseWidth = 2200; // 设计稿宽度
  const html = document.documentElement;
  const clientWidth = html.clientWidth;
  console.log("clientWidth", clientWidth);

  // 1rem = (屏幕宽度 / 1920) * 16px
  html.style.fontSize = (clientWidth / baseWidth) * 16 + 'px';
}