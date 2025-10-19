import * as Cesium from 'cesium'
import { futurePathShaderSource, pathShaderSource } from './PathShader'

const PAST_PURPLE_COLOR = new Cesium.Color(0.659, 0.184, 0.988, 1.0);  //rgb(222,149,186)
const fUT_BLUE_COLOR = new Cesium.Color(0.0, 0.6, 1.0, 0.4)

const pastLineW = 5
const currLineW = 4
const futLineW = 5

const is3D = true

export class PathRenderService {
  private past: Cesium.Primitive | null = null
  private curr: Cesium.Primitive | null = null
  private future: Cesium.Primitive | null = null

  private viewer
  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }
  drawBuckets(pastPts: Cesium.Cartesian3[], currPts: Cesium.Cartesian3[], futurePts: Cesium.Cartesian3[]) {
    this.clear()

    this.rebuildPastPrimitive(pastPts, pastLineW, PAST_PURPLE_COLOR, is3D)
    this.drawDynamicPolyline(currPts, currLineW, is3D)
    this.rebuildFuturePrimitive(futurePts, futLineW, fUT_BLUE_COLOR)
  }

  /**
   * 更新路径进度（用于动画）
   * @param progress 进度值 0-1
   */
  updateCurrentProgress(progress: number) {
    if (this.curr && this.curr.appearance.material) {
      const material = this.curr.appearance.material
      material.uniforms.progress = progress
    }
  }

  clear() {
    if (this.past)
      this.viewer.scene.primitives.remove(this.past)

    if (this.curr)
      this.viewer.scene.primitives.remove(this.curr)

    if (this.future)
      this.viewer.scene.primitives.remove(this.future)

    this.past = null
    this.curr = null
    this.future = null
  }

  getCurr() {
    return this.curr
  }

  private rebuildPastPrimitive(pointsC3: Cesium.Cartesian3[], lineWidth: number, color: Cesium.Color, is3D: boolean) {
    const cleanPos = pointsC3.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))

    pointsC3.map(p => Cesium.Cartesian3.clone(p))
    // 1. 准备几何
    const geometry = is3D
      ? new Cesium.PolylineVolumeGeometry({
        polylinePositions: cleanPos,
        shapePositions: cleanShape
      })
      : new Cesium.PolylineGeometry({
        positions: cleanPos,
        width: lineWidth
      })

    // 2. 创建primitive
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry
      }),
      appearance: this.createPastAppearance(color, is3D)
    })

    this.viewer.scene.primitives.add(primitive)
    this.past = primitive
  }

  public drawDynamicPolyline(car3Path: Cesium.Cartesian3[], lineWidth: number, is3D: boolean) {
    const cleanPos = car3Path.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))

    const geometry = is3D ?
      new Cesium.PolylineVolumeGeometry({
        polylinePositions: cleanPos,
        shapePositions: cleanShape //修改这里
      }) :
      new Cesium.PolylineGeometry({
        positions: cleanPos,
        width: lineWidth
      })

    const polylineVolume = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: geometry
      }),
      appearance: this.createDynamicAppearance(is3D)
    })

    this.viewer.scene.primitives.add(polylineVolume)
    this.curr = polylineVolume
  }

  private rebuildFuturePrimitive(pointsC3: Cesium.Cartesian3[], lineWidth: number, color: Cesium.Color) {
    const cleanPos = pointsC3.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))
    // 1. 准备几何
    const geometry = new Cesium.PolylineVolumeGeometry({
      polylinePositions: cleanPos,
      shapePositions: cleanShape
    })

    // 2. 创建primitive
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry
      }),
      appearance: this.createFutureAppearance(color)
    })

    this.viewer.scene.primitives.add(primitive)
    this.future = primitive
  }

  /**
  * 创建路径横截面形状
  */
  private createPathShape(width: number, height = 5) {
    return [
      new Cesium.Cartesian2(-width, -height),
      new Cesium.Cartesian2(width, -height),
      new Cesium.Cartesian2(width, height),
      new Cesium.Cartesian2(-width, height),
    ]
  }

  private createPastAppearance(color: Cesium.Color, is3D: boolean) {
    const material = new Cesium.Material({
      fabric: {
        type: 'pastFeaturePath3D',
        uniforms: {
          color,
          percent: 0.5
        },
        source: futurePathShaderSource
      }
    })
    return is3D
      ? new Cesium.MaterialAppearance({
        material,
        // closed: true, //想要闭合 但没有用
        // translucent: false
      })
      : new Cesium.PolylineMaterialAppearance({ material })
  }

  /**
     * 创建动态材质外观
     */
  private createDynamicAppearance(is3D: boolean) {
    const material = new Cesium.Material({
      translucent: true,
      fabric: {
        type: 'RiderPath',
        uniforms: {
          // color: color,
          progress: 0.0,
          percent: 0.2,
          lineWidth: 0.5,
        },
        source: pathShaderSource
      }
    })
    return is3D ? new Cesium.MaterialAppearance({ material }) : new Cesium.PolylineMaterialAppearance({ material })
  }

  private createFutureAppearance(color: Cesium.Color) {
    const material = new Cesium.Material({
      fabric: {
        type: 'futurePath3D',
        uniforms: {
          color,
          percent: 0.2
        },
        source: futurePathShaderSource
      }
    })
    return new Cesium.MaterialAppearance({ material })
  }

}