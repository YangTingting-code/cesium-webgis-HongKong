import * as Cesium from 'cesium'
/**
   * 计算骑手当前朝向
   */
export function computeOrientation(driverPosition: Cesium.Cartesian3, nextPos: Cesium.Cartesian3) {
  // if (!this.driverPosition && !this.nextPos) return //如果没有骑手当前位置 也没有下一个点的位置 那么即可返回
  const dir = Cesium.Cartesian3.subtract(nextPos, driverPosition, new Cesium.Cartesian3())

  // 检查向量是否接近零
  const magnitude = Cesium.Cartesian3.magnitude(dir);
  if (!isFinite(magnitude) || magnitude < 1e-6) {
    // 如果距离太近，跳过朝向更新
    return;
  }

  Cesium.Cartesian3.normalize(dir, dir)
  // 方向向量算反了？
  // const dir = Cesium.Cartesian3.subtract(this.driverPosition, this.nextPos, new Cesium.Cartesian3())
  // Cesium.Cartesian3.normalize(dir, dir) //把归一化的结果再传给dir吗？
  const localTransform = Cesium.Transforms.eastNorthUpToFixedFrame(driverPosition) //局部创建x-y-z坐标系 东-北-z 
  //提取局部坐标系里的 “东”和“北”
  const east = Cesium.Matrix4.getColumn(localTransform, 0, new Cesium.Cartesian4())
  const north = Cesium.Matrix4.getColumn(localTransform, 1, new Cesium.Cartesian4())

  const heading = Math.atan2( //atan2(x, y) = 求反正切角，能正确返回“在哪个象限”的角度
    Cesium.Cartesian3.dot(dir, east), //dot(a, b) = 向量点积，表示两个向量之间的夹角关系
    Cesium.Cartesian3.dot(dir, north)
  );

  const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0); //三维角度容器
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(driverPosition, hpr);
  return orientation
  //用 CallbackProperty 动态更新 orientation
}