// src/db/firstTimeSeed.ts
import { Parser } from '../../service/cesium/heatmap/Parser';
import { buildingStore, nodeStore } from './localDB';

/** 第一次：解析 → IndexedDB */
export async function firstTimeSeed(overpassRaw: any) {
  const parser = new Parser();
  const buildings = parser.parseOverpassBuildings(overpassRaw);
  console.log('📦 buildings.length', buildings.length);

  // 1. 节点表：扁平化 + 外键
  const nodes = buildings.flatMap((b) =>
    b.functionNodes.map((n) => ({ ...n, building_id: b.id }))
  );
  console.log('📦 nodes.length', nodes.length);

  // 2. 建筑表：剥掉 functionNodes
  const slimBuildings = buildings.map((b) => {
    const { functionNodes, ...bare } = b;
    return bare;
  });
  console.log('📦 slimBuildings.length', slimBuildings.length);

  // IndexedDB 支持性
  console.log('👉 buildingStore 实例:', buildingStore);
  console.log('👉 浏览器支持 IDB:', !!window.indexedDB);

  console.log('👉 9 开始批量写');

  // 3. 批量写入
  try {
    const writeB = slimBuildings.map((b) => {
      if (!b.id) {
        console.error('❌ building 缺少 id', b);
        return Promise.resolve();
      }
      return buildingStore
        .setItem(String(b.id), b)
        .then(() => console.log('✅ 写建筑成功 id:', b.id))
        .catch((e) => {
          console.error('❌ 写建筑失败 id:', b.id, e);
          throw e;
        });
    });

    const writeN = nodes.map((n) => {
      if (!n.id) {
        console.error('❌ node 缺少 id', n);
        return Promise.resolve();
      }
      return nodeStore
        .setItem(String(n.id), n)
        .then(() => console.log('✅ 写节点成功 id:', n.id))
        .catch((e) => {
          console.error('❌ 写节点失败 id:', n.id, e);
          throw e;
        });
    });

    await Promise.all([...writeB, ...writeN]);

    console.log('✅ 本地数据库初始化完成');
  } catch (err) {
    console.error('❌ 批量写入失败:', err);
    throw err;
  }
}
