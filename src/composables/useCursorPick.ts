//还未封装好 有空再弄。 鼠标移动到图钉实体上改变样式

import { onUnmounted, onMounted, type Ref } from 'vue'
import * as Cesium from 'cesium'

interface CursorPickOptions {
  pickInterval?: number; // 节流间隔（默认 80ms）
  targetKey?: string;    // 识别目标的 id 标识，比如 'pinEntity'
  containerId?: string;  // 容器 id（默认 'cesiumContainer'）
  onEnterPin?: (id: string) => void;
  onLeavePin?: () => void;
}

export function useCursorPick(viewerRef: Ref<Cesium.Viewer | undefined>, options?: CursorPickOptions) {
  const {
    pickInterval = 80,
    targetKey = 'pinEntity',
    containerId = 'cesiumContainer',
    onEnterPin,
    onLeavePin,
  } = options || {}

  let checking = false
  let currentPos: Cesium.Cartesian2 | null = null
  let lastX = 0, lastY = 0
  let lastPickTime = 0
  let lastCursorOnPin = false
  let frameId: number | null = null

  /** 启动检测 */
  function startCursorCheck(position: Cesium.Cartesian2) {
    currentPos = position
    if (!checking) {
      checking = true
      loop()
    }
  }

  /** 停止检测 */
  function stopCursorCheck() {
    checking = false
    if (frameId) cancelAnimationFrame(frameId)
  }

  /** 每帧循环检测 */
  function loop() {
    if (!checking) return
    frameId = requestAnimationFrame(loop)

    if (!currentPos || !viewerRef.value) return
    const { x, y } = currentPos
    if (x === lastX && y === lastY) return

    lastX = x
    lastY = y

    const now = performance.now()
    if (now - lastPickTime < pickInterval) return
    lastPickTime = now

    const viewer = viewerRef.value
    const picked = viewer.scene.pick(currentPos)
    const hitPin = picked?.id?._id?.includes(targetKey) ?? false

    const container = document.getElementById(containerId)
    if (hitPin !== lastCursorOnPin) {
      lastCursorOnPin = hitPin
      if (container) container.style.cursor = hitPin ? 'pointer' : 'default'

      if (hitPin && picked?.id?._id) {
        onEnterPin?.(picked.id._id)
      } else {
        onLeavePin?.()
      }
    }
  }

  /** 绑定鼠标移动事件（仅触发位置更新） */
  let handler: Cesium.ScreenSpaceEventHandler
  function bindMove() {
    if (!viewerRef.value) return
    handler = new Cesium.ScreenSpaceEventHandler(viewerRef.value.canvas)

    handler.setInputAction((movement: any) => {
      startCursorCheck(movement.endPosition)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  // useCursorPick
  onMounted(() => {
    if (viewerRef.value) bindMove()
  })
  onUnmounted(() => {
    stopCursorCheck()
    handler?.destroy()
  })

  return {
    bindMove,
    startCursorCheck,
    stopCursorCheck,
  }
}
