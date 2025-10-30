
import { type Viewer } from 'cesium'
import { type Ref } from 'vue'
import { saveCameraPos, setCameraPosition, removeCameraListener } from '@/utils/aboutCamera'

export function useCameraPersistence(viewerRef: Ref<Viewer | undefined>, isListen: Ref<boolean>) {
  function start() {
    if (!viewerRef.value) return
    saveCameraPos(viewerRef.value, isListen)
  }
  function stop() {
    removeCameraListener(isListen)
    sessionStorage.removeItem('cameraBeforeReload')
  }
  function restore() {
    const { destination, orientation } = JSON.parse(
      sessionStorage.getItem('cameraBeforeReload') || '{}'
    )
    if (!viewerRef.value) return
    if (destination) setCameraPosition(viewerRef.value, destination, orientation)
  }
  return { start, stop, restore }
}
