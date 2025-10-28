// utils/pathUtils.js
import * as turf from '@turf/turf'
import type { DeliveryOrder, SegmentType } from '@/interface/takeaway/interface'
import * as Cesium from 'cesium'
export const pathUtils = {
  densifyPath(path: [number, number][], step = 5) { //这是每隔5m采样一个点 点数会大幅度增加 能不能不采样?
    const line = turf.lineString(path)
    const length = turf.length(line, { units: 'meters' })

    const sampled = []
    for (let i = 0; i <= length; i += step) {
      const pt = turf.along(line, i, { units: 'meters' })
      sampled.push(pt.geometry.coordinates)
    }
    return sampled
  },

  calculatePathProgress(distance: number, totalDistance: number) {
    return Math.min(distance / totalDistance, 0.999)
  },
  /**
   * 支持一批订单
   * @orders  DeliveryOrder[]
   * @return  Record<orderId, Record<stepIndex, SegmentType[]>>
   */

  async preapareStepSegments(order0: DeliveryOrder): Promise<Record<string, SegmentType[]> | null> {
    const steps = order0.steps //结构: [ [lng,lat], [lng,lat], ... ]
    const stepSegments: Record<string, SegmentType[]> = {} // 0:SegmentType,1:SegmentType,...

    steps.forEach((step, index) => { //遍历每一个step
      const path = step.stepPath_wgs84
      // 检查路径有效性
      if (!path || path.length < 2) {
        console.warn(`Step ${index} 的路径无效，跳过`)
        stepSegments[index] = []
        return
      }
      let cumduration = 0
      let cumdistance = 0
      const segments: SegmentType[] = [] //存储每一个step中seg的信息
      let stepTotalDistance = 0
      const segDistanceArr = []
      // 计算各段距离和总距离
      for (let i = 0; i < path.length - 1; i++) {
        const distance = getDistanceM(path[i], path[i + 1])
        // 确保距离是有效数字
        segDistanceArr.push(isNaN(distance) ? 0 : Math.max(0, distance))
        stepTotalDistance += segDistanceArr[i]
      }
      // 处理总距离为0的情况（避免除零错误）
      if (stepTotalDistance <= 0) {
        console.warn(`Step ${index} 的总距离为0或负数，使用平均分配时间`)
        const avgDuration = step.duration / Math.max(1, path.length - 1)
        for (let i = 0; i < path.length - 1; i++) {
          cumduration += avgDuration
          cumdistance += segDistanceArr[i]
          const seg: SegmentType = {
            start: path[i],
            end: path[i + 1],
            duration: avgDuration,
            distance: segDistanceArr[i],
            cumduration: cumduration,
            cumdistance: cumdistance // 保持一致性
          }
          segments.push(seg)
        }
      } else {
        // 正常计算各段时间
        //得到step的总距离之后 用它计算每一小段的时间
        for (let i = 0; i < path.length - 1; i++) { //计算相邻两个点的距离 即每一小段的距离 根据距离分配时间
          const segDuration = (segDistanceArr[i] / stepTotalDistance) * step.duration
          // 确保不是NaN
          const validDuration = isNaN(segDuration) ? 0 : Math.max(0, segDuration)
          cumduration += validDuration
          cumdistance += segDistanceArr[i]
          let seg: SegmentType = {
            start: path[i],
            end: path[i + 1],
            duration: segDuration,
            distance: segDistanceArr[i],
            cumduration: cumduration,
            cumdistance: cumdistance
          }
          segments.push(seg) //这一个seg处理完塞进去 循环处理下一个seg
        }
      }

      stepSegments[index] = segments
    })
    // 转换坐标部分保持不变，但添加错误处理
    try {
      const lnglatArray = []
      for (let i = 0; i < Object.keys(stepSegments).length; i++) {
        if (stepSegments[i] && stepSegments[i].length > 0) {
          for (let j = 0; j < stepSegments[i].length; j++) { //因为stepSegments索引就是 index
            if (stepSegments[i][j].start && stepSegments[i][j].end) {
              lnglatArray.push(stepSegments[i][j].start, stepSegments[i][j].end)
            }
          }
        }
      }
      if (lnglatArray.length === 0) {
        console.error('没有有效的坐标点')
        return stepSegments
      }
      const car3Arr = await this.lnglat2Car3(lnglatArray)
      //然后塞入 stepSegments
      let index = 0
      for (let i = 0; i < Object.keys(stepSegments).length; i++) {
        if (stepSegments[i] && stepSegments[i].length > 0 && index < car3Arr.length) {
          for (let j = 0; j < stepSegments[i].length; j++) { //因为stepSegments索引就是 index
            stepSegments[i][j].startC3 = car3Arr[index]
            stepSegments[i][j].endC3 = car3Arr[index + 1]
            index += 2
          }
        }
      }
    } catch (error) {
      console.error('坐标转换错误:', error)
    }
    return stepSegments
  },

  /**
   * 把step拆成很多小段 不会直接告诉哪个段对应哪个里程碑(节点)
   * @param ordersRaw 
   * @returns 
   */
  async prepareOrdersStepSegments(
    ordersRaw: DeliveryOrder[] | DeliveryOrder
  ): Promise<Record<string, Record<string, SegmentType[]>> | null> {

    const allOrdersSegments: Record<string, Record<string, SegmentType[]>> = {}
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [ordersRaw]

    for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
      const order = orders[orderIndex]
      const steps = order.steps
      const stepSegments: Record<string, SegmentType[]> = {}

      steps.forEach((step, index) => {
        const path = step.stepPath_wgs84
        if (!path || path.length < 2) {
          console.warn(`订单 ${orderIndex} Step ${index} 的路径无效，跳过`)
          stepSegments[index] = []
          return
        }

        let cumduration = 0
        let cumdistance = 0
        const segments: SegmentType[] = []
        let stepTotalDistance = 0
        const segDistanceArr = []

        // 计算每段距离和总距离
        for (let i = 0; i < path.length - 1; i++) {
          const distance = getDistanceM(path[i], path[i + 1])
          segDistanceArr.push(isNaN(distance) ? 0 : Math.max(0, distance))
          stepTotalDistance += segDistanceArr[i]
        }

        if (stepTotalDistance <= 0) {
          console.warn(`订单 ${orderIndex} Step ${index} 总距离无效，使用平均分配时间`)
          const avgDuration = step.duration / Math.max(1, path.length - 1)
          for (let i = 0; i < path.length - 1; i++) {
            cumduration += avgDuration
            cumdistance += segDistanceArr[i]
            segments.push({
              start: path[i],
              end: path[i + 1],
              duration: avgDuration,
              distance: segDistanceArr[i],
              cumduration,
              cumdistance,
            })
          }
        } else {
          for (let i = 0; i < path.length - 1; i++) {
            const segDuration = (segDistanceArr[i] / stepTotalDistance) * step.duration
            const validDuration = isNaN(segDuration) ? 0 : Math.max(0, segDuration)
            cumduration += validDuration
            cumdistance += segDistanceArr[i]
            segments.push({
              start: path[i],
              end: path[i + 1],
              duration: validDuration,
              distance: segDistanceArr[i],
              cumduration,
              cumdistance,
            })
          }
        }

        stepSegments[index] = segments
      })

      // 处理坐标转换
      try {
        const lnglatArray: [number, number][] = []
        for (let i = 0; i < Object.keys(stepSegments).length; i++) {
          if (stepSegments[i] && stepSegments[i].length > 0) {
            for (let j = 0; j < stepSegments[i].length; j++) {
              if (stepSegments[i][j].start && stepSegments[i][j].end) {
                lnglatArray.push(stepSegments[i][j].start, stepSegments[i][j].end)
              }
            }
          }
        }
        if (lnglatArray.length > 0) {
          const car3Arr = await this.lnglat2Car3(lnglatArray)
          let index = 0
          for (let i = 0; i < Object.keys(stepSegments).length; i++) {
            if (stepSegments[i] && stepSegments[i].length > 0 && index < car3Arr.length) {
              for (let j = 0; j < stepSegments[i].length; j++) {
                stepSegments[i][j].startC3 = car3Arr[index]
                stepSegments[i][j].endC3 = car3Arr[index + 1]
                index += 2
              }
            }
          }
        }
      } catch (error) {
        console.error(`订单 ${orderIndex} 坐标转换错误:`, error)
      }

      allOrdersSegments[orderIndex] = stepSegments
    }

    return allOrdersSegments
  },

  /**
 * @param point 
 */
  async lnglat2Car3(points: [number, number][]) {
    const car3Array: Cesium.Cartesian3[] = []
    //准备地形提供器
    const terrianProvider = await Cesium.createWorldTerrainAsync()
    // 1.1.2.1 准备需要更新高程信息的点位 经纬度转换为Array.<Cartographic>
    const positionRadians = points.map(point => { //转换成为弧度制的经纬度
      return Cesium.Cartographic.fromDegrees(point[0], point[1])
    })
    const updatedPosition = await Cesium.sampleTerrainMostDetailed(terrianProvider, positionRadians)
    //经纬度坐标转换
    updatedPosition.forEach((cartographic: Cesium.Cartographic) => {
      car3Array.push(Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height))
    })
    return car3Array
  }

}


// Haversine 公式计算两点直线距离
export function getDistanceM(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // 地球半径 m
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2[1] - p1[1]);
  const dLng = toRad(p2[0] - p1[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

