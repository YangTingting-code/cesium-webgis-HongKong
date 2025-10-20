//用于右侧二维轨迹线数据和订单面板数据更新的联动, 监听变化即可
import { defineStore } from 'pinia'

export const useCombinedControlStore = defineStore('combinedControlStore', {

  state: () => ({
    isUpdated: false
  }),

  actions: {
    updateStatus() {
      this.isUpdated = !this.isUpdated
    },
    getCurrentStatus() {
      return this.isUpdated
    }
  }
})