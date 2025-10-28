// src/db/localDB.ts
import localForage from 'localforage';
import type {
  BuildingPolygon,
  NodePoint,
} from '@/interface/heatmap/interface';

localForage.setDriver([
  localForage.INDEXEDDB,
  localForage.LOCALSTORAGE, // 兜底
]);

// 两个“表”实例
export const buildingStore = localForage.createInstance({
  name: 'osmBuilding',
  storeName: 'buildings',
});
export const nodeStore = localForage.createInstance({
  name: 'osmNodePoint',
  storeName: 'nodes',
});

/**
 * 第一次初始化：远程 JSON → IndexedDB
 * @param remoteUrl 远程种子数据所在目录，例如 '/osm'
 */
export async function initDB(remoteUrl: string) {
  // 1. 检查本地是否已有数据，避免重复初始化
  const hasBuildings = await buildingStore.length();
  if (hasBuildings > 0) {
    console.log('✅ 本地 IndexedDB 已存在数据，跳过初始化');
    return;
  }

  try {
    console.log('🌐 拉取远程初始化数据...');
    // 2. 拉远程种子数据
    const [bRes, nRes] = await Promise.all([
      fetch(`${remoteUrl}/buildings.json`).then((r) => r.json()),
      fetch(`${remoteUrl}/nodes.json`).then((r) => r.json()),
    ]);

    console.log(
      `📦 buildings 数量: ${bRes.length}, nodes 数量: ${nRes.length}`
    );

    // 3. 批量写入（并行）
    await Promise.all([
      ...bRes.map((b: any) => buildingStore.setItem(String(b.id), b)),
      ...nRes.map((n: any) => nodeStore.setItem(String(n.id), n)),
    ]);

    console.log('✅ 本地数据库初始化完成');
  } catch (err) {
    console.error('❌ 初始化数据库失败:', err);
    throw err;
  }
}

/* --------- 单条读写 --------- */
export async function getBuilding(id: number) {
  return await buildingStore.getItem(String(id));
}
export async function getNode(id: number) {
  return await nodeStore.getItem(String(id));
}

export async function saveBuilding(b: BuildingPolygon) {
  if (!b.id) throw new Error('Building 缺少 id');
  await buildingStore.setItem(String(b.id), b);
}
export async function saveNode(n: NodePoint) {
  if (!n.id) throw new Error('Node 缺少 id');
  await nodeStore.setItem(String(n.id), n);
}

/* 清空所有数据（调试用） */
export const clearDB = () =>
  Promise.all([buildingStore.clear(), nodeStore.clear()]);

/** 获取所有数据 */
export async function getAllBuildings() {
  const all: any[] = [];
  await buildingStore.iterate((value) => {
    //能不能只写value？
    all.push(value);
  });
  return all;
}
