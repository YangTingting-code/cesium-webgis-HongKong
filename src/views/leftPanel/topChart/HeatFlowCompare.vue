<template>
  <div
    ref="chartWrapper"
    class="chart-wrapper"
  >
    <!-- 图表容器 -->
    <div
      ref="chartEl"
      class="heatmap-chart"
    />

    <!-- 底部滑块 -->
    <div class="slider-box">
      <el-slider
        v-model="idx"
        :min="1"
        :max="periods.length"
        :step="1"
        :marks="marks"
        :size="size"
        show-stops
        @change="onSliderChange"
        @mouseenter="pauseTimer"
        @mouseleave="resumeTimer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ElSlider } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import { flowWeek } from '@/service/cesium/heatmap/FlowWeek'
import throttle from 'lodash/throttle'

const size="small"
const chartEl = ref<HTMLDivElement>()
const chartWrapper = ref<HTMLDivElement>()
let inst: echarts.ECharts

/* --- 维度 --- */
const districts = ['九龙城区','油尖旺区']
const areas     = ['officeArea','residentialArea','mallArea','educationArea']

const periods   = [
  'night', 'earlyMorning', 'morning', 'lunch',
  'afternoon', 'evening', 'lateEvening'
]

type RawMap = Record<string, number>

/* --- Slider 控制 --- */
const idx = ref(1)

const marks: Record<number, string> = {
  1: '深夜', 2: '早高峰', 3: '上午', 4: '午间',
  5: '下午', 6: '晚高峰', 7: '夜间'
}

/* --- 拍平数据 --- */
function flatten(raw: any): RawMap {
  const m: RawMap = {}
  districts.forEach(d=>{
    periods.forEach(p=>{
      areas.forEach(a=>{
        m[`${d}|${p}|${a}`] = raw[d]?.[p]?.[a] || 0
      })
    })
  })
  return m
}

/* --- 构造 option --- */
function makeOption(idx: number, map: RawMap) {
  const prevIdx = (idx - 2 + periods.length) % periods.length
  const currIdx = (idx - 1) % periods.length
  const prevP = periods[prevIdx]
  const currP = periods[currIdx]

  const prevLabel = marks[prevIdx + 1]
  const currLabel = marks[currIdx + 1]

  const series = districts.map(dist => ({
    name:dist,
    type: 'bar',
    stack: dist,
    barMaxWidth: 20,
    itemStyle: { color: dist === '九龙城区' ? '#36A69F' : '#789BC3' },
    label: { show: true, position: dist === '九龙城区'? ["0%","30%"] : ["0%","50%"], fontSize:"0.7rem",
             formatter: (p: any) => p.value > 0 ? Math.round(p.value) : '' },
    data: [] as any[]
  }))
/* ②③ 辅助系列：名字随便，但默认隐藏 */
  const decrSeries = districts.map(dist => ({
    name: `${dist}-人流减少`,
    type: 'bar',
    stack: dist,
    itemStyle:  {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#4FC3F7' }, // 上部浅蓝
          { offset: 1, color: '#0288D1' }  // 底部深蓝
        ]
      }
    },   // 蓝色（人流减少）,
    label: { show: true, position: "top",
      // dist === '九龙城区'? "top" : [-5,-10], 
      formatter: (p:any)=>p.value>0?'▼'+Math.round(p.value):'' ,fontSize:"0.7rem",
      color:'#4FC3F7',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowBlur: 2
    },
    data: [] as any[]
  }))

  const incrSeries = districts.map(dist => ({
    name: `${dist}-人流增加`,
    type: 'bar',
    stack: dist,
    itemStyle:
    {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#FF8A65' }, // 上部浅红橙
          { offset: 1, color: '#D32F2F' }  // 底部深红
        ]
      }
    },//红色人流增加
    
    label: { show: true, position: 'top', labelLayout: { hideOverlap:true, moveOverlap:true },
             formatter: (p:any)=>p.value>0?'▲'+Math.round(p.value):'',fontSize:"0.7rem",
              color:'#FF8A65',
              textShadowColor: 'rgba(0,0,0,0.7)',
              textShadowBlur: 2
            },
    data: [] as any[]
  }))
 
  areas.forEach((a)=>{
    districts.forEach(dist=>{
      const prev = map[`${dist}|${prevP}|${a}`] || 0
      const curr = map[`${dist}|${currP}|${a}`] || 0
      const diff = curr - prev
      const minHeight = 10
      const incr = diff > 0 ? Math.max(diff, minHeight) : 0
      const decr = diff < 0 ? Math.max(-diff, minHeight) : 0
      const distIdx = dist === '九龙城区' ? 0 : 1
      const item = { value: prev, group: a.replace('Area','区'), district: dist, prev, curr, diff }
      series[distIdx].data.push(item)
      decrSeries[distIdx].data.push({ ...item, value: decr })
      incrSeries[distIdx].data.push({ ...item, value: incr })
    })
  })
  return {
 // 不用标题显示对比
    title: {
      text: '人流环比图',
      left: 'center',
      top: '1%',
      textStyle: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#00c2ff',
        textShadowColor: 'rgba(0,194,255,0.6)',
        textShadowBlur: 6
      }
    },

tooltip: {
  trigger: 'axis',
  confine: true,
  backgroundColor: 'rgba(15,19,37,0.9)',
  borderColor: '#2e6098',
  borderWidth: 1,
  textStyle: { color: '#eee', fontSize: 12 },
  axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,194,255,0.15)' } },
  formatter: (params: any[]) => {
    if (!params || !params.length) return '';

    const htmlArr: string[] = [];
    const areaNames: Record<string, string> = {
      officeArea: '办公区',
      residentialArea: '住宅区',
      mallArea: '商业区',
      educationArea: '教育区'
    }

    // 遍历每个功能区
    areas.forEach(area => {
      // area 对应的行政区数据
      const items = params.filter(p => p.data.group === area.replace('Area','区'));
      if (!items.length) return;
      // 功能区标题
      htmlArr.push(`<div style="margin-bottom:4px;font-weight:bold;">${areaNames[area]}</div>`);

      // 遍历行政区
      // items.forEach(item => {
      for(let i = 0 ; i < districts.length ; i++){
        const { district, prev, curr, diff } = items[i].data;
        const diffText = diff >= 0 ? `▲${Math.round(diff)}` : `▼${Math.round(-diff)}`;
        const diffColor = diff > 0 ? '#FF8A65' : diff < 0 ? '#4FC3F7' : '#eee';
        const circleColor = district === '九龙城区' ? '#36A69F' : '#789BC3';

        htmlArr.push(`
          <div style="display:flex;align-items:flex-start;margin-left:2px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${circleColor};margin-right:6px;margin-top:3px;"></span>
            <div style="flex:1;">
              <div><b>${district}</b></div>
              <div style="font-size:0.85rem;margin-left:0px;">
                当前时段人流：${Math.round(curr)}<br/>
                上一时段人流：${Math.round(prev)}<br/>
                变化：<span style="color:${diffColor};font-weight:bold;">${diffText}</span>
              </div>
            </div>
          </div>
        `);
      // });
      }
    });

    return htmlArr.join('');
  }
},

  legend: {
    
    itemWidth: 14,
    itemHeight: 8,
    //能不能变得圆润一点
    textStyle: {
      color: '#00c2ff',
      fontSize: "0.8rem",
      fontWeight: 'bold',
      textShadowColor: 'rgba(0,194,255,0.6)',
      textShadowBlur: 6
    },
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: [3, 8],
    // data: [
    //   { name: '九龙城区', icon: 'roundRect' },
    //   { name: '油尖旺区', icon: 'roundRect' }
    // ]
    data:[
    { name: '九龙城区', icon: 'roundRect' },
    { name: '油尖旺区', icon: 'roundRect' }
  ],
    selected:  { 九龙城区: true, 油尖旺区: true }, // 初始都显示
    bottom: '6%',
  },
  grid: {
    left: '2%',
    right: '2%',
    bottom: '15%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['办公区', '住宅区', '商业区', '教育区'],
    axisLabel: {
      fontSize: "0.9rem",
      color: '#00c2ff',
      fontWeight: 500,
      textShadowColor: 'rgba(0,194,255,0.6)',
      textShadowBlur: 6
    },
    axisLine: {
      lineStyle: { color: '#2e6098' }
    },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'log',
    axisLabel: {
      fontSize: "0.6rem",
      color: '#93b7d8'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.05)'
      }
    },
    axisLine: {
      lineStyle: { color: '#2e6098' }
    }
  },
  series: [...series, ...decrSeries, ...incrSeries],
// 在左上角显示时间对比
    graphic: {
      elements: [
        {
          type: 'text',
          left: '2%',       // 距离左边 2%
          top: '2.5%',        // 距离上边 2%
          style: {
            text: `${currLabel} vs ${prevLabel}`,
            fontSize: "0.9rem",
            fontWeight: 'bold',
            fill: '#ffb74d',
            textShadowColor: 'rgba(255,183,77,0.6)',
            textShadowBlur: 2
          }
        }
      ]
    }

} as echarts.EChartsOption

}

/* --- 生命周期 --- */
let map: RawMap
let timer: number | null = null
let resumeTimeout: number | null = null

function startTimer() {
  if(timer) return
  timer = window.setInterval(()=>{
    idx.value = idx.value % periods.length + 1
    onSliderChange(idx.value)
  },3000)
}

function pauseTimer() {
  if(timer!==null){ clearInterval(timer); timer=null }
  if(resumeTimeout!==null){ clearTimeout(resumeTimeout); resumeTimeout=null }
}

function resumeTimer() {
  if(timer===null){
    resumeTimeout = window.setTimeout(()=>{
      startTimer()
      resumeTimeout=null
    },10000)
  }
}

//图表大小随着容器大小变化
let ro : ResizeObserver
const resizeHandle = throttle(()=>inst.resize(),200)

onMounted(async () => {
  ro = new ResizeObserver(resizeHandle)
  ro.observe(chartEl.value!)

  await nextTick()
  const raw = await flowWeek.averDiffRegionByDay()
  map = flatten(raw)
  inst = echarts.init(chartEl.value!)
  inst.setOption(makeOption(idx.value,map))
  startTimer()

  /* --- 4 行代码搞定图例联动 --- */
  inst.on('legendselectchanged', ({ name, selected }: any) => {
    const visible = selected[name] // true | false
    const toSet: Record<string, boolean> = {}
    toSet[name] = visible               // 主系列
    toSet[`${name}-人流减少`] = visible // 辅助系列1
    toSet[`${name}-人流增加`] = visible // 辅助系列2
    inst.setOption({ legend: { selected: toSet } },false) //false 显式声明“合并更新”ECharts 不会重置整个图例状态，而是只把你给的 selected 补丁式地覆盖进去。
  })

})

onUnmounted(()=>{
  if(timer!==null) clearInterval(timer)
  if(resumeTimeout!==null) clearTimeout(resumeTimeout)
  ro.disconnect()
})

/* --- 滑块事件 --- */
function onSliderChange(val:number){
  if(val>=1 && val<=periods.length){
    inst.setOption(makeOption(val,map))
  }
}

</script>

<style lang="scss" scoped>
.chart-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0.6rem;
  padding: 0.5rem;
  background-color: rgba(0, 194, 255, 0.2);
}

.heatmap-chart {
  flex: 1;            // 占满剩余空间
  width: 100%;
  border-radius: 0.4rem;
  // background: rgba(15, 19, 37, 0.6);
  box-shadow: inset 0 0 10px rgba(0, 194, 255, 0.2);
}

.slider-box {
  position: relative;
  width: 85%;
  top: -1.5rem;
  margin: 0rem auto 0 auto;  // 压缩上下间距
  padding: 0;                  // 去掉内部填充
  background: none;            // 不要背景框
  box-shadow: none;            // 不要阴影
}

/* Slider轨道 */
:deep(.el-slider__runway) {
  height: 3px;
  border-radius: 2px;
}

/* 已选轨道 */
:deep(.el-slider__bar) {
  height: 3px;
  border-radius: 2px;
  box-shadow: none;
}

:deep(.el-slider__stop){
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #0000006f;
  background: radial-gradient(circle at 30% 30%, #fff);
  top: -2px;
}
/* 滑块按钮 */
:deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #00c2ff;
  background: radial-gradient(circle at 30% 30%, #00c2ff, #0f1325);
  top: -5px;
  transition: transform 0.2s ease;
}
:deep(.el-slider__button:hover) {
  transform: scale(1.2);
  box-shadow: 0 0 6px rgba(0, 194, 255, 0.6);
}
:deep(.el-slider__marks-text) { color: rgba(255, 255, 255, 0.8); font-size: 0.85rem; font-family: "SimSun", "Microsoft YaHei"; font-weight: 500; }

</style>