import { OverpassClient } from '../../service/cesium/heatmap/OverpassClient';
import { firstTimeSeed } from './initLocalDB';
import { buildingStore } from './localDB';
import { prepareFlowData } from './flowMock';

export class loadData {
  private client = new OverpassClient();
  async test(regions: Array<string>) {
    try {
      console.log('🔍 检查本地 IndexedDB...');
      /* 1. 等库连接成功，再用 length 做空库判断 */
      await buildingStore.ready(); // ← 新增
      const cnt = await buildingStore.length(); // ← 替换 keys()
      console.log('📦 本地已有建筑数量:', cnt);
      /* 2. 真正空库才抓数据 */
      if (cnt === 0) {
        console.log('⚠️ 本地为空，调用 Overpass 抓取...');
        const res = await this.client.fetchByBBox(regions);
        console.log('🌐 Overpass 原始数据元素数:', res.elements?.length ?? 0);
        await firstTimeSeed(res);
        console.log('✅ firstTimeSeed 完成');
      } else {
        console.log('✅ 本地已有数据，跳过抓取 Overpass');
      }
      console.log('🚶 准备人流数据...'); //人流数据
      prepareFlowData();
    } catch (e) {
      console.error('❌ dataTest 出错:', e);
    }
  }
}
