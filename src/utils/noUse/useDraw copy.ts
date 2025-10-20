import {
  ref,
  // nextTick
} from 'vue';

export default function useDraw() {
  //修改
  const appRef = ref<HTMLElement>();
  let excludeEls: HTMLElement[] = []

  const timer = ref(0);
  //移除
  const scale = {
    // 字符串1，配合transfrom使用
    width: '1',
    height: '1',
  };
  //设计稿的宽高
  const baseWidth = 1920;
  const baseHeight = 1080;
  const baseRate = parseFloat((baseWidth / baseHeight).toFixed(5));
  const calcRate = () => {
    if (!appRef.value) return
    const currentRate = parseFloat(
      (window.innerWidth / window.innerHeight).toFixed(5)
    );
    //新增
    // let scaleWidth: string;
    // let scaleHeight: string;

    if (currentRate > baseRate) {
      //修改
      scale.width = (window.innerHeight / baseHeight).toString();
      scale.height = (window.innerHeight / baseHeight).toString();
      /* //当前宽更宽，按照高适配
      scale.width = (window.innerHeight / baseHeight).toString();
      scale.height = (window.innerHeight / baseHeight).toString();
      //计算
      appRef.value.style.transform = `scale(${scale.width},${scale.height}) translate(-50%,-50%)`; */
    } else {
      //修改
      // 当前屏幕更高，按宽度缩放
      scale.width = (window.innerWidth / baseWidth).toString();
      scale.height = (window.innerWidth / baseWidth).toString();
      /* scale.width = (window.innerWidth / baseWidth).toString();
      scale.height = (window.innerWidth / baseWidth).toString();
      //计算
      appRef.value.style.transform = `scale(${scale.width}, ${scale.height}) translate(-50%,-50%)`; */
    }
    //新增
    appRef.value.style.transform = `scale(${scale.width}, ${scale.height}) translate(-50%, -50%)`;
    appRef.value.style.transformOrigin = 'left top';

    // 还原被排除的元素 （timeline）
    excludeEls.forEach(el => {
      // el.style.transform = 'scale(1,1)'
      // el.style.transformOrigin = 'unset'
      el.style.transform = `scale(${1 / Number(scale.width)}, ${1 / Number(scale.height)})` //还原回原本的大小
      el.style.transformOrigin = 'left top'
    })
    //新增
    // 关键：通知 element-plus 重新计算交互区域
    /* nextTick(() => {
      window.dispatchEvent(new Event('resize'))
    }) */
    return scale
  };
  //重新绘制
  const resize = () => {
    clearTimeout(timer.value);
    timer.value = setTimeout(() => {
      calcRate();
    }, 200);

  };

  //改变窗口大小重新绘制
  const windowDraw = () => {
    window.addEventListener('resize', resize);
  };
  //移除监听
  const unWindowDraw = () => {
    window.removeEventListener('resize', resize);
  };
  //设置要排除缩放的元素
  const setExclude = (els: HTMLElement[]) => {
    excludeEls = els
  }
  return {
    appRef,
    calcRate,
    windowDraw,
    unWindowDraw,
    setExclude
  };
}
