import * as Cesium from 'cesium';
import { createApp, type Ref, ref } from 'vue'
import Popup from '@/components/takeaway/Popup.vue'
import { throttle } from 'lodash-es'

//弹窗偏移
type PopupMetrics = { id: string; instance: InfoPopup }

interface PopupOptions {
  popupId: string
  title: string
  viewer: Cesium.Viewer
  entityId: string
  pickName?: string
  opening_hours?: string
  phone?: string
  cuisine?: string
  facebook?: string
  instagram?: string

  //送货点
  dropoffName?: string,
  region?: string,
  building?: string,
  description?: string

}
export default class InfoPopup {
  private div: HTMLElement;
  private viewer: Cesium.Viewer
  private postRenderFn: () => void
  private entity: Cesium.Entity | undefined//用于存储pin图钉实例 做跟随的
  private showRef: Ref<boolean> = ref(false)
  private appInstance: any //vue应用实例

  //弹窗遮挡偏移
  private static registry = new Map<string, PopupMetrics>()
  private static MIN_GAP = 12
  private baseTop = 0
  private extraOffset = 0
  private cachedHeight = 0
  private cachedWidth = 0
  private baseLeft = 0

  constructor(option: PopupOptions) {
    this.viewer = option.viewer
    this.entity = this.viewer.entities.getById(option.entityId)

    this.div = document.createElement('div')
    this.div.id = option.popupId
    this.div.style.position = 'absolute'

    //创建vue组件实例? //传入数据 数据回显 从本地拉取
    this.appInstance = createApp(Popup, {
      title: option.title,
      showRef: this.showRef,
      popupId: option.popupId,
      options: {
        pickName: option?.pickName,
        openinghours: option?.opening_hours,
        phone: option?.phone,
        cuisine: option?.cuisine,
        facebook: option?.facebook,
        instagram: option?.instagram,

        //送货点
        dropoffName: option?.dropoffName,
        building: option?.building,
        description: option?.description,
        region: option?.region
      },

    }).mount(this.div)

    this.viewer.cesiumWidget.container.appendChild(this.div)

    // this.infoPopupVisible()
    // this.postRenderFn = this.updatePosition.bind(this)
    this.postRenderFn = this.throttleUpdatePosition()
    // this.viewer.scene.postRender.addEventListener(this.postRenderFn) //原来有一个postRender函数是处理每一帧刷新的
    this.setupVisibilityWatcher()

    InfoPopup.registry.set(option.popupId, { id: option.popupId, instance: this })
  }

  private throttleUpdatePosition = () => {
    return throttle(this.updatePosition, 50)
  }
  //解决弹窗之间的遮盖
  private static resolveCollisions() {
    const visiblePopups = [...InfoPopup.registry.values()]
      .map(({ instance }) => instance) // {instance} 解构的语法 把每个对象里的 instance 字段取出来 换成弹窗实例数组
      .filter(p => p.showRef.value)  //筛选看得见的弹窗

    if (!visiblePopups.length) return

    // 所有弹窗的平均宽度 + 安全间距 作为一列的宽度阈值
    const avgWidth = visiblePopups.reduce((sum, popup) => sum + popup.cachedWidth, 0) / visiblePopups.length || 1
    const columnWidth = avgWidth + InfoPopup.MIN_GAP  //平均宽度 + 阈值

    // 按列(x方向)把弹窗分组：横向差距很大的弹窗会落在不同的列 不必互相让位
    const columns = new Map<number, InfoPopup[]>()
    for (const popup of visiblePopups) {
      const columnKey = Math.round(popup.baseLeft / columnWidth) //把整个画布分桶 
      const list = columns.get(columnKey)
      if (list) {
        list.push(popup)
      } else {
        columns.set(columnKey, [popup])
      }
    }

    for (const column of columns.values()) {
      column.sort((a, b) => a.baseTop - b.baseTop) //这里是在同一“列”的弹窗做高度排序 只有一个元素时，sort 会直接返回，不会出错

      let lastBottom = -Infinity //lastBottom 保存“上一弹窗实际占到的底部坐标” 这里是为了遍历所有弹窗时的第一轮好判断，第一肯定是没有遮挡的 
      for (const popup of column) {
        const desiredTop = popup.baseTop //不考虑遮挡时的位置（当前帧计算出的 baseTop）。
        const minAllowedTop = lastBottom + InfoPopup.MIN_GAP // 向下错开至少 MIN_GAP 像素
        const finalTop = Math.max(desiredTop, minAllowedTop) // 如果已经足够远，就保持原位

        popup.extraOffset = finalTop - desiredTop  // 记下需要额外抬高多少
        lastBottom = finalTop + popup.cachedHeight  // 更新“这一列目前占到的最低点”
      }

    }
  }

  private updatePosition = () => {
    if (!this.entity || !this.entity.position) //没有图钉实例
      return
    if (this.showRef && !this.showRef.value) { //如果此时是关闭状态下也不跟随每帧刷新
      this.div.style.display = 'none'
      return
    }
    //获取图钉当前时刻的position
    const position = this.entity.position.getValue(this.viewer.clock.currentTime)

    if (!position) return
    //把经纬度坐标转换为屏幕坐标
    const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      position
    )
    if (!screenPos) return

    //算完 screenPos 之后新增缓存
    this.baseTop = screenPos.y - 90
    this.baseLeft = screenPos.x
    this.cachedHeight = this.cachedHeight || this.div.offsetHeight //只有第一次的时候会读取位置 以后都是从缓存高度里面获取 减少浏览器重排
    this.cachedWidth = this.cachedWidth || this.div.offsetWidth

    InfoPopup.resolveCollisions()
    const finalTop = this.baseTop + this.extraOffset
    // 相机高度缩放 越高越大 越小越近
    const cameraHeight = this.viewer.camera.positionCartographic.height
    const BASE_HEIGHT = 500
    const scale = Math.min(0.8, Math.max(0.6, cameraHeight / BASE_HEIGHT)) //再怎么缩放也别大于0.8, 也别小于0.6
    //应用位置 缩放
    this.div.style.left = `${screenPos.x}px`
    // this.div.style.top = `${screenPos.y - 90}px`
    this.div.style.top = `${finalTop}px`
    this.div.style.transform = `translate(-50%,-100%) scale(${scale})`
    this.div.style.transformOrigin = 'center bottom'

    //可见性控制 防止跨国一整个地球
    const cameraPosition = this.viewer.camera.position

    // let height = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cameraPosition).height
    //当前照相机距离地球椭球中心的高度
    let height = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cameraPosition).height
    height += this.viewer.scene.globe.ellipsoid.maximumRadius

    if (
      !(Cesium.Cartesian3.distance(cameraPosition, position) > height) &&
      this.viewer.camera.positionCartographic.height < 50000000
    ) {
      this.div.style.display = 'block';
    } else {
      this.div.style.display = 'none';
    }

  }

  public removeListen() {
    //不再 postRender 监听
    this.viewer.scene.postRender.removeEventListener(this.postRenderFn)
  }

  public getShowState(): boolean { //弹窗是否显示
    return this.showRef.value
  }
  show() {
    this.showRef.value = true
  }

  hide() {
    this.showRef.value = false
  }
  //切换
  toggle() {
    if (this.showRef)
      this.showRef.value = !this.showRef.value
  }
  //销毁
  destroy() {
    //不再 postRender 监听
    this.viewer.scene.postRender.removeEventListener(this.postRenderFn)
    //容器移除
    this.div.remove()
    this.removeVisibilityWatcher() //照相机改变监听解绑

    //删除注册表  this.div.id 存储的就是 popupId 
    InfoPopup.registry.delete(this.div.id)
  }
  //更新info

  //判断弹窗的可见性
  private infoPopupVisible(): boolean { // 还是用图钉来判断popup位置
    const pos = this.entity?.position?.getValue(this.viewer.clock.currentTime)
    if (!pos) return false
    const canvas = this.viewer.canvas
    const posC2 = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, pos)
    if (!posC2) return false
    return (
      posC2.x > 0 &&
      posC2.y > 0 &&
      posC2.x <= canvas.width &&
      posC2.y <= canvas.height
    )
  }

  private cameraChangedHandler = () => {
    const isPopupVisble = this.infoPopupVisible()
    if (isPopupVisble) {
      //帧刷新绑定 视野离开的时候不再帧刷新
      this.viewer.scene.postRender.addEventListener(this.postRenderFn) //原来有一个postRender函数是处理每一帧刷新的
    } else {
      this.viewer.scene.postRender.removeEventListener(this.postRenderFn) //原来有一个postRender函数是处理每一帧刷新的
    }
  }

  private setupVisibilityWatcher() {
    this.viewer.camera.changed.addEventListener(this.cameraChangedHandler)
  }

  /* ---------------- 解绑 ---------------- */
  private removeVisibilityWatcher() {
    this.viewer.camera.changed.removeEventListener(this.cameraChangedHandler)
  }

}