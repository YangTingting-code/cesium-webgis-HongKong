import { useCircleController } from './useCircleController'
import { useCameraPersistence } from './useCameraPersistence'
import { nextTick, onMounted, ref, type Ref } from 'vue'
import { type Viewer, Cesium3DTileset } from 'cesium'

export function useCircleSearch(viewerRef: Ref<Viewer | undefined>, tilesetRef: Ref<Cesium3DTileset | undefined>) {
  const controller = useCircleController(viewerRef, tilesetRef)

  const { radius, isStartDisabled, isStopDisabled, showControl } = controller

  const isListen = ref(false)
  const camera = useCameraPersistence(viewerRef, isListen)

  function startSearch() {
    camera.start()
    controller.enableInteraction()
  }
  function stopSearch() {
    camera.stop()
    controller.clearAll()
  }

  onMounted(async () => {
    await nextTick() //延迟一帧再执行 为什么延迟一帧就可以？
    const isRestore = controller.restore()
    if (isRestore)
      camera.restore()
  })

  return { radius, isStartDisabled, isStopDisabled, showControl, startSearch, stopSearch }
}

