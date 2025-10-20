import type { Position } from '@/interface/globalInterface'
import { OrderStore } from '@/data/takeaway/OrderStore'
import { type Map, type GeoJSONSource } from 'mapbox-gl'

const orderStore = new OrderStore()

export async function getCurrentCombinedLngLat(combinedorderData: { currentRegion: string, currentTimeslot: number, currentRiderIdx: number }): Promise<Position[] | null> {
  const region = combinedorderData.currentRegion
  const timeslot = combinedorderData.currentTimeslot
  const riderIdx = combinedorderData.currentRiderIdx
  const riderIds = await orderStore.getRiderIdsByRegionTimeslot(region, timeslot) //带combined的
  const riderId_combined = riderIds[riderIdx]
  const combinedOrder = await orderStore.getCombinedOrderById(region, timeslot, riderId_combined)
  console.log('combinedOrder', combinedOrder)
  if (combinedOrder && combinedOrder.combinedOrder.fullpath)
    return combinedOrder.combinedOrder.fullpath as Position[]
  return null
}

export function prepareLineSource(option: { mapbox: Map, sourceId: string, coordinates: Position[] }) {
  option.mapbox.addSource(option.sourceId, {
    type: 'geojson',
    lineMetrics: true, // 数据源：加这个可以绘制渐变轨迹线 为什么?
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: option.coordinates
      },
      properties: {
        name: 'riderTrail'
      }
    }
  }
  )
}

export function preparePointSource(option: { mapbox: Map, sourceId: string, coordinates: Position[] }) {
  option.mapbox.addSource(option.sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        //起点
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: option.coordinates[0]
          },
          properties: {
            type: 'start'
          }
        },
        //终点
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: option.coordinates[option.coordinates.length - 1]
          },
          properties: {
            type: 'end'
          }
        }
      ]
    }
  }
  )
}

function addPathFeatureToLayer(mapbox: Map, layerId: string, sourceId: string, option: { width: number, colorFrom: string, colorTo: string }) {
  mapbox.addLayer({
    id: layerId + 'main',
    source: sourceId,
    type: 'line',
    layout:
    {
      "line-cap": 'round',
      "line-join": 'round'
    },
    paint:
    {
      "line-width": option.width,
      'line-gradient': [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0, option.colorFrom,     // 起点颜色
        1, option.colorTo      // 终点颜色
      ]
    }

  })
}

function addGlowPathToLayer(mapbox: Map, layerId: string, sourceId: string, option: { width: number, color: string }) {
  mapbox.addLayer({
    id: layerId + 'glow',
    source: sourceId,
    type: 'line', //不是轨迹线就绘制圆
    layout: {
      "line-cap": 'round',
      "line-join": 'round'
    },
    paint:
    {
      "line-width": option.width,
      "line-color": option.color,
      'line-blur': 6,
      'line-opacity': 0.4
    },

  })

}

export function addDoublePath(mapbox: Map, layerId: string, sourceId: string, option: { width: number, colorGlow: string, mainColorFrom: string, mainColorTo: string }) {
  addGlowPathToLayer(mapbox, layerId, sourceId, { width: option.width, color: option.colorGlow })
  //主线要更加细一点 少个7像素 3
  addPathFeatureToLayer(mapbox, layerId, sourceId, { width: option.width - 7, colorFrom: option.mainColorFrom, colorTo: option.mainColorTo })
}

export function addPointsToLayer(mapbox: Map, layerId: string, sourceId: string, startColor: string, endColor: string) {
  // 1 圆点层 circle
  mapbox.addLayer({
    id: layerId + '-circle',
    source: sourceId,
    type: 'circle',
    paint: {
      "circle-radius": 12,
      "circle-color": [
        //根据数据源的properties 的type类型设置颜色
        'match',
        ['get', 'type'],
        'start', startColor,
        // '#4CAF50',   // 绿色圆点表示起点
        'end', endColor,
        // '#E91E63',     // 红色圆点表示终点
        '#ccc' //其他的默认这个颜色
      ],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 1
    }
  })

  // 2 文字层 symbol
  mapbox.addLayer({
    id: layerId + '-label',
    source: sourceId,
    type: 'symbol',
    layout: {
      'text-field': [
        'match',
        ['get', 'type'],
        'start', '始',       // 起点显示“始”
        'end', '终',         // 终点显示“终”
        ''                   // 其他不显示
      ],
      'text-size': 12,
      'text-font': ['Noto Sans CJK SC Regular', 'Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-offset': [0.0, -0.6], // 往上偏移一点
      'text-anchor': 'top'
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': '#000',
      'text-halo-width': 1.0
    }
  })
}


export function setLineData(lineSource: GeoJSONSource, coordinates: Position[]) {
  lineSource.setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    },
    properties: {
      name: 'riderTrail'
    }
  })
}

export function setPointsData(pointsSource: GeoJSONSource, coordinates: Position[]) {
  pointsSource.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates[0]
        },
        properties: {
          type: 'start'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates[coordinates.length - 1]
        },
        properties: {
          type: 'end'
        }
      },
    ]
  })
}