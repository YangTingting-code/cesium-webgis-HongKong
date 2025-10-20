// import { reactive, ref } from "vue"

export function getPoints() {
  const rawData = getDataset();
  const points = rawData.map((item) => {
    return {
      x: item['cesium#longitude'],
      y: item['cesium#latitude'],
      value: item.orders,
    };
  });
  return points;
}
//用计算属性优化缓存？
export function getBBox() {
  const points = getPoints();
  const lngs = points.map((point) => point.x);
  const lats = points.map((point) => point.y);
  const bound = {
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
  return bound;
}

export function getDataset() {
  //rawData数据格式 {id,{}},{id,{}}...
  const rawData = JSON.parse(localStorage.getItem('OSM3dInfos') || '{}');
  // console.log('rawData', rawData);
  // console.log('Object.entries(rawData)', Object.entries(rawData));

  // 1) 只要值（对象本身）
  /* const arr = Object.values(rawData)
  arr.forEach(item => console.log(item)) */
  //2）还要key
  // const key = Object.keys(rawData)
  const data = Object.entries(rawData).map(([id, obj]) => ({
    elementId: id,
    ...obj,
  }));
  const newDataset = data.map((item) => {
    //新增订单数据和人流数据
    item.orders = Math.floor(Math.random() * 100);
    item.people = Math.floor(Math.random() * 30);
    // console.log(item);
    return item;
  });
  // console.log('newDataset', newDataset);

  return newDataset;

  // const newDataset = reactive([])
  /* 随机数
  const orders = Math.floor(Math.random()*100)
  const people = Math.floor(Math.random()*30) */
}


