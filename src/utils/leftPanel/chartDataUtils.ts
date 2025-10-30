import localForage from 'localforage'
import * as echarts from 'echarts'

const timeslotStore = localForage.createInstance({
  name: 'osmBaiduOrder',
  storeName: 'timeslotData'
})

const categoryMatrix = {
  morning: { bakery: 2, cafe: 9, restaurant: 1 },
  lunch: { bakery: 1, cafe: 3, grocery: 4, restaurant: 28 },
  afternoon: { bakery: 1, cafe: 14, restaurant: 3 },
  dusk: { cafe: 3, grocery: 2, restaurant: 25 },
  night: { bakery: 6, bar: 1, convenience: 7, restaurant: 1 }
};
const makeCategoryMatrix1 = {
  morning: { cafe: 9, bakery: 2, restaurant: 1, grocery: 10, bar: 0, convenience: 3 },
  lunch: { cafe: 3, bakery: 1, restaurant: 28, grocery: 4, bar: 0, convenience: 3 },
  afternoon: { cafe: 14, bakery: 1, restaurant: 3, grocery: 4, bar: 0, convenience: 3 },
  dusk: { cafe: 3, bakery: 2, restaurant: 25, grocery: 2, bar: 0, convenience: 3 },
  night: { cafe: 3, bakery: 6, restaurant: 1, grocery: 5, bar: 1, convenience: 7, }
};
export const makeCategoryMatrix: Record<string, Record<string, number>> = {
  morning: {
    cafe: 20, bakery: 15, restaurant: 5, grocery: 8, bar: 2, convenience: 10
  },
  lunch: {
    cafe: 8, bakery: 5, restaurant: 35, grocery: 10, bar: 2, convenience: 12
  },
  afternoon: {
    cafe: 22, bakery: 12, restaurant: 8, grocery: 10, bar: 3, convenience: 14
  },
  dusk: {
    cafe: 10, bakery: 5, restaurant: 30, grocery: 15, bar: 6, convenience: 15
  },
  night: {
    cafe: 5, bakery: 7, restaurant: 10, grocery: 12, bar: 18, convenience: 20
  }
};

// const xAxis_zh = ['早上', '中午', '下午', '傍晚', '晚上']

const category_zh = ['咖啡饮品类', '烘焙类', '餐饮类', '食材类', '酒类', '便利/宵夜类']
const slotKeyArr = ['morning', 'lunch', 'afternoon', 'dusk', 'night']

const category = ['cafe', 'bakery', 'restaurant', 'grocery', 'bar', 'convenience']
const hourArr = Array.from({ length: 24 }, (_, i) => `${i}h`)
//处理九龙城区的数据
// categoryMatrix_九龙城区
//返回数据结构 [ [morning,cafe,2] , [morning,convenience,0],.. ]
export async function convertToHeatmapData(region: string = '九龙城区') {

  const key = `categoryMatrix_${region}`
  const categoryMatrix: Record<string, Record<string, number>> | null = await timeslotStore.getItem(key)
  if (!categoryMatrix) {
    console.log('没有获取到品类矩阵')
    return
  }

  const res: [string, string, number][] = []
  slotKeyArr.forEach(slotKey => {
    for (let i = 0; i < category.length; i++) {
      const cat = category[i] //cafe
      if (categoryMatrix[slotKey] && categoryMatrix[slotKey][cat]) {
        const value = categoryMatrix[slotKey][cat]
        res.push([slotKey, cat, value])
      } else {
        res.push([slotKey, cat, 0])
      }
    }
  })
  return res

}

type EChartsOption = echarts.EChartsOption

function renderHeatmap(chartDom: HTMLElement, heatmapData: [string, string, number][]) {

  const myChart = echarts.init(chartDom)

  // 转换成索引数据
  const data = heatmapData.map(([slot, cat, value]) => [
    hourArr.indexOf(slot),
    category.indexOf(cat),

    value === 0 ? '-' : value
  ])

  const option: EChartsOption = {
    tooltip: {
      position: 'top',

    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: hourArr,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: category,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: Math.max(...heatmapData.map(d => d[2])),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%'
    },
    series: [
      {
        name: '单量',
        type: 'heatmap',
        data: data,
        label: {
          show: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.5)'
          }
        }
      }
    ]

  }

  if (option) {
    myChart.setOption(option)
  }
}

//生成24小时数据看看效果
function generate24hHeatmapData(): [string, string, number][] {
  const categories = ['cafe', 'bakery', 'restaurant', 'grocery', 'bar', 'convenience']
  const data: [string, string, number][] = []

  for (let hour = 0; hour < 24; hour++) {
    const hourLabel = `${hour}h`

    categories.forEach(cat => {
      let base = 0

      // 模拟时间段高峰
      if (hour >= 7 && hour < 10) { // 早晨
        if (cat === 'cafe' || cat === 'bakery') base = Math.random() * 10 + 5
      } else if (hour >= 11 && hour < 14) { // 午餐
        if (cat === 'restaurant') base = Math.random() * 25 + 10
      } else if (hour >= 14 && hour < 17) { // 下午茶
        if (cat === 'cafe' || cat === 'bakery') base = Math.random() * 10 + 3
      } else if (hour >= 17 && hour < 20) { // 晚餐
        if (cat === 'restaurant' || cat === 'grocery') base = Math.random() * 20 + 5
      } else if (hour >= 20 && hour <= 23) { // 夜宵
        if (cat === 'bar' || cat === 'convenience') base = Math.random() * 10 + 3
      }

      data.push([hourLabel, cat, Math.round(base)])
    })
  }

  return data
}

//-----------面积堆叠图---------
export function convertToLineArea() {
  // 转换成 ECharts series
  const series = category.map((cat, idx) => ({
    name: category_zh[idx],
    type: 'line',
    stack: 'total',
    areaStyle: {},
    emphasis: { focus: 'series' },
    data: slotKeyArr.map(slot => makeCategoryMatrix[slot]?.[cat] || 0)
  }));
  return series
}