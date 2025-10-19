//管理 bucket 状态 因为需要监听 bucket 变化更新骑手配送状态

import { defineStore } from 'pinia' // 导入
import type { SegmentBuckets, flattenedSegmentsType } from '../../views/cesium/toolbar/takeaway/interface-nouse'
import { GlobalServices } from '../../service/cesium/takeaway/GlobalServices'


export const useBucketStore = defineStore('bucket', {
  //state 存放数据
  state: () => ({
    buckets: {} as SegmentBuckets,
    statusMap: {} as Record<string, string>, //每个订单状态
  }),



  //相当于计算属性
  getters: {
    currenTargetSeg: (state) => {
      const currentSegs = state.buckets.currentSegs
      let flattenedSegments: flattenedSegmentsType[]
      let seg: flattenedSegmentsType
      if (currentSegs) {
        const pathService = GlobalServices.pathService

        if (pathService) {
          flattenedSegments = pathService.getFlattened()
          const targetSegIdx = currentSegs[currentSegs.length - 1]
          seg = flattenedSegments[targetSegIdx]
          return seg
        }
      }

    }
  },

  //actions: 方法，能修改state
  actions: {
    updateBuckets(newBuckets: any) {
      this.buckets = newBuckets
    },

  }

})