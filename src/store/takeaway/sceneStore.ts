import { defineStore } from 'pinia'
import type { SceneStateManager } from '@/service/cesium/takeaway/SceneManage/SceneStateManager'
// import  {type Ref,ref} from 'vue'
let _manager: SceneStateManager | null = null

export const useSceneStore = defineStore('sceneManager', {
  state: () => ({
    isReady: false,
    startPolling: () => { },
    stopPolling: () => { },
    timeoutId: null as unknown //用于订单面板的startLater延时器管理
  }),
  actions: {
    setManager(manager: SceneStateManager) {
      _manager = manager
      this.isReady = true
    },

    getManager() {
      return _manager
    },

    setPollingFns(startPolling: () => void, stopPolling: () => void) {
      this.startPolling = startPolling
      this.stopPolling = stopPolling
    },

    updateTimeoutId(newTimeoutId: number | null) {
      this.timeoutId = newTimeoutId
    },

    clearTimeout() {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId as number)
        this.timeoutId = null
      }
    }
  }
})