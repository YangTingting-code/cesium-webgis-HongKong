<template> 
  <div class="sidebar">
    <div
      class="heatmapControler"
      :class="{glow:props.glow}"
    >
      <div class="head">
        <span class="title">热力图控制面板</span>
      </div>
      <div class="body">
        <form @submit.prevent="emitStartDraw()">
          <div class="top">
            <RegionSelector
              @choose-region="chooseRegion"
            />
            <RampSelector
              @apply="onRampApply" 
            />
          </div>
          <ul>
            <li class="row time">
              <div class="demo-date-picker">
                <span class="demonstration">时间范围</span>
                <el-date-picker
                  v-model="form.date"
                  type="daterange"
                  range-separator="To"
                  start-placeholder="Start date"
                  end-placeholder="End date"
                  :size="size"
                />
              </div>
            </li>
            <li class="row second">
              <el-form-item 
                label="半径"
                :label-position="itemLabelPosition"
              >
                <el-input-number 
                  v-model="form.radius" 
                  :precision="2" 
                  :step="0.1" 
                  :max="35" 
                  :min="5"
                  :size="size"
                />
              </el-form-item>
              
              <el-form-item
                label="光晕"
                :label-position="itemLabelPosition"
              >
                <el-input-number
                  v-model="form.blur"
                  :precision="2"
                  :step="0.1"
                  :max="1"
                  :min="0"
                  :size="size"
                />
              </el-form-item>
            </li>
            <li class="row">
              <el-form-item
                label="高值不透明度"
                :label-position="itemLabelPosition"
              >
                <el-input-number
                  v-model="form.maxOpacity"
                  :precision="2"
                  :step="0.01"
                  :max="1"
                  :min="0"
                  :size="size"
                />
              </el-form-item>
              <el-form-item
                label="低值不透明度"
                :label-position="itemLabelPosition"
              >
                <el-input-number
                  v-model="form.minOpacity"
                  :precision="2"
                  :step="0.01"
                  :max="1"
                  :min="0"
                  :size="size"
                />
              </el-form-item>
            </li>
            <li class="row button">
              <button
                type="submit"
                class="glow-btn"
              >
                开始绘制
              </button>
              <button
                type="button"
                class="glow-btn"
                @click.stop="emitPause"
              >
                停止绘制
              </button>
              <button
                type="button"
                class="glow-btn"
                @click.stop="emitPlay()"
              >
                继续绘制
              </button>
            </li>
            <li class="row button">
              <button
                type="button"
                class="glow-btn"
                @click.stop="emitToClear"
              >
                清空热力图
              </button>
              <button
                type="button"
                class="glow-btn"
                @click.stop="save"
              >
                保存配置
              </button>
              <button
                type="button"
                class="glow-btn"
              >
                导出
              </button>
            </li>
          </ul>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, reactive,watch} from 'vue'
import 'element-plus/theme-chalk/dark/css-vars.css'
import RampSelector from './RampSelector.vue'
import RegionSelector from './RegionSelector.vue'
import * as Cesium from 'cesium'
const size = "small"
const itemLabelPosition = "right"
interface FormType {
  radius:number,
  blur:number,
  maxOpacity:number,
  minOpacity:number,
  gradient:any,
  date:any,
  regions:any
}
let form = reactive<FormType>({
  radius:20,
  blur:0.9,
  maxOpacity:0.75,
  minOpacity:0.15,
  gradient:{
    0: "rgba(0,0,0,0)",
    0.1: "rgba(59,86,165,1)",
    0.2: "rgba(69,117,180,1)",
    0.3: "rgba(93,145,195,1)",
    0.4: "rgba(116,173,209,1)",
    0.5:"rgba(185,176,143,1)",
    0.6:"rgba(254,178,76,1)",
    0.7:"rgba(249,144,72,1)",
    0.8:"rgba(244,109,67,1)",
    0.9:"rgba(205,55,53,1)",
    1: "rgba(165,0,38,1)",
  },
  date:[Date,Date],
  regions:["九龙城区"]
})
onMounted(()=>{
  const local:FormType|{} = JSON.parse(localStorage.getItem('heatmapOption')||'{}')
  // const heatmapVisited = JSON.parse(localStorage.getItem('heatmapVisited') || "false")
  if(Object.keys(local).length){ //如果本地有数据 回显到表单
    Object.assign(form,local)//? assign什么意思？ 把两个对象做一个拼接 相同的做替换  没有的就新增
  }else{
    //如果没有本地数据 初始化默认值并存储
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const defaultForm: FormType =  {
      radius:20,
      blur:0.9,
      maxOpacity:0.75,
      minOpacity:0.15,
      gradient:{
        0: "rgba(0,0,0,0)",
        0.1: "rgba(59,86,165,1)",
        0.2: "rgba(69,117,180,1)",
        0.3: "rgba(93,145,195,1)",
        0.4: "rgba(116,173,209,1)",
        0.5:"rgba(185,176,143,1)",
        0.6:"rgba(254,178,76,1)",
        0.7:"rgba(249,144,72,1)",
        0.8:"rgba(244,109,67,1)",
        0.9:"rgba(205,55,53,1)",
        1: "rgba(165,0,38,1)",
      },
      date:[yesterday,today], //默认时间范围
      regions:['九龙城区']
    }
    Object.assign(form,defaultForm)
    save() //存入本地
  }
})
const props = defineProps<{glow:boolean,viewerRef:Cesium.Viewer}>()
watch(()=>props.viewerRef,(newValue)=>{
  if(newValue) {
    // console.log('表单发送时的状态heatmapVisited',localStorage.getItem('heatmapVisited')||"false")
    //如果此时是需要绘制热力图的话 就要把数据发送给父组件绘制
    if(JSON.parse(localStorage.getItem('heatmapVisited')||"false")) emitStartDraw() //状态为true才会把表单数据发送给父组件
  }
})

const save = ()=>{
  localStorage.setItem('heatmapOption',JSON.stringify(form))
}

const emits = defineEmits(['clearHeatmap','pause','play','startDraw'])
const emitStartDraw = ()=>{
  emits('startDraw',form)
}
const emitPause = ()=>{ //调整为子传父 emit 自定义事件？
   emits('pause')
}
const emitPlay = ()=>{ //调整为子传父 emit 自定义事件？
  emits('play',form)
}
const emitToClear = ()=>{
  emits('clearHeatmap')
}
function chooseRegion(region:Array<string>){
  (form as any).regions = region
  console.log('已应用新区域',region)
}
function onRampApply(gradient: Record<number, string>) {
  // 1. 保存配置到表单，便于存储 / 回显 
  (form as any).gradient = gradient   //保存到表单 用户点击“开始绘制”时父组件可以接收到数据
  console.log("已应用新色带", gradient)
}

</script>

<style lang="scss" scoped> //后续按需修改element plus 代码 不是这样改
// @import url('@/lib/element-plus-theme/date-picker-copy.scss'); //可以把日历缩小
// @import url('@/lib/element-plus-theme/input.scss');  //字体缩小
// @import url('@/lib/element-plus-theme/input-number.scss'); //输入框长度缩小
// .el-input-number--small .el-input--small .el-input__wrapper{ //关键：让数字输入框缩小到正常范围
//   padding-left: 0;
//   padding-right: 0;
// }
.sidebar{
  position: absolute;
  top: -0.5%;
  width: 34rem;
  height: 50rem;
  transform: translateX(-100%);
  transition: all 0.5s ease;
  left: 0;
  z-index: 1;
  overflow-y: auto;
  opacity: 0;
  pointer-events:none;
  &.open{ /* 滑入状态 */
    transform: translateX(0); /* 刚好滑到可视区 */
    opacity: 1;
    pointer-events: auto;
  }
  .heatmapControler {
    // opacity: 1;
    margin: 0.75rem auto;
    padding: 1rem 1.25rem;
    position: relative;
    left: 0rem;
    top: 0.5rem;
    width: 95%;
    padding: .6rem;
    border-radius: .75rem;
    background: rgba(10, 25, 47, 0.85); // 深蓝玻璃质感
    border: .0625rem solid rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 1.25rem rgba(0, 255, 255, 0.3);
    backdrop-filter: blur(.5rem);
    color: #e0f7fa;
    transition: all 0.5s ease;
    z-index: 1;
  
    &.glow{
      box-shadow:
        0 .25rem 1.25rem 0rem rgba(0, 255, 200, 0.6), // 第一个0rem 表示左右偏移为0 第二个0.25rem 表示向下偏移0.25rem 第三个1.25rem表示光晕 0rem表示光晕偏移量
        inset 0 .0625rem .1875rem rgba(255, 255, 255, 0.3); //内部白色阴影 高光凹陷效果
      transform: translateX(-0.5rem) scale(1.02);
    }
    .head {
      text-align: center;
      margin-bottom: 1rem;
      .title {
        font-size: 1.2rem;
        font-weight: bold;
        background: linear-gradient(90deg, #00e5ff, #7c4dff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 .5rem rgba(0, 255, 255, 0.6);
      }
    }

  .body {
    .top{
      display: flex;
      justify-content: space-around;

    }
    ul {
      width: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      li {
        list-style: none;
        color: #b2ebf2;
       
        // &.row{
        //   display: grid;
        //   grid-template-columns: 1fr 1fr;
        //   justify-items: end;
          // &.second{ //调整每一行之间的间距 调第二行即可
          //   margin-top: .7rem;
          //   margin-bottom: -1.2rem;
          // }
          // &.time{ //第一行 时间
          //   display: grid;
          //   grid-template-columns:1fr;
          //   .demonstration{
          //     margin-right: 1.6rem;
          //   }
          // }
          // &.button{ //最后一行
          //   display: grid;
          //   grid-template-columns:1fr 1fr 1fr;
          //   margin-top: -1.5rem;
          // }
          // label{
          //   color: #b2ebf2;
          // }
        // }
      }
    }
    input{
      height: 2.5rem;
    }
    .el-input-number,
    .el-date-editor {
      background: rgba(255, 255, 255, 0.05);
      border-radius: .375rem;
      border: .0625rem solid rgba(0, 255, 255, 0.3);
      transition: 0.3s;
      &:hover {
        border-color: #00e5ff;
        box-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
      }
    }

    .glow-btn {
      margin: 0.625rem;
      width: 70%;
      padding: .6rem 1rem;
      margin-top: .8rem;
      border: none;
      border-radius: .5rem;
      background: linear-gradient(90deg, #00e5ff, #4d50ffcb);
      color: #fff;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
      text-shadow: 0 0 .375rem rgba(0, 0, 0, 0.6);
      box-shadow: 0 0 .75rem rgba(0, 229, 255, 0.6);
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 0 1.0rem #4d50ffcb;
      }
    }
  }
}
}

  


</style>
