import { defineStore } from 'pinia'
export const useToolStatusStore = defineStore('toolStatusStore', {
  state: () => ({
    toolStatus: { //功能是否运行
      spatialSearch: false,
      heatmap: false,
      takeaway: false,
    },
    panelOpen: {           // 面板是否打开
      spatialSearch: false,
      heatmap: false,
      takeaway: false,
    }
  }),
  getters: {
    /** 只要有任一功能“面板开”或“运行中”就视为占用 */
    isOccupied(): boolean {
      const keys = Object.keys(this.toolStatus) as Array<keyof typeof this.toolStatus>
      return keys.some(k => this.toolStatus[k] || this.panelOpen[k])
    },

    /** 当前独占中的 key（运行优先，其次面板） */
    occupant(): string {
      const keys = Object.keys(this.toolStatus) as Array<keyof typeof this.toolStatus>
      return keys.find(k => this.toolStatus[k] || this.panelOpen[k]) || ''
    }
  },
  actions: {
    /** 请求打开某面板 */
    // tryOpenPanel(type: keyof typeof this.toolStatus): boolean {
    //   // 1. 自己 already open → 直接放行
    //   if (this.panelOpen[type]) return true

    //   // 2. 被别的占用 → 拒绝
    //   if (this.isOccupied && this.occupant !== type) {
    //     console.warn(`【${this.occupant}】占用中，请先关闭`)
    //     return false
    //   }

    //   // 3. 否则占用成功
    //   this.panelOpen[type] = true
    //   return true
    // },

    tryOpenPanel(type: keyof typeof this.toolStatus): boolean {
      // 1. 任何其他功能（面板或运行中）占用中 → 拒绝
      if (this.isOccupied && this.occupant !== type) {
        console.warn(`【${this.occupant}】占用中，请先关闭`)
        return false
      }

      // 2. 否则可以开（不管之前是不是自己开的，先占坑）
      this.panelOpen[type] = true
      return true
    },

    /** 关闭面板（若功能未运行可一并清掉） */
    closePanel(type: keyof typeof this.toolStatus) {
      this.panelOpen[type] = false
      // 如果功能也没在跑，就彻底释放
      if (!this.toolStatus[type]) {
        this.toolStatus[type] = false
      }
    },

    /** 功能开始运行 */
    startTool(type: keyof typeof this.toolStatus) {
      this.toolStatus[type] = true
    },

    /** 功能停止运行 */
    stopTool(type: keyof typeof this.toolStatus) {
      this.toolStatus[type] = false
      // 面板也关了，彻底释放
      // this.panelOpen[type] = false
    }
  }


})