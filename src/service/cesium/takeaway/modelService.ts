import * as Cesium from 'cesium'
import riderModel from '@/assets/3dmodel/motor_vespa.glb?url';
import { throttle } from 'lodash-es';

export class ModelService {
  private viewer: Cesium.Viewer
  private riderEntity: Cesium.Entity | null = null
  private followCamListener: Cesium.Event.RemoveCallback | null = null
  // private scale: number = 5

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }


  public initRiderModel(getPosition: () => Cesium.Cartesian3, getOrientation: () => Cesium.Quaternion) {
    if (this.riderEntity) return
    this.createRiderModelEntity(getPosition, getOrientation) //创建model模型Entity 模型大小跟随视野变化在创建实体的时候设置了

  }
  /**
   * 
   * @param getPosition 获取骑手位置
   * @param getOrientation 获取骑手朝向
   * @returns 
   */
  private createRiderModelEntity(getPosition: () => Cesium.Cartesian3, getOrientation: () => Cesium.Quaternion) {
    const scaleCallback = this.createScaleCallback(getPosition)  //闭包工厂函数
    this.riderEntity = this.viewer.entities.add({
      id: 'rider',
      //这个position 用的和轨迹线的一样 骑手位置应该比轨迹线高一点
      position: new Cesium.CallbackProperty(() => getPosition(), false), // 骑手位置动态更新
      model: {
        uri: riderModel,  // 你的骑手模型
        scale: new Cesium.CallbackProperty(scaleCallback, false) //scaleCallback本身就是箭头函数 所以可以直接在 CallbackProperty 传入， scaleCallback返回的 number值会被 处理成Property值
      },
      orientation: new Cesium.CallbackProperty(() => {
        const pathOrientation = getOrientation() //当前计算的方向是路径的方向
        //修正模型方向
        const fix = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Z,//绕Z轴
          Cesium.Math.toRadians(150)
        )
        //合成quaternion
        return Cesium.Quaternion.multiply(pathOrientation, fix, new Cesium.Quaternion())
      }, false)
    });
  }

  //根据照相机和模型之间的距离计算缩放比例
  private calScale(distance: number) {
    //用于计算模型缩放比例
    const maxDistance: number = 2500
    const minDistance: number = 500
    const maxScale = 50
    const minScale = 3

    const progress = Cesium.Math.clamp(
      (distance - minDistance) / (maxDistance - minDistance),
      0, 1)

    return Cesium.Math.lerp(minScale, maxScale, progress)
  }

  private initCamera(
    getPosition: () => Cesium.Cartesian3,
    getOrientation: () => Cesium.Quaternion
  ) {
    const tryFly = () => {
      const modelPos = getPosition()
      if (!modelPos || Cesium.Cartesian3.equals(modelPos, Cesium.Cartesian3.ZERO)) {
        return //下一帧再尝试
      }

      //位置已有效 摘掉监听 原来可以监听的回调函数里面摘掉监听
      this.viewer.scene.postRender.removeEventListener(tryFly)

      //开始飞相机
      // 1.构造骑手的世界位置
      const modelQuat = getOrientation() ?? Cesium.Quaternion.IDENTITY
      const rotMat3 = Cesium.Matrix3.fromQuaternion(modelQuat, new Cesium.Matrix3())
      const riderMat4 = Cesium.Matrix4.fromRotationTranslation(rotMat3, modelPos, new Cesium.Matrix4())

      //2.偏移位置
      const localOffset = new Cesium.Cartesian3(0, -150, 80)
      this.viewer.camera.lookAtTransform(riderMat4, localOffset)
    }

    tryFly()
    this.viewer.scene.postRender.addEventListener(tryFly)
  }

  /**
   * 如果下面要封装一个函数的话，需要把lastDistance、lastScale、lastUpdateTime等存储成全局变量？  不需要 写一个闭包工厂函数，把变量都放在这个函数里面, 然后返回一个箭头函数 箭头函数里面就是模型比例缩放逻辑
   * @param getPosition 获取骑手当前位置的函数
   * @returns 返回scale number 
   */
  private createScaleCallback(getPosition: () => Cesium.Cartesian3) { //闭包工厂函数
    let lastDistance = 0
    let lastScale = 50
    // this.calScale(lastDistance)
    // 帧节流
    // let i = 2
    // const frameThrottle = 2 // 每2帧更新一次
    //时间节流
    let lastUpdateTime = 0
    //照相机位置
    let lastCamera = new Cesium.Cartesian3

    return () => {
      // this.scale(lastCamera, lastScale, lastUpdateTime, getPosition, lastDistance)
      //照相机没有动的话就直接跳过计算 , 有一个 Cesium.Math.EPSILON6) 0.000001 的误差
      const cameraPos = this.viewer.camera.positionWC //获取照相机位置
      if (Cesium.Cartesian3.equalsEpsilon(cameraPos, lastCamera, Cesium.Math.EPSILON6)) return lastScale
      lastCamera = Cesium.Cartesian3.clone(cameraPos) // 更新

      // 时间节流：距离上次更新没有超过30ms就不更新模型大小
      const now = Date.now()
      if (now - lastUpdateTime < 30) return lastScale
      lastUpdateTime = now

      // 帧节流 ：控制每两帧更新
      // i++ //i++要写在前面 否则下次奇数进来的时候会被return 永远都不会变成偶数 被卡在外面了
      // if (i % frameThrottle !== 0) return lastScale

      const riderPos = getPosition() //模型位置
      //计算模型和照相机之间的距离
      const distance = Cesium.Cartesian3.distance(cameraPos, riderPos)

      // distance变化距离阈值
      const differ = Math.abs(distance - lastDistance)
      if (differ < 20) return lastScale
      lastDistance = distance //更新上次的距离

      const newScale = this.calScale(distance)

      //最小更新阈值：只有 scale 变化超过一定比例才更新
      if (Math.abs(newScale - lastScale) > 0.1) {
        lastScale = newScale
        return newScale //传入新值
      } else {
        return lastScale
      }
    }
  }

  public followRider(
    enable: boolean,
    getPosition: () => Cesium.Cartesian3,
    getOrientation: () => Cesium.Quaternion
  ) {
    if (!enable) return;

    this.followCamListener = this.viewer.scene.postRender.addEventListener(() => {
      this.setCameraPosToRider(true, getPosition, getOrientation)
    });
  }

  public setCameraPosToRider(
    isFollow: boolean,
    getPosition: () => Cesium.Cartesian3,
    getOrientation: () => Cesium.Quaternion
  ) {
    const modelPos = getPosition() //得到模型C3位置
    const modelQuat = getOrientation()  //得到模型当前的朝向

    if (!modelPos || !modelQuat || Cesium.Cartesian3.equals(modelPos, Cesium.Cartesian3.ZERO)) return

    // 1. 骑手→世界矩阵
    const rotMat3 = Cesium.Matrix3.fromQuaternion(modelQuat, new Cesium.Matrix3()) //方向四元数转为矩阵3
    const transform = Cesium.Matrix4.fromRotationTranslation(rotMat3, modelPos, new Cesium.Matrix4()) //根据朝向和骑手的位置创建矩阵4

    // 2. 相机在骑手局部系里的偏移（后 150 上 80） 这个完全可以控制照相机的视角 
    const localOffset = new Cesium.Cartesian3(0, -150, 80) //相对于模型局部坐标的偏移

    if (!isFollow) {
      // --- 静态视角 --- 局部坐标的法线up 那为什么matrix不是局部? 
      // const up = Cesium.Matrix3.getColumn(rotMat3, 2, new Cesium.Cartesian3()) // z轴方向为模型的up
      /////
      const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(modelPos, new Cesium.Cartesian3()) //获取局部位置与地球切面的法向量方向
      //向前分量
      const forward = Cesium.Matrix3.getColumn(rotMat3, 0, new Cesium.Cartesian3()) //局部坐标 0 x轴 模型前进方向
      const right = Cesium.Matrix3.getColumn(rotMat3, 1, new Cesium.Cartesian3()) //局部坐标 1 y轴 模型前进方向
      //相对于模型的位置偏移
      const cameraPos = new Cesium.Cartesian3()

      const upoffset = Cesium.Cartesian3.multiplyByScalar(up, 300, new Cesium.Cartesian3()) // 上1000m
      const backOffset = Cesium.Cartesian3.multiplyByScalar(forward, -1200, new Cesium.Cartesian3()) // 向后800m
      const rightOffset = Cesium.Cartesian3.multiplyByScalar(right, 1000, new Cesium.Cartesian3())

      const totalOffset = new Cesium.Cartesian3()
      Cesium.Cartesian3.add(upoffset, backOffset, totalOffset)
      Cesium.Cartesian3.add(totalOffset, rightOffset, totalOffset)

      // 3. 从模型中心再偏移
      Cesium.Cartesian3.add(modelPos, totalOffset, cameraPos);
      // Cesium.Cartesian3.add(upoffset, backOffset, cameraPos) //合并两个的偏移
      // Cesium.Cartesian3.add(modelPos, cameraPos, cameraPos) //

      //朝向骑手
      const direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(modelPos, cameraPos, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );


      // 设置相机位置和朝向
      this.viewer.camera.setView({
        destination: cameraPos,
        orientation: {
          direction, //确定瞄准方向
          up //up决定视线是否倾斜
        }
      })

      /////

    } else {
      // 3. 最终摆相机
      this.viewer.camera.lookAtTransform(transform, localOffset) //骑手当前的矩阵4位置 + 相对于矩阵4的偏移量得到照相机的位置
    }



  }

  public setCameraBehindRider(
    getPosition: () => Cesium.Cartesian3,
    getOrientation: () => Cesium.Quaternion
  ) {
    const riderPos = getPosition();
    const riderOri = getOrientation();

    // 1. 提取骑手朝向
    const matrix = Cesium.Matrix3.fromQuaternion(riderOri);
    const forward = Cesium.Matrix3.getColumn(matrix, 0, new Cesium.Cartesian3());
    const right = Cesium.Matrix3.getColumn(matrix, 1, new Cesium.Cartesian3());
    const up = Cesium.Matrix3.getColumn(matrix, 2, new Cesium.Cartesian3());

    // 2. 偏移：后退 60、右偏 20、上升 30
    const offset = new Cesium.Cartesian3();
    Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(forward, -60, new Cesium.Cartesian3()),
      Cesium.Cartesian3.multiplyByScalar(right, 20, new Cesium.Cartesian3()),
      offset
    );
    Cesium.Cartesian3.add(offset, Cesium.Cartesian3.multiplyByScalar(up, 30, new Cesium.Cartesian3()), offset);

    // 3. 计算最终相机位置
    const cameraPos = Cesium.Cartesian3.add(riderPos, offset, new Cesium.Cartesian3());

    // 4. 设置相机朝向骑手
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(riderPos, cameraPos, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    const upDir = Cesium.Cartesian3.normalize(up, new Cesium.Cartesian3());

    // 5. 仅飞过去并朝向骑手（不绑定）
    this.viewer.camera.flyTo({
      destination: cameraPos,
      orientation: {
        direction,
        up: upDir
      },
      duration: 1.5
    });
  }


  private followCameraWithBuilding(
    enable: boolean,
    getPosition: () => Cesium.Cartesian3,
    getOrientation: () => Cesium.Quaternion
  ) {
    if (!enable) return;

    // 1. 把真正费时的检测包一层节流
    const checkOccluded = throttle((modelPos: Cesium.Cartesian3) => this.isOccludedByScreen(modelPos),
      300, { trailing: true }); //节流函数把true写在这里什么意思?

    // 当前的相机高度（平滑过渡用）
    let currentHeight = 80;

    this.viewer.scene.postRender.addEventListener(() => {

      const modelPos = getPosition() //得到模型C3位置
      const modelQuat = getOrientation()  //得到模型当前的朝向

      if (!modelPos || !modelQuat || Cesium.Cartesian3.equals(modelPos, Cesium.Cartesian3.ZERO)) return

      // 1. 骑手→世界矩阵
      const rotMat3 = Cesium.Matrix3.fromQuaternion(modelQuat, new Cesium.Matrix3())
      const transform = Cesium.Matrix4.fromRotationTranslation(rotMat3, modelPos, new Cesium.Matrix4())

      // 3. 射线
      // 3.1 准备相机位置 直接用屏幕坐标pick骑手 看骑手所在的位置能否pick到骑手 能的话就说明能够看见
      /* const cameraPos = Cesium.Matrix4.multiplyByPoint(transform, localOffset, new Cesium.Cartesian3())
      const ray = new Cesium.Ray(modelPos, Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(cameraPos, modelPos, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      )) */
      //这样不会造成性能问题吗？非常卡

      const covered = checkOccluded(modelPos)
      const targetHeight = covered ? 120 : 80
      // 插值系数（0.1 = 趋近速度，可以调大/小） 这个的作用是缓慢调整高度变化 比如说被遮挡了10帧 第一帧当前的高度被调整为84 第二帧还是被遮挡 那么在第二帧的基础上继续往上台
      currentHeight = Cesium.Math.lerp(currentHeight, targetHeight, 0.1)

      //照相机位置不再动态变化了

      const localOffset = new Cesium.Cartesian3(0, -150, currentHeight)

      this.viewer.camera.lookAtTransform(transform, localOffset)
    })
  }

  //工具函数 判断视野是否被遮挡 用 clampToHeightMostDetailed 和 clampToHeight 都很卡
  private isOccluded(origin: Cesium.Cartesian3, target: Cesium.Cartesian3): boolean {
    //采样点的数量
    const steps = 3
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const sample = Cesium.Cartesian3.lerp(origin, target, progress, new Cesium.Cartesian3()) //得到采样点
      const realPos = this.viewer.scene.clampToHeight(sample)

      if (realPos && realPos.z > sample.z + 0.5) { //如果实际值要高于插值采样点 那么确实是有遮挡 +0.5余量
        return true
      }
    }
    return false
  }

  private isOccludedByScreen(origin: Cesium.Cartesian3): boolean {
    const canvasPos = this.viewer.scene.cartesianToCanvasCoordinates(origin)
    if (!canvasPos) return false

    const picked = this.viewer.scene.pick(canvasPos)
    if (!picked) return picked

    console.log('picked', picked)
    console.log('picked.id._id', picked.id?._id)
    if (picked.id?._id === 'rider') {
      return false //没有遮挡
    }
    return true //有遮挡
  }
  //移除riderModelEntity
  public removeRiderModelEntity() {
    // 1. 移除实体
    if (this.riderEntity) {
      this.viewer.entities.remove(this.riderEntity)
      this.riderEntity = null
      console.log('已移除骑手模型实体')
    }
    //移除照相机 lookAtTransform 绑定
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  }

  public removeFollow() {
    //取消 postRender 每帧更新绑定
    if (this.followCamListener) {
      this.followCamListener() //这个直接就是 Cesium.Event.RemoveCallback 卸载器 直接调用这个可以卸载 为了照相机lookatTransform 实时绑定的 postRender 
      this.followCamListener = null
    }

    // 暂停渲染一帧，防止当前帧引用旧矩阵
    this.viewer.scene.requestRenderMode = true

    requestAnimationFrame(() => { //只会执行一帧 一次性回调机制 如果想要每帧都执行就要写一个loop函数递归调用
      try {
        //移除照相机 lookAtTransform 绑定
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)

        this.viewer.scene.requestRender() //手动请求 Cesium 再渲染一帧，只在 requestRenderMode: true 时有意义
        this.viewer.scene.requestRenderMode = false  //接着让相机接管了 自动每帧渲染
        console.log('相机解除跟随成功')
      } catch (err) {
        console.warn('解除相机跟随失败', err)
      }
    })



  }

  public clear() { //移除骑手实体 移除照相机绑定和postRender监听
    this.removeRiderModelEntity()
    this.removeFollow()

  }
}

