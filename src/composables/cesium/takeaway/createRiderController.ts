/* 这个 composable 专门负责：
管理轮询定时器
调用 SceneStateManager.switchRider()
同步更新 UI 状态 */

import { useCombinedControlStore } from '@/store/takeaway/combinedControlStore'
import type { SceneStateManager } from '@/service/cesium/takeaway/SceneManage/SceneStateManager'
import { useSceneLifecycle } from './useSceneLifecycle'
import { ref } from 'vue'

export function useRiderController(sceneManager: SceneStateManager) {
  const isPolling = ref(false)
  let intervalId: number | null = null
  const { switchRider } = useSceneLifecycle(sceneManager)

  const startPolling = (intervalMS = 5000) => {
    if (intervalId) return

    intervalId = setInterval(async () => {
      //切换面板数据
      switchRider()
      // await sceneManager.switchRider()

      //通知下面的二维路径更新数据
      const combinedControlStore = useCombinedControlStore()
      combinedControlStore.updateStatus()

    }, intervalMS)

    isPolling.value = true
  }

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
      isPolling.value = false

    }

  }

  return { startPolling, stopPolling, isPolling }
}