import localForage from 'localforage';
import type { FlowHour } from '../../../interface/heatmap/interface';
interface FlowHour_sceneType {
  slot: number;
  timestamp: string; //ISO
  points: Array<{
    region: string,
    sceneType: string,
    lng: number;
    lat: number;
    value: number; // 当前人流（basePeople）
  }>;
}

export class FlowWeek {
  heatStore = localForage.createInstance({
    name: 'osmBuilding',
    storeName: 'heatSnap',
  });
  private oneDay_SevenPeriod = this.makeEmptySevenPeriod()

  // 时间段配置表
  private timeSlots = [
    { key: "night", start: 0, end: 6 },  // [0,6) 共 6 小时
    { key: "earlyMorning", start: 6, end: 8 },  // [6,8) 共 2 小时
    { key: "morning", start: 8, end: 10 }, // [8,10) 共 2 小时
    { key: "lunch", start: 10, end: 14 }, // [10,14) 共 4 小时
    { key: "afternoon", start: 14, end: 17 }, // [14,17) 共 3 小时
    { key: "evening", start: 17, end: 20 }, // [17,20) 共 3 小时
    { key: "lateEvening", start: 20, end: 24 }, // [20,24) 共 4 小时
  ];
  // 工具函数：生成一个空的功能区对象
  private makeEmptyRegion() {
    return {
      officeArea: 0,
      residentialArea: 0,
      mallArea: 0,
      educationArea: 0,
      stationArea: 0,
      mixedArea: 0,
    };
  }
  // 工具函数：生成七个时间段的容器
  private makeEmptySevenPeriod() {
    return {
      night: this.makeEmptyRegion(),
      earlyMorning: this.makeEmptyRegion(),
      morning: this.makeEmptyRegion(),
      lunch: this.makeEmptyRegion(),
      afternoon: this.makeEmptyRegion(),
      evening: this.makeEmptyRegion(),
      lateEvening: this.makeEmptyRegion(),
    };
  }
  // 工具函数 生成“行政区 → 7 时段 → 6 功能”空壳
  private makeEmptyRegionByPeriod() {
    const regions = ["九龙城区", "油尖旺区", "深水埗区", "黄大仙区", "观塘区"] // 按需补充
    const obj: Record<string, typeof this.oneDay_SevenPeriod> = {} //string 写的是region {"九龙城区",{night:{officeArea:xx,..},...},...}
    regions.forEach(r => obj[r] = this.makeEmptySevenPeriod())
    return obj
  }
  // 工具：生成“行政区 → 6 功能”空桶（只用于时段累加）
  private makeEmptyBucket() {
    return {
      officeArea: 0,
      residentialArea: 0,
      mallArea: 0,
      educationArea: 0,
      stationArea: 0,
      mixedArea: 0,
    };
  }
  /**日期 -> 0 - 167 */
  private date2slot(d: Date) {
    //这是什么意思
    const day = (d.getUTCDay() || 7) - 1; // 0 - 6
    return day * 24 + d.getUTCHours(); // 0 - 167
  }
  /** ① 建壳：168 条空记录（value=0）
   * @param 传入所有建筑
   */
  async initShell(buildings: { region: string, sceneType: string, centroid: { lng: number; lat: number } }[]) {
    this.heatStore.clear();
    // console.log('buildings[0].centroid', buildings[0].centroid);

    const shellPoints: { region: string, sceneType: string; lng: number; lat: number; value: number }[] =
      buildings.map((b) => ({
        region: b.region, //给热力数据存入区域信息
        sceneType: b.sceneType,
        lng: b.centroid.lng,
        lat: b.centroid.lat,
        value: 0,
      }));
    const base = new Date('2025-01-01T00:00:00Z'); //改成用户前八天 当天的人流量不计算 后面能用机器学习做人流预测吗
    for (let i = 0; i < 168; i++) {
      //7天每小时的人流 一共是168小时
      const t = new Date(base.getTime() + i * 3600_000); //这句话是什么意思
      const slot = this.date2slot(t);
      await this.heatStore.setItem(`slot:${slot}`, {
        slot,
        timestamp: t.toISOString(),
        points: structuredClone(shellPoints), //这句话什么意思？// 深拷贝，防止引用共享？
      } as FlowHour);
    }
  }
  /** ② 覆盖整周（重新生成） */
  async rebuild(
    buildings: any[],
    compute: (
      bulidings: any[],
      t: Date
    ) => { lng: number; lat: number; value: number }[]
  ) {
    await this.heatStore.clear();
    const base = new Date('2025-01-01T00:00:00Z'); //改成用户前八天 当天的人流量不计算 后面能用机器学习做人流预测吗
    for (let i = 0; i < 168; i++) {
      const t = new Date(base.getTime() + i * 3600_000); //这是什么意思？
      const slot = this.date2slot(t);
      const points = compute(buildings, t); //外部计算人流value
      await this.heatStore.setItem(`slot:${slot}`, {
        slot,
        timestamp: t.toISOString(),
        points,
      } as FlowHour);
    }
  }

  /**  ③ 只改某小时 value*/
  async updateValue(t: Date, newValues: number[]) {
    const slot = this.date2slot(t);
    const key = `slot:${slot}`;
    const old = (await this.heatStore.getItem(key)) as FlowHour | null;
    if (!old) return;
    old.points.forEach((p, i) => {
      p.value = newValues[i] ?? 0;
    });

    await this.heatStore.setItem(key, old);
    return old;
  }
  /** ④ 读单小时 */
  async getHour(t: Date) {
    const slot = this.date2slot(t);
    return (await this.heatStore.getItem(`slot:${slot}`)) as FlowHour | null;
  }
  /** ⑤ 读连续 N 小时 */
  async getRange(start: Date, hours = 24) {
    let res = [];
    for (let i = 0; i < hours; i++) {
      const t = new Date(start.getTime() + i * 3600_000);
      const slot = this.date2slot(t);
      res.push(
        (await this.heatStore.getItem(`slot:${slot}`)) as FlowHour | null
      );
    }
    return res;
  }
  /** ⑥ 是否有完整 168 条 */
  async isComplete() {
    return (await this.heatStore.keys()).length === 168;
  }

  //分类 获取各个功能区的人流总和 ，但是没有做分区 
  async averDiffRegionByDay() { //一语双关 各个功能区 不同行政区
    // return await this.heatStore.getItem('slot:0')    
    type SceneKey = keyof ReturnType<typeof this.makeEmptyRegion>; // 6 个键联合
    const base = new Date('2025-01-01T00:00:00Z') //定死 从0点开始 
    const result = this.makeEmptyRegionByPeriod() //空壳 用来装结果
    const regions = Object.keys(result)
    // 行政区 -> 功能区累积桶
    const bucket: Record<string, ReturnType<typeof this.makeEmptyBucket>> = {}; //返回类型是makeEmptyBucket这个函数返回的
    // const keys = Object.keys(this.sumSevenPeriod) as (keyof typeof this.sumSevenPeriod)[]
    for (let i = 0; i < 24; i++) { //遍历一天内每一个slot, 24h
      const t = new Date(base.getTime() + i * 3600_000)
      const slot = this.date2slot(t)
      const res: FlowHour_sceneType | null = await this.heatStore.getItem(`slot:${slot}`)
      if (!res) {
        console.log('没有获得数据，继续下一个')
        continue
      }

      //1. 把当前小时累进桶
      res.points.forEach(p => {
        const key = p.sceneType as SceneKey
        // ① 保证桶里有这个行政区
        if (!bucket[p.region]) {
          bucket[p.region] = this.makeEmptyBucket();
        }
        bucket[p.region][key] += p.value
        //"九龙区"->"officeArea"
      })

      //2.判断当前小时是否刚好结束一个事件段
      const seg = this.timeSlots.find(s => i === s.end - 1)
      if (seg) {
        //3.把桶里累加值 / 时间长度 -> 得到"该时段每小时平均"
        const hours = seg.end - seg.start
        regions.forEach(r => {
          if (!bucket[r]) {
            bucket[r] = this.makeEmptyBucket();
          }
          const sceneKeys = Object.keys(bucket[r]) as SceneKey[]
          sceneKeys.forEach(k => {
            result[r][seg.key][k] = bucket[r][k] / hours //得到每一个时间段的人流量
          })
        })
        //4.清空桶，准备下一个时段
        regions.forEach(r =>
          bucket[r] = this.makeEmptyBucket()
        )
      }

    }
    return result
  }
}
export const flowWeek = new FlowWeek(); // 单例
