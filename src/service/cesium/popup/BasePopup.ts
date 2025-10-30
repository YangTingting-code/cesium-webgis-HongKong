import { type Ref } from 'vue';
import { Viewer, Entity, Cartesian3, SceneTransforms } from 'cesium'
import { throttle } from 'lodash-es'

//弹窗偏移
type PopupMetrics = { id: string; instance: BasePopup }

export abstract class BasePopup {
  protected viewer: Viewer;
  protected entity: Entity | undefined;
  protected div: HTMLDivElement;
  protected appInstance: any; //vue应用实例

  //弹窗遮挡偏移
  protected static registry = new Map<string, PopupMetrics>()
  protected static MIN_GAP = 12
  protected entityId: string
  protected baseTop = 0
  protected extraOffset = 0
  protected cachedHeight = 0
  protected cachedWidth = 0
  protected baseLeft = 0

  protected postRenderFn: () => void
  protected showRef: Ref<boolean>;
  protected scale = 1;

  constructor(viewer: Viewer, entityId: string, showRef: Ref<boolean>) {
    this.viewer = viewer
    this.entity = this.viewer.entities.getById(entityId)
    this.entityId = entityId
    this.showRef = showRef
    //创建DOM
    this.div = document.createElement('div')

    this.div.style.position = 'absolute'
    this.viewer.cesiumWidget.container.appendChild(this.div)

    //帧刷新绑定
    this.postRenderFn = this.updatePosition.bind(this)
    // this.throttleUpdatePosition() 没必要节流了 会让弹窗可见性来不及更新 挂载地图容器边界

    // this.updatePosition.bind(this)
    /**bind(this) 会返回一个新的函数，并且在调用时 this 永远指向当前的 DynamicPopup 实例。
因为 updatePosition 是类的方法，如果直接传给 addEventListener，this 会指向 Cesium 的上下文，而不是你的类实例，所以要 bind(this) 保证方法内的 this.div、this.viewer 等能正常访问 */
    this.viewer.scene.postRender.addEventListener(this.postRenderFn)
    this.setupVisibilityWatcher()

    BasePopup.registry.set(entityId, { id: entityId, instance: this })
  }

  /** 子类必须挂载自己的 Vue 内容 */
  abstract mountContent(): void

  //外界可以覆盖这个偏移量
  protected getOffsetY(): number {
    return 90
  }
  /** 每帧更新位置  */
  protected updatePosition() {
    if (!this.entity || !this.entity.position) return;
    if (this.showRef && !this.showRef.value) {
      this.div.style.display = 'none';
      return;
    }

    this.cachedHeight = this.cachedHeight || this.div.offsetHeight //只有第一次的时候会读取位置 以后都是从缓存高度里面获取 减少浏览器重排
    this.cachedWidth = this.cachedWidth || this.div.offsetWidth

    BasePopup.resolveCollisions()

    const position = this.entity.position.getValue(this.viewer.clock.currentTime)

    if (!position) return
    //更新弹窗位置
    this.updatePos(position)

    // 可见性控制
    const cameraPosition = this.viewer.camera.position;
    let height =
      this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cameraPosition)
        .height;
    height += this.viewer.scene.globe.ellipsoid.maximumRadius;

    if (
      !(Cartesian3.distance(cameraPosition, position) > height) &&
      this.viewer.camera.positionCartographic.height < 50000000
    ) {
      this.div.style.display = 'block';
    } else {
      this.div.style.display = 'none';
    }
  }

  private updatePos(position: Cartesian3) {
    const screenPos = SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      position
    );
    if (!screenPos) return

    //算完 screenPos 之后新增缓存
    this.baseTop = screenPos.y - this.getOffsetY()
    this.baseLeft = screenPos.x

    // === 相机高度缩放：越高越大，越近越小 ===
    const cameraHeight = this.viewer.camera.positionCartographic.height;
    const BASE_HEIGHT = 500;  // 基准高度
    const scale = Math.min(0.8, Math.max(0.6, cameraHeight / BASE_HEIGHT));
    // 应用位置 + 缩放
    const finalTop = this.baseTop + this.extraOffset
    this.div.style.left = `${screenPos.x}px`;
    this.div.style.top = `${finalTop}px`;
    this.div.style.transform = `translate(-50%, -100%) scale(${scale})`;
    this.div.style.transformOrigin = 'center bottom';
  }

  //解决弹窗之间的遮盖
  protected static resolveCollisions() {
    const visiblePopups = [...BasePopup.registry.values()]
      .map(({ instance }) => instance) // {instance} 解构的语法 把每个对象里的 instance 字段取出来 换成弹窗实例数组
      .filter(p => p.showRef.value)  //筛选看得见的弹窗

    if (!visiblePopups.length) return

    // 所有弹窗的平均宽度 + 安全间距 作为一列的宽度阈值
    const avgWidth = visiblePopups.reduce((sum, popup) => sum + popup.cachedWidth, 0) / visiblePopups.length || 1
    const columnWidth = avgWidth + BasePopup.MIN_GAP  //平均宽度 + 阈值

    // 按列(x方向)把弹窗分组：横向差距很大的弹窗会落在不同的列 不必互相让位
    const columns = new Map<number, BasePopup[]>()
    for (const popup of visiblePopups) {
      const columnKey = Math.round(popup.baseLeft / columnWidth) //把整个画布分桶 
      const list = columns.get(columnKey)
      if (list) {
        list.push(popup)
      } else {
        columns.set(columnKey, [popup])
      }
    }
    const screenHeight = window.innerHeight
    for (const column of columns.values()) {
      column.sort((a, b) => a.baseTop - b.baseTop) //这里是在同一“列”的弹窗做高度排序 只有一个元素时，sort 会直接返回，不会出错

      let lastBottom = -Infinity //lastBottom 保存“上一弹窗实际占到的底部坐标” 这里是为了遍历所有弹窗时的第一轮好判断，第一肯定是没有遮挡的 
      for (const popup of column) {
        const desiredTop = popup.baseTop //不考虑遮挡时的位置（当前帧计算出的 baseTop）。
        const minAllowedTop = lastBottom + BasePopup.MIN_GAP // 向下错开至少 MIN_GAP 像素
        let finalTop = Math.max(desiredTop, minAllowedTop) // 如果已经足够远，就保持原位
        // 防止被挤出屏幕底部
        const maxAllowedTop = screenHeight - popup.cachedHeight - BasePopup.MIN_GAP
        if (finalTop > maxAllowedTop) {
          finalTop = maxAllowedTop
        }
        popup.extraOffset = finalTop - desiredTop  // 记下需要额外抬高多少
        lastBottom = finalTop + popup.cachedHeight  // 更新“这一列目前占到的最低点”
      }

    }
  }
  //删除某个弹窗之后其他弹窗都要更新位置
  protected static refreshAllPositions() {
    for (const { instance } of BasePopup.registry.values()) {
      if (!instance || !instance.entity || !instance.entity.position) continue
      const pos = instance.entity.position.getValue(instance.viewer.clock.currentTime)
      if (!pos) continue
      instance.updatePos(pos)
    }
  }
  // 可选：集中版
  protected static recomputeLayout() {
    for (const { instance } of BasePopup.registry.values()) {
      const pos = instance.entity?.position?.getValue(instance.viewer.clock.currentTime)
      if (!pos) continue
      const screen = SceneTransforms.worldToWindowCoordinates(instance.viewer.scene, pos)
      if (!screen) continue
      instance.baseTop = screen.y - instance.getOffsetY()
      instance.baseLeft = screen.x
    }
    BasePopup.resolveCollisions()
    for (const { instance } of BasePopup.registry.values()) {
      const pos = instance.entity?.position?.getValue(instance.viewer.clock.currentTime)
      if (pos) instance.updatePos(pos)
    }
  }

  protected throttleUpdatePosition = () => {
    return throttle(this.updatePosition.bind(this), 50)
  }

  //判断弹窗的可见性
  protected infoPopupVisible(): boolean { // 还是用图钉来判断popup位置
    const pos = this.entity?.position?.getValue(this.viewer.clock.currentTime)
    if (!pos) return false
    const canvas = this.viewer.canvas
    const posC2 = SceneTransforms.worldToWindowCoordinates(this.viewer.scene, pos)
    if (!posC2) return false
    return (
      posC2.x > 0 &&
      posC2.y > 0 &&
      posC2.x <= canvas.width &&
      posC2.y <= canvas.height
    )
  }

  protected cameraChangedHandler = () => {
    const isPopupVisble = this.infoPopupVisible()
    if (isPopupVisble) {
      //帧刷新绑定 视野离开的时候不再帧刷新
      this.viewer.scene.postRender.addEventListener(this.postRenderFn) //原来有一个postRender函数是处理每一帧刷新的
    } else {
      this.viewer.scene.postRender.removeEventListener(this.postRenderFn) //原来有一个postRender函数是处理每一帧刷新的
    }
  }

  //照相机每次改变位置都会检测能不能看见
  protected setupVisibilityWatcher() {
    this.viewer.camera.changed.addEventListener(this.cameraChangedHandler)
  }

  /* ---------------- 解绑 ---------------- */
  protected removeVisibilityWatcher() {
    this.viewer.camera.changed.removeEventListener(this.cameraChangedHandler)
  }

  show() {
    if (this.showRef) this.showRef.value = true;
  }
  hide() {
    if (this.showRef) this.showRef.value = false;
  }
  //切换

  toggle() {
    if (this.showRef) this.showRef.value = !this.showRef.value;
  }
  /**销毁  为什么是销毁这些？
   * 解除帧刷新事件绑定，避免内存泄漏
   * 删除 DOM，避免页面上残留无用的弹窗
   * */
  destroy() {
    this.viewer.scene.postRender.removeEventListener(this.postRenderFn);
    this.div.remove();
    //删除注册表  this.div.id 存储的就是 popupId 
    BasePopup.registry.delete(this.entityId)

    // 统一重排
    BasePopup.recomputeLayout()

    //移除可见性监听
    this.removeVisibilityWatcher()
  }

}