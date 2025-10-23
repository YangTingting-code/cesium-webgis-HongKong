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
          <div class="selection">
            <RegionSelector
              :clear-select="clearSelection"
              :save-regions="saveRegions"
              @choose-region="chooseRegion"
              @saved="toggleClear"
              @region-changed="regionChanged"
            />
            <RampSelector
              :clear-select="clearSelection"
              :save-ramp="saveRamp"
              :apply-ramp="applyRamp"
              @apply="onRampApply" 
              @saved="toggleClear"
            />
          </div>
          <div class="time-range">
            <span class="demonstration">时间范围</span>
            <el-date-picker
              v-model="form.date"
              type="daterange"
              range-separator="To"
              start-placeholder="Start date"
              end-placeholder="End date"
            />
          </div>
          <div class="options">
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
              />
            </el-form-item>
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
              />
            </el-form-item>
          </div>
          <div class="button-collection">
            <el-button
              type="primary"
              native-type="submit"
              plain
              :size=size
            >
              开始绘制
            </el-button>
            <el-button
              type="primary"
              plain
              :size=size
              @click.stop="emitPause"
            >
              停止绘制
            </el-button>
            <el-button
              type="primary"
              plain
              :size=size
              @click.stop="emitPlay()"
            >
              继续绘制
            </el-button>
            <el-button
              type="primary"
              plain
              :size=size
              @click.stop="emitToClear"
            >
              清空热力图
            </el-button>
            <el-button
              type="primary"
              plain
              :size=size
              @click.stop="save"
            >
              保存配置
            </el-button>
            <el-button
              type="primary"
              plain
              :size=size
              @click.stop="clear"
            >
              清空配置
            </el-button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, reactive,ref,watch} from 'vue'
import 'element-plus/theme-chalk/dark/css-vars.css'
import RampSelector from './RampSelector.vue'
import RegionSelector from './RegionSelector.vue'
import * as Cesium from 'cesium'
import {regionPersistance} from '@/service/loaders'
import {useRegionStore} from '@/store/useRegionStore'
import {heatmapPersistence} from '@/service/cesium/heatmap/heatmap-persistence'
import { ElMessage } from 'element-plus';

const regionStore = useRegionStore()
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
  const local:FormType|{} = heatmapPersistence.getOption()
  
  if(local && Object.keys(local).length){ //如果本地有数据 回显到表单
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
    
    if(
      heatmapPersistence.getIsHeatmap()
    ) emitStartDraw() //状态为true才会把表单数据发送给父组件
  }
})

const saveRegions = ref([''])
const saveRamp = ref(false)

const save = ()=>{
  heatmapPersistence.saveOpion(form)
  saveRamp.value = true
}

const clear =()=>{
  heatmapPersistence.removeOption()
}

const emits = defineEmits(['clearHeatmap','pause','play','startDraw'])

//保存热力图选择的区域 点击开始绘制时才移动过去
let heatmapRegions :string[] = heatmapPersistence.getHeatmapRegions()
let heatmapGradient:Record<string,string> = heatmapPersistence.getGradient()

const applyRamp = ref(false)
const emitStartDraw = ()=>{
  if(!heatmapRegions || heatmapRegions.length < 1){
      ElMessage({
      message: '绘制热力图前请选择行政区。',
      type: 'warning',
      offset:100
    })
    return 
  } 

  //需要选择色带
   // 每次绘制前都从 persistence 里取最新 gradient
  const latestGradient = heatmapPersistence.getGradient()

  if(!heatmapGradient || !latestGradient){
    // 警告
    ElMessage({
      message: '绘制热力图前请选择色带。',
      type: 'warning',
      offset:100
    })
    return 
  }

  // 同步 gradient 到 form
  form.gradient = latestGradient

  //选择日期范围不能是同一天
if(form.date && JSON.stringify(form.date[0]) === JSON.stringify(form.date[1])){
  // 警告
    ElMessage({
      message: '日期请不要选择同一天。',
      type: 'warning',
      offset:100
    })
  return 
}

  emits('startDraw',form)
  //更新区域
  regionStore.updateRegion(heatmapRegions)

}


const emitPause = ()=>{ //调整为子传父 emit 自定义事件？
   emits('pause')
}
const emitPlay = ()=>{ //调整为子传父 emit 自定义事件？
  emits('play',form)
}

const clearSelection = ref(false)

const emitToClear = ()=>{
  //恢复本地兴趣区域
  regionStore.updateRegion(regionPersistance.getRegion())
  //清除选择器上的内容
  clearSelection.value = true
  //清除会话态持久化
  heatmapPersistence.clearSessionKeys()

  heatmapRegions = []
  heatmapGradient = {}

  emits('clearHeatmap')
  
}
function chooseRegion(regions:Array<string>){
  (form as any).regions = regions
  heatmapRegions = regions
}

function regionChanged(regions:Array<string>){
  (form as any).regions = regions
  heatmapRegions = regions
}

function onRampApply(gradient: Record<number, string>) {
  // 1. 保存配置到表单，便于存储 / 回显 
  (form as any).gradient = gradient   //保存到表单 用户点击“开始绘制”时父组件可以接收到数据
  heatmapGradient = gradient
  console.log("已应用新色带", gradient)
}

function toggleClear(){
  clearSelection.value = false
}

</script>

<style lang="scss" scoped> 
.sidebar{
  position: absolute;
  top: -0.5%;
  width: 30rem;
  height: 50rem;
  transform: translateX(-100%);
  transition: all 0.5s ease;
  left: 0;
  z-index: 1;
  overflow-y: auto;
  opacity: 0;
  pointer-events:none;
  padding: .3rem;
  &.open{ /* 滑入状态 */
    transform: translateX(0); /* 刚好滑到可视区 */
    opacity: 1;
    pointer-events: auto;
  }
  .heatmapControler {
    z-index: 1;
    // opacity: 1;
    margin: 0.75rem auto;
    padding: 1rem 1.25rem;
    position: relative;
    left: 0rem;
    top: 0.5rem;
    width: 95%;
    padding: .6rem;
    border-radius: .75rem;
    background: rgba(10, 25, 47, 0.5); // 深蓝玻璃质感
    border: .0625rem solid rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 1.25rem rgba(0, 255, 255, 0.3),inset 0 0 1rem rgba(172, 253, 253, 0.616);
    // backdrop-filter: blur(.5rem);
    color: #e0f7fa;
    transition: all 0.5s ease;
  
    &.glow{
      box-shadow:
        0 .25rem 1.25rem 0rem rgba(0, 255, 200, 0.6), // 第一个0rem 表示左右偏移为0 第二个0.25rem 表示向下偏移0.25rem 第三个1.25rem表示光晕 0rem表示光晕偏移量
        inset 0 0 2rem rgba(116, 231, 206, 0.6);
      transform: translateX(-0.5rem) scale(1.02);
    }
    .head {
      text-align: center;
      margin-bottom: 1rem;
      .title {
        font-size: 1.2rem;
        font-weight: bold;
        color: #00e5ff;
        text-shadow: 0 0 .5rem rgba(0, 255, 255, 0.6);
      }
    }

  .body {
    .selection{
      height: 38px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .time-range{
      margin-top: 30px;
      width: 100%;
      .demonstration{
        width: 17%;
        text-align: left;
        display: inline-block;
      }
      :deep(.el-range-editor){
        width: 83%;
        height: 24px;
        line-height: 24px;
        .el-range-input {
          font-size:1rem;
          height: 20px;
          line-height: 20px;
        }
      }
      //中间那个To的大小
      :deep(.el-date-editor .el-range-separator){
          font-size: 0.9rem;
      }
    }
    .options{
      width: 278px;          // 或者固定 rem/em 宽度
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-top: 0.5rem;
      gap: 0px 0px; // 第一个是行距(上下)，第二个是列距(左右)
    
      .el-form-item {
        margin-bottom:0.5rem;
        :deep(.el-input-number) {
          width: 80px;            // 1. 整体先压死
          line-height: 22px;
        }

        :deep(.el-input-number .el-input__wrapper) {
          padding: 0 4px;         // 2. 把左右 padding 压到 4 px
          height: 22px;
          min-width: unset;       // 3. 去掉 Element 的 min-width
        }

        :deep(.el-input-number .el-input__inner) {
          font-size: 11px;        // 4. 字体缩小，减少占位
          text-align: center;     // 5. 居中后可再压 4-6 px
        }

        :deep(.el-input-number__decrease),
        :deep(.el-input-number__increase) {
          width: 18px;            // 6. 侧边按钮压窄
          height: 20px;           // 7. 上下按钮高度减半
        }
      }
    }
    .button-collection{
      display: grid;
      grid-template-columns: repeat(3,1fr);
      gap:0 6px;
      .el-button{
        margin: 3px 0;
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
      margin: 0.3rem 0.625rem;
      width:28%;
      padding: .6rem 1rem;
      // margin-top: .8rem;
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
