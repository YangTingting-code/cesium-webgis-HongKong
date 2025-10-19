import * as Cesium from 'cesium'
import type { DeliveryOrder, NodePoint } from '../interface-nouse'
import InfoPopup from './InfoPopup'
import { throttle } from 'lodash-es';
import { getIndexByLnglat } from '../utils/sequOrders'

export class PointService {
  private viewer: Cesium.Viewer
  private orders: DeliveryOrder[]
  private clickhandler: Cesium.ScreenSpaceEventHandler | null = null
  private moveHandler: Cesium.ScreenSpaceEventHandler | null = null
  private ticking = false //标识是否在处理上一帧 
  private rafId: number | null = null //记录 requestAnimationFrame 的编号 方便清除
  private currentPos: Cesium.Cartesian2 | null = null
  private lastX = -1
  private lastY = -1
  private lastCursorOnPin = false

  private pickupIds: string[] = []
  private dropoffIds: string[] = []

  //存入点
  private pickupPointsC3: Cesium.Cartesian3[] = []
  private dropoffPointsC3: Cesium.Cartesian3[] = []

  private popupIds: string[] = []
  private popupInstance: Record<string, InfoPopup> = {}

  private pickupKeys = new Set<string>()
  private dropoffKeys = new Set<string>()

  constructor(viewer: Cesium.Viewer, orders: DeliveryOrder[]) {
    this.viewer = viewer
    this.orders = orders
  }

  //绘制订单起点和终点 一个订单 一组
  public async drawStartEnd(index: number) { //index是从0开始
    // this.orders是排序之后的
    const pickupNode: NodePoint = this.orders[index].pickupNodes[0] // 0可以根据index替换
    const dropoffNode: NodePoint = this.orders[index].dropoffNodes[0] // 0可以根据index替换

    const pickupPoint = [pickupNode.lng, pickupNode.lat] as [number, number]
    const dropoffPoint = [dropoffNode.lng, dropoffNode.lat] as [number, number]

    const pickupKey = this.toKey(pickupPoint)
    const dropoffKey = this.toKey(dropoffPoint)

    // 多个送货点在同一个地点
    let sameDropoffNumber = 0

    if (!this.pickupKeys.has(pickupKey)) {
      this.pickupKeys.add(pickupKey)
      this.pickupIds.push(`pickup${index}`) //1可以根据index替换
      //准备起始/终点的pinbuilder图钉image样式
      const startPin = new Cesium.PinBuilder().fromText(`${index + 1}`, //1可以根据index替换
        Cesium.Color.GREEN, 48).toDataURL();
      // 不用获取具体地形 billboard entity能够根据高度参考设置正确的高度
      const pickupC3withoutH = Cesium.Cartesian3.fromDegrees(pickupPoint[0], pickupPoint[1])
      this.pickupPointsC3.push(pickupC3withoutH)
      const pickupEntity = this.createBillboard(this.pickupIds[index], pickupC3withoutH, startPin, 20) //0可以根据index替换
      this.viewer.entities.add(pickupEntity)

      //创建弹窗
      // 1.收集点位信息
      const pickupInfo = this.collectPickInfo(pickupNode)
      const popupId1 = this.pickupIds[index] + '_popup'
      // 2.创建弹窗
      this.popupIds.push(popupId1) //存入这个id

      this.createPickPopup('外卖店', popupId1, this.pickupIds[index], pickupInfo)

    } else {
      this.pickupIds.push(`pickup${index}`)
    }
    if (!this.dropoffKeys.has(dropoffKey)) { //之前已经绘制过了
      this.dropoffKeys.add(dropoffKey)
      this.dropoffIds.push(`dropoff${index}`) //1可以根据index替换
      const endPin = new Cesium.PinBuilder().fromText(`${index + 1}`, //1可以根据index替换
        Cesium.Color.RED, 48).toDataURL();
      const dropoffC3withoutH = Cesium.Cartesian3.fromDegrees(dropoffPoint[0], dropoffPoint[1])
      this.dropoffPointsC3.push(dropoffC3withoutH)
      const dropoffEntity = this.createBillboard(this.dropoffIds[index], dropoffC3withoutH, endPin, 20)
      this.viewer.entities.add(dropoffEntity)

      //创建弹窗
      const dropoffInfo = this.collectDropoffInfo(dropoffNode)
      const popupId2 = this.dropoffIds[index] + '_popup'
      this.popupIds.push(popupId2) //存入这个id

      this.createDropPopup('目的地', popupId2, this.dropoffIds[index], dropoffInfo)
    } else {
      //如果之前已经绘制过了 也存入一个id占位
      this.dropoffIds.push(`dropoff${index}`)

      //销毁之前创建的图钉和弹窗 重新创建图钉和弹窗
      // this.viewer.entities.removeById(this.dropoffIds[index]) //那我怎么知道重复的是哪一个id？通过位置找到index之前的order 然后把那个给移除

      const targetIdx = getIndexByLnglat({ orders: this.orders, index: index, lnglat: dropoffPoint, isDropoff: true })
      if (targetIdx) {
        this.viewer.entities.removeById(this.dropoffIds[targetIdx]) //移除图钉实体 
        this.popupInstance[this.dropoffIds[targetIdx]].destroy() //移除弹窗

        // 重建实体和弹窗
        const endPin = new Cesium.PinBuilder().fromText(`${targetIdx + 1} + ${index + 1}`, //1可以根据index替换
          Cesium.Color.RED, 48).toDataURL();

        const dropoffC3withoutH = Cesium.Cartesian3.fromDegrees(dropoffPoint[0], dropoffPoint[1])
        this.dropoffPointsC3.push(dropoffC3withoutH)
        const dropoffEntity = this.createBillboard(this.dropoffIds[index], dropoffC3withoutH, endPin, 20)
        this.viewer.entities.add(dropoffEntity)

        //创建弹窗
        const dropoffInfo = this.collectDropoffInfo(dropoffNode)
        const popupId2 = this.dropoffIds[index] + '_popup'
        this.popupIds.push(popupId2) //存入这个id

        this.createDropPopup('目的地', popupId2, this.dropoffIds[index], dropoffInfo)
      }


    }
  }

  public async drawCombinedStops() {

    for (let i = 0; i < this.orders.length; i++) { //这里只是控制订单数量 不管订单顺序
      this.drawStartEnd(i)
    }
    //添加鼠标监听事件, 鼠标触碰图钉图标就会变成cursor,点击图标就会toggle弹窗
    this.initAction()
  }

  private toKey([lng, lat]: [number, number], precision = 6) {
    return `${lng.toFixed(precision)}_${lat.toFixed(precision)}`
  }

  private initAction() {
    this.bindLeftDownAction()
    // this.setupVisibilityWatcher()//先测试监听某一个pin
    // this.setupVisibilityWatcher([this.pickupIds[0]])//先测试监听某一个pin
    // this.bindMoveAction()
  }
  //添加点击事件 获取图钉坐标
  private bindLeftDownAction() {
    this.clickhandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    this.clickhandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = this.viewer.scene.pick(click.position)
      if (Cesium.defined(picked) && picked.id?._id) {
        this.popupInstance[picked.id?._id].toggle()
      }
      // 返回 鼠标点击的car2 坐标 click.position 
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  private unbindLeftDownAction() {
    // this.clickhandler?.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK) //只是删除左键监听事件
    this.clickhandler?.destroy() //这个更彻底 把整个事件处理器删除
    this.clickhandler = null
  }

  //添加鼠标移动事件 鼠标移动到图钉图标上鼠标形状改变
  /* private bindMoveAction() {
    this.running = true

    this.moveHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    this.moveHandler.setInputAction((movement: any) => {
      //鼠标位置实时更新，但是判断鼠标是否落在pinEntity上是每一帧再判断
      this.currentPos = movement.endPosition
      // 降低事件触发频率,每一帧执行一次
      if (!this.ticking) { //上一帧如果已经执行完毕 
        this.ticking = true
        //箭头函数会自己绑定this 箭头函数的this指向上一个作用域的
        this.rafId = requestAnimationFrame(() => { //下一次重回之前执行 即下一帧之前
          this.startCursorCheck() //每一帧触发 而不是依赖鼠标移动事件触发 能不能变成每两帧？传入鼠标当前位置, 两帧的话加一个计数 偶数再调用startCursorCheck()

          // this.ticking = false //本帧被触发 设置回false 准备注册下一帧
          // this.rafId = null //清空 防止复用冲突
        })
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  } */

  private bindMoveAction2() {
    this.moveHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)

    //安全的pick操作函数
    const safePick = () => {
      //场景必须准备好 tiles加载完成 framState存在
      const scene = this.viewer.scene

      if (
        // !scene ||
        scene.isDestroyed() || // viewer 被销毁会返回true return
        !scene.globe.tilesLoaded  // 瓦片未加载完成 返回false return
      ) {
        return null
      }
      try {
        if (this.currentPos) {
          return scene.pick(this.currentPos)
        }
      } catch (err) {
        console.warn('⚠️ scene.pick() failed this frame, skip.', err)
        return null
      }
    }
    //节流包装，降低触发频率
    const throttleMouseChange = throttle(() => {
      if (this.currentPos) { //记录的当前位置
        const { x, y } = this.currentPos
        if (x !== this.lastX || y !== this.lastY) { //鼠标的x和y位置都没有变的话就不用执行下面逻辑了 变了才需要执行下面
          //获取picked的东西
          // debugger
          const picked = safePick()

          // this.viewer.scene.globe.tilesLoaded
          //   ? this.viewer.scene.pick(this.currentPos)
          //   : null
          //判断鼠标是否移动到pin上

          const hitPin = (Cesium.defined(picked) && (this.pickupIds.includes(picked.id?._id) || this.dropoffIds.includes(picked.id?._id))) ?? false

          if (hitPin) { //如果鼠标移动到了pinEntity上
            //判断弹窗是否存在 弹窗如果已经创建了鼠标样式才能变
            const popup = this.popupInstance[picked.id._id]
            if (!popup) { //如果此时弹窗还没有创建的话
              // this.rafId = requestAnimationFrame(this.loop.bind(this)) //等下一帧再进行判断 此时ticking依旧是true 那就是在原本等待一帧之后开始执行到这里 （此时正在处理中），接着又发现弹窗没有创建，需要再等待一帧 一帧之后再次执行loop进行判断 一帧之后鼠标说不定又会移动到其他地方
              this.rafId = requestAnimationFrame(this.loop)
              return
            }
          }
          //这一帧和上一帧的区别 上一帧hitPin这一帧不hitPin 或者 上一帧不hitPin 这一帧hitPin
          if (hitPin !== this.lastCursorOnPin) {
            this.lastCursorOnPin = hitPin //上一帧的状态更新
            const viewerContainer: HTMLElement | null = document.getElementById('cesiumContainer') //cesium应用的id 
            if (viewerContainer)
              viewerContainer.style.cursor = hitPin ? 'pointer' : 'default'
          }
        }
      }
    }, 250)
    this.moveHandler.setInputAction((move: any) => {
      this.currentPos = move.endPosition

      throttleMouseChange() //节流300ms

    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  private unbindMoveAction2() {
    this.moveHandler?.destroy()
    this.moveHandler = null
  }

  private startCursorCheck() {
    this.loop()
  }

  private loop = () => {
    // if (!this.running) return //解绑后立即停止

    if (this.currentPos) { //记录的当前位置
      const { x, y } = this.currentPos
      if (x !== this.lastX || y !== this.lastY) { //鼠标的x和y位置都没有变的话就不用执行下面逻辑了 变了才需要执行下面
        //获取picked的东西
        const picked = this.viewer.scene.pick(this.currentPos)
        //判断鼠标是否移动到pin上

        const hitPin = (Cesium.defined(picked) && (this.pickupIds.includes(picked.id?._id) || this.dropoffIds.includes(picked.id?._id))) ?? false

        if (hitPin) { //如果鼠标移动到了pinEntity上
          //判断弹窗是否存在 弹窗如果已经创建了鼠标样式才能变
          const popup = this.popupInstance[picked.id._id]
          if (!popup) { //如果此时弹窗还没有创建的话
            // this.rafId = requestAnimationFrame(this.loop.bind(this)) //等下一帧再进行判断 此时ticking依旧是true 那就是在原本等待一帧之后开始执行到这里 （此时正在处理中），接着又发现弹窗没有创建，需要再等待一帧 一帧之后再次执行loop进行判断 一帧之后鼠标说不定又会移动到其他地方
            this.rafId = requestAnimationFrame(this.loop)
            return
          }
        }
        //这一帧和上一帧的区别 上一帧hitPin这一帧不hitPin 或者 上一帧不hitPin 这一帧hitPin
        if (hitPin !== this.lastCursorOnPin) {
          this.lastCursorOnPin = hitPin //上一帧的状态更新
          const viewerContainer: HTMLElement | null = document.getElementById('cesiumContainer') //cesium应用的id 
          if (viewerContainer)
            viewerContainer.style.cursor = hitPin ? 'pointer' : 'default'
        }
      }
    }
    // requestAnimationFrame(this.loop.bind(this))//预约注册下一帧 给loop函数绑定this对象 因为loop里有用到this
    requestAnimationFrame(this.loop)//预约注册下一帧 给loop函数绑定this对象 因为loop里有用到this
  }

  public getPopupState() {
    const popupShowState: Record<string, boolean> = {}
    this.pickupIds.forEach(pId => {
      const popup = this.popupInstance[pId]
      if (popup)
        popupShowState[pId] = popup.getShowState()
    })
    this.dropoffIds.forEach(dId => {
      const popup = this.popupInstance[dId]
      if (popup) //因为有一些没有终点没有绘制
        popupShowState[dId] = popup.getShowState()
    })
    return popupShowState
  }

  public reshowPopup(popupShowState: Record<string, boolean>) {
    Object.keys(popupShowState).forEach(k => {
      if (popupShowState[k]) //如果当前弹窗是打开状态 那么获取到对应的弹窗实例让他回显 但是问题是这个popupInstance是内存 刷新之后就没有了？
        this.popupInstance[k].show()
    })

  }

  hide() { //取消视线跟随的时候隐藏弹窗
    Object.values(this.popupInstance).forEach(popup => {
      popup.hide()
    })
  }

  show() {
    Object.values(this.popupInstance).forEach(popup => {
      popup.show()
    })
  }

  clear() { //移除屏幕点击/鼠标移动监听事件 , 清除存储的id, 删除实例，删除弹窗
    this.removeVisibilityWatcher() // 1. 移除相机监听
    this.unbindLeftDownAction() //移除鼠标点击事件
    this.unbindMoveAction2() //移除鼠标移动监听事件
    this.clearPopup() //先清除弹窗再移除实例
    this.clearEntity() // 删除实例 清空id数组

    this.pickupKeys.clear()
    this.dropoffKeys.clear()
  }

  public havedPin(): boolean {
    return this.pickupIds.length > 0 ? true : false
  }

  private clearEntity() {
    this.pickupIds.forEach((id) => {
      this.viewer.entities.removeById(id)
      // this.pickupIds.shift() //不要一遍遍历一遍改数组 会容易遍历不完整
    })
    this.pickupIds = []
    this.dropoffIds.forEach(id => {
      this.viewer.entities.removeById(id)
    })
    this.pickupIds = []
  }

  private clearPopup() {
    Object.keys(this.popupInstance).forEach(key => { //
      this.popupInstance[key].destroy() //移除弹窗
      delete this.popupInstance[key] //删除这条记录
    })
    this.popupIds = []
  }



  private createBillboard(id: string, point: Cesium.Cartesian3, pin: any, offsetY: number) { //这里传入的point C3点是没有高度的
    const billboard = new Cesium.Entity({
      id: id,
      position: point,
      // point: { pixelSize: 30, color: Cesium.Color.GREEN }
      billboard: {
        image: pin,
        // .fromMakiIconId('square', Cesium.Color.RED, 40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -offsetY), // 往上挪 20 像素
        // disableDepthTestDistance:Number.POSITIVE_INFINITY //禁用深度测试
      }
    })
    return billboard
  }

  //创建完billboardEntity之后创建弹窗
  private createPickPopup(title: string, popupId: string, entityId: string, nodePointInfo: Record<string, string>) {
    const popup = new InfoPopup({
      popupId: popupId,
      viewer: this.viewer,
      title: title,
      entityId: entityId,
      pickName: nodePointInfo?.name,
      opening_hours: nodePointInfo?.opening_hours,
      phone: nodePointInfo?.phone,
      cuisine: nodePointInfo?.cuisine,
      facebook: nodePointInfo?.facebook,
      instagram: nodePointInfo?.instagram
    })
    this.popupInstance[entityId] = popup //用pinEntityId存弹窗 因为点击的时候是点击pinEntity 用pinId控制弹窗的获取
  }

  private collectPickInfo(pointNode: NodePoint) { //取餐点
    return {
      name: pointNode.tag.name as string,
      opening_hours: pointNode.tag.opening_hours as string,
      phone: pointNode.tag.phone as string,
      cuisine: pointNode.tag.cuisine as string,
      facebook: pointNode.tag['contact:facebook'] as string,
      instagram: pointNode.tag['contact:instagram'] as string,
    }
  }

  private createDropPopup(title: string, popupId: string, entityId: string, nodePointInfo: Record<string, string>) {
    const popup = new InfoPopup({
      popupId: popupId,
      viewer: this.viewer,
      title: title,
      entityId: entityId,
      dropoffName: nodePointInfo?.name,
      region: nodePointInfo?.region,
      building: nodePointInfo?.building,
      description: nodePointInfo?.description
    })
    this.popupInstance[entityId] = popup //用pinEntityId存弹窗 因为点击的时候是点击pinEntity 用pinId控制弹窗的获取

  }
  private collectDropoffInfo(pointNode: NodePoint) { //取餐点
    return {
      name: pointNode.tag?.name as string,
      region: pointNode?.region as string,
      building: pointNode.tag?.building as string, //表示building属性可能没有
      description: pointNode.tag?.description as string
    }
  }

  //判断pin是否在canvas里面
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
  //动态绑定
  private cameraChangedHandler = () => {
    const visible = this.checkPinVisibility([...this.pickupIds, ...this.dropoffIds])
    if (visible && !this.moveHandler) { //如果可以看见pin 并且此时是没有做mousemove监听 就绑定
      this.bindMoveAction2()
    } else if (!visible && this.moveHandler) {
      this.unbindMoveAction2()
    }
  }
  /* ---------------- 绑定 ---------------- */
  private setupVisibilityWatcher() {
    this.viewer.camera.changed.addEventListener(this.cameraChangedHandler)
  }

  /* ---------------- 解绑 ---------------- */
  private removeVisibilityWatcher() {
    this.viewer.camera.changed.removeEventListener(this.cameraChangedHandler)
  }

}


