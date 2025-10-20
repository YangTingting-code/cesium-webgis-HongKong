import { flowWeek } from '../../service/cesium/heatmap/FlowWeek';
import { getAllBuildings } from './localDB';
import { getPoints } from './calculatePeople';

export async function prepareFlowData() {
  try {
    /* 1. 首次进页面 一次性生成数据 先存储数据 再绘制*/
    if (!(await flowWeek.isComplete())) {
      const buildings = await getAllBuildings();
      await flowWeek.initShell(buildings); //空壳
      let virtualTime = new Date('2025-01-01T00:00:00+08:00');
      const totalHour = 168;
      const tongjiArr = [];
      for (let i = 0; i < totalHour; i++) {
        const { points, res } = getPoints(buildings, virtualTime);
        tongjiArr.push(res);
        // value？ /* 2. 更新数据 只改 value */
        const newValues = points.map((p: any) => p.value || 0);
        await flowWeek.updateValue(virtualTime, newValues);
        virtualTime = new Date(virtualTime.getTime() + 3600_000);
      }
      console.log('tongjiArr', tongjiArr);

      /* 3. 用户点击“重新生成”  重新渲染热力图*/
      //通知其他监听的 目前更新了一次数据
      // window.dispatchEvent(new CustomEvent('flow:update', { detail: snap }));
    } else {
      console.log('本地已存储了人流数据');
    }
  } catch (err) {
    console.error('更新人流或热力图失败:', err);
  }
}
