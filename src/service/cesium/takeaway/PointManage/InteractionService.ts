import * as Cesium from 'cesium'
import { throttle } from 'lodash-es'
import type { PopupService } from './PopupService'
import type { PinRenderService } from './PinRenderService'

export class InteractionService {
  private viewer: Cesium.Viewer
  private popupService: PopupService
  private clickHandler: Cesium.ScreenSpaceEventHandler | null = null
  private moveHandler: Cesium.ScreenSpaceEventHandler | null = null
  private cameraHandlerBound: (() => void) | null = null
  private pinRender: PinRenderService
  constructor(viewer: Cesium.Viewer, popupService: PopupService, pinRender: PinRenderService) {
    this.viewer = viewer
    this.popupService = popupService
    this.pinRender = pinRender
  }

  public bind() {
    this.bindClick()
    // this.bindMoveWatcher()
    // this.bindCameraWatcher()
  }

  public unbind() {
    this.clickHandler?.destroy()
    this.moveHandler?.destroy()
    if (this.cameraHandlerBound)
      this.viewer.camera.changed.removeEventListener(this.cameraHandlerBound)
    this.clickHandler = null
    this.moveHandler = null
  }

  private bindClick() {
    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    this.clickHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = this.viewer.scene.pick(click.position)
      if (Cesium.defined(picked) && picked.id?._id) {
        this.popupService.toggle(picked.id._id)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  private bindMoveWatcher() {
    //需要像另外一个弹窗图钉那样聪明一点 不要直接用节流函数而是手动节流
    this.moveHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    const throttled = throttle((pos: Cesium.Cartesian2) => {
      const picked = this.viewer.scene.pick(pos)
      const viewerContainer = document.getElementById('cesiumContainer')
      const hit = Cesium.defined(picked) && picked.id?._id
      if (viewerContainer) viewerContainer.style.cursor = hit ? 'pointer' : 'default'
    }, 200)

    this.moveHandler.setInputAction((move: any) => {
      throttled(move.endPosition)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  private bindCameraWatcher() {
    const handler = () => {
      // 可根据你的 checkPinVisibility 逻辑扩展
      const allIds = this.pinRender.getAllIds()

      const visible = this.checkPinVisibility(allIds)
      if (visible && !this.moveHandler) { //如果可以看见pin 并且此时是没有做mousemove监听 就绑定
        this.bindMoveWatcher()
      } else if (!visible && this.moveHandler) {
        this.unbindMoveAction2()
      }

    }
    this.viewer.camera.changed.addEventListener(handler)
    this.cameraHandlerBound = handler
  }

  private checkPinVisibility(pinEntityIds: string[]): boolean {
    const canvas = this.viewer.canvas

    for (let i = 0; i < pinEntityIds.length; i++) {
      const pinEntity = this.viewer.entities.getById(pinEntityIds[i])
      const pos = pinEntity?.position?.getValue(this.viewer.clock.currentTime) //为什么用 时间获取位置? 为什么说entity的位置会变化? 对于动态点来说这个位置是实时更新的 可以根据时间获取当前最新位置 对于静态点也能用 不会有任何性能问题
      if (!pos) continue
      const windowCoord = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, pos)
      if (!windowCoord) continue

      const isPinVisble =
        windowCoord.x >= 0 &&
        windowCoord.y >= 0 &&
        windowCoord.x <= canvas.width &&
        windowCoord.y <= canvas.height

      if (isPinVisble) return true
    }
    return false
  }
  private unbindMoveAction2() {
    this.moveHandler?.destroy()
    this.moveHandler = null
  }
}
