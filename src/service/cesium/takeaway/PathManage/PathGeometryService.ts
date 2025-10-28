import type { SegmentType, flattenedSegment, Leg, CombinedOrder, SegmentBuckets } from '@/interface/takeaway/interface'

import { range } from './PathUtils'

export class PathGeometryService {
  private flattenedSegments: flattenedSegment[] = []
  private legs: Leg[] = []
  private activeLegIndex = -1
  private currentPath: [number, number][] | null = null

  setPathData(order0: CombinedOrder, stepSegments: Record<string, SegmentType[]>) {

    this.currentPath = order0.fullpath || null

    let accumulatedDistance = 0
    //1. 展平段数据
    //sort 在这里什么作用
    Object.keys(stepSegments).sort((a, b) => Number(a) - Number(b)).forEach(stepKey => {
      const segs = stepSegments[stepKey]

      segs.forEach((seg, idx) => {
        const globalStart = accumulatedDistance
        const globalEnd = accumulatedDistance + seg.distance
        this.flattenedSegments.push({
          segment: seg, globalStart, globalEnd, stepIndex: Number(stepKey), segmentIndex: idx
        })
        accumulatedDistance = globalEnd
      })
    })

    //2. 按里程碑划分 leg
    let searchStart = 0
    const scale = order0.milestones[order0.milestones.length - 1].cumDistance / this.flattenedSegments[this.flattenedSegments.length - 1].globalEnd //全局比例 cumDistance < flattenedDistance ,cumDistance / scale => cumDistance2flattenedDistance

    //遍历里程碑
    for (let i = 0; i < order0.milestones.length - 1; i++) {

      const currentMilestone = order0.milestones[i]
      const nextMilestone = order0.milestones[i + 1]

      const startD = currentMilestone.cumDistance
      const endD = nextMilestone.cumDistance

      //根据里程碑转换到flatten的距离找到对应的segment
      const startIdx = this.findSegmentIndexByRealCum(startD, searchStart, scale)
      const endIdx = this.findSegmentIndexByRealCum(endD, startIdx, scale) + 1

      let startDistance = this.flattenedSegments[startIdx].globalStart
      let endDistance = this.flattenedSegments[endIdx - 1].globalEnd

      this.legs.push({
        startMilestone: i,
        endMilestone: i + 1,
        segmentIndices: range(startIdx, endIdx), //[startIdx,endIdx)的段
        //用于几何范围判断?
        startDistance,
        endDistance,

        //用于边界校准
        startCum: startD,
        endCum: endD
      })

      searchStart = endIdx
    }

    //最后一段 endDistance 对齐 order0.distance（修正几何偏差） 打补丁
    // 那如果每一段的endDistance 都修正呢?
    for (let i = this.legs.length - 1; i >= 0; i--) {
      if (this.legs[i].endDistance > order0.distance) {
        if (Math.abs(this.legs[i].endDistance - this.legs[i].startDistance) <= 1e-2) { //如果起点和终点相等 起点也要修正
          this.legs[i].startDistance = order0.distance;
        }
        this.legs[i].endDistance = order0.distance;
      } else break;
    }

    const lastLeg = this.legs[this.legs.length - 1]

    //虚拟段 骑手运动到终点之后再延伸一段 为了骑手回退的时候不会被误判一直最后一段，因为之前骑手运动到最后是通过终点距离更新的buckets状态 回退的时候依旧被判断在最后一段，这不对，于是在最后加一个虚拟段，这样终点回退的时候就可以更新了。
    this.legs.push({
      startDistance: lastLeg.endDistance,
      endDistance: lastLeg.endDistance + 0.001,  // 给一点极小长度
      startCum: lastLeg.endCum,
      endCum: lastLeg.endCum,
      startMilestone: lastLeg.endMilestone,
      endMilestone: lastLeg.endMilestone + 1,    // 虚拟 milestone
      segmentIndices: [],                        // ✅ 空数组
    })

  }


  getFlattened() {
    return this.flattenedSegments
  }
  getLegs() { return this.legs }

  getActiveLegIndex() { return this.activeLegIndex }
  setActiveLegIndex(i: number) { this.activeLegIndex = i; }

  getCurrentPath() {
    return this.currentPath
  }

  // updateSegmentsType 迁入
  updateBuckets(currentDistance: number, isBack: boolean): SegmentBuckets | null {
    const currentSegs: number[] = []
    const pastSegs: number[] = []
    const futureSegs: number[] = []
    let activeIndex = -1

    const pastIndex = this.activeLegIndex //-1

    // 如果骑手仍在上一次的路径段内，不重新计算 bucket（防止重复刷新）
    // 但有时运动到整个路径终点 仍然不更新 因为有浮点误差导致 比如99.99停下来了 但是总共是100m 那么最终状态不会更新
    //this.legs[pastIndex].endDistance存储的距离比实际计算出来的距离要大，导致最后终点轨迹状态更新失败，最后骑手运行到终点 仍然会被这句话弹出来，被误认为还是在上一段。
    const EPS = 0.01
    const toleranceD = 2

    //提前判断是否仍在当前段
    if (pastIndex >= 0 && this.legs[pastIndex]) {
      const pastLeg = this.legs[pastIndex]
      if (isBack) {
        // 当 currentDistance 仍大于上一段的起点时，还没真正“退过”该段
        if (pastLeg.startDistance - toleranceD < currentDistance + EPS)
          return null
      } else {
        if (pastLeg.endDistance - toleranceD > currentDistance + EPS)
          return null
      }

    }

    if (isBack) {
      for (let i = Math.min(this.legs.length - 1, pastIndex); i >= 0; i--) {
        const leg = this.legs[i]
        if (currentDistance <= leg.endDistance && currentDistance > leg.startDistance) {
          activeIndex = i
          break
        }
      }
    } else {
      // 1. 找到第一个 endDistance 大于 currentDistance 的 leg
      for (let i = 0; i < this.legs.length; i++) {
        const leg = this.legs[i]
        if (currentDistance >= leg.startDistance && currentDistance < leg.endDistance) {
          activeIndex = i
          break
        }
      }

      // 2.如果所有 leg 都走完，全部归入 past 当前的distance大于最后一共leg的endDistance 说明没有当前段和未来段，所有段落都归入past
      // 没有找到任何段

    }
    if (activeIndex === -1) {
      if (isBack) {
        this.activeLegIndex = 0
        const firstLeg = this.legs[0]
        if (!firstLeg) return null
        currentSegs.push(...firstLeg.segmentIndices)
        for (let i = 1; i < this.legs.length; i++) {
          futureSegs.push(...this.legs[i].segmentIndices)
        }
      } else {
        this.activeLegIndex = this.legs.length - 1
        for (const leg of this.legs) {
          pastSegs.push(...leg.segmentIndices)
        }
      }
    } else {
      // 3. 正常情况：切分为 past / current / future
      this.activeLegIndex = activeIndex

      currentSegs.push(...this.legs[activeIndex].segmentIndices)

      //和正向时的逻辑一样，在activeIndex之前的为past，之后的为future 
      for (let i = 0; i < activeIndex; i++) {
        pastSegs.push(...this.legs[i].segmentIndices)
      }

      for (let i = activeIndex + 1; i < this.legs.length; i++) {
        futureSegs.push(...this.legs[i].segmentIndices)
      }

    }

    return {
      currentSegs: currentSegs,
      pastSegs: pastSegs,
      futureSegs: futureSegs
    }
  }

  // 根据累计距离找到里程碑对应的segmentIdx
  private findSegmentIndexByRealCum(realStartD: number, searchIdx: number, scale: number) { // cumD < FD , scale = cumD / FD , cumD => FD 需要 cumD / scale
    const real2FlattenD = realStartD / scale //第一步 Baidu里程映射到flatten
    let idx = searchIdx
    const toleranceD = 5
    for (let i = searchIdx; i < this.flattenedSegments.length; i++) {
      const seg = this.flattenedSegments[i]
      if (seg.globalStart - toleranceD <= real2FlattenD && seg.globalEnd + toleranceD >= real2FlattenD) {
        idx = i
        break
      }
    }
    return idx
  }

  reset() {
    this.flattenedSegments = []
    this.legs = []
    this.activeLegIndex = -1
  }

}

