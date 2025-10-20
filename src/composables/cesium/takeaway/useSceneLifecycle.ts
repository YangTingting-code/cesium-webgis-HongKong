import { useOrderStore } from '@/store/takeaway/orderStore'
import type { SceneStateManager } from '@/service/cesium/takeaway/SceneManage/SceneStateManager'
//数据更新后负责订单面板数据的更新
export function useSceneLifecycle(sceneManager: SceneStateManager) {
  const orderStore = useOrderStore()

  async function initScene(region: string, timeslot: number) {
    const bundle = await sceneManager.initializeOrders(region, timeslot)
    if (bundle) syncOrderStore(bundle)
  }

  async function switchRider() {
    const bundle = await sceneManager.switchRider()
    if (bundle) syncOrderStore(bundle)
  }

  function syncOrderStore(bundle: any) {
    orderStore.saveSequOrders(bundle.sequOrders)
    orderStore.saveCombinedOrder(bundle.combinedOrder)
    orderStore.initOrders() //有数据之后立马初始化面板
  }

  return { initScene, switchRider }
}