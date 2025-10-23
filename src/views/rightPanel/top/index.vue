<template>
  <div class="wrapper">
    <div 
      class="combinedOrder"
      :class="{'panel-active':activePanelSet.has('whole-panel')}"
    >
      <div class="head">
        <span>骑手订单</span>
      </div>
      <div class="body">
        <template v-if="Object.keys(ordersInfo).length > 0">
          <div
            v-for="(value,key) in ordersInfo"
            :key='key'
            class="order"
            :class="{'status-active': activeOrderSet.has(key)}"
          >
            <span class="number">{{key}}</span>
      
            <div
              class="content"
            >
              <div class="start">
                <span>取餐点：</span>
                <div class="address">
                  {{ value['取餐点'].name +"，"+ value['取餐点'].street +"，"+value['取餐点'].housenumber}}
                </div>
              </div>
              <div class="end">
                <span>送餐点：</span>
                <div class="address">
                  {{ value['送餐点'].name +"，"+ value['送餐点'].description}}
                </div>
              </div>
            </div>
            <!-- 数组管理多个类 -->
            <div 
              class="status"
              :class="[statusClass(orderStatusMap[key]),
              // {'status-active': activeOrderSet.has(key)}
              ]"
            >
              <span>{{ orderStatusMap[key] }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <el-skeleton :rows="5" animated/>
        </template>
      </div>
      <div class="foot">
        <div class="rider-info">
          <div class="rider-name">
            <span>骑手姓名：<span>馋嘴猫</span></span>
          </div>
          <div class="rider-phone">
            <span>骑手电话：<a>13526259796</a></span>
          </div>
        </div>
        <div class="select">
          <label for="timeslot">时间段</label>
          <el-select id="timeslot" v-model="currentSlotKey" placeholder="选择时间段" size="small" popper-class="timeslot-dropdown">
            <el-option value="morning">7点-10点</el-option>
            <el-option value="lunch">10点-14点</el-option>
            <el-option value="afternoon">14点-17点</el-option>
            <el-option value="dusk">17点-20点</el-option>
            <el-option value="night">20点-24点</el-option>
          </el-select>
        </div>
        <el-button @click="changeOrder" size="small"> 
          查看其他订单
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {useOrderStore} from '../../../store/takeaway/orderStore'

import {useSceneStore} from '@/store/takeaway/sceneStore'
import {useCombinedControlStore } from '@/store/takeaway/combinedControlStore'

import type {SceneStateManager} from '@/service/cesium/takeaway/SceneManage/SceneStateManager'
import {ScenePersistence} from '@/service/cesium/takeaway/SceneManage/ScenePersistence'
import {useSceneLifecycle} from '@/composables/cesium/takeaway/useSceneLifecycle'


let initScene :(region:string,timeslot:number)=>Promise<void>
let switchRider:()=>Promise<void>

const orderStorePinia = useOrderStore()
const combinedControlStore = useCombinedControlStore()

const ordersInfo = ref(orderStorePinia.getOrdersInfo()) //第x单: 取餐点：{name address} 送餐点：

const orderStatusMap = orderStorePinia.orderStatusMap
const orderId = ref()
let timeoutNumber: number | null = null
let timeoutChanged:number | null = null
const activeOrderSet = ref(new Set()) //存订单key 用于放大缩小
const activePanelSet = ref(new Set)
//用户不点击也自己播放 跑时间？

// 第一步 订单面板时间映射到数字
const timeslot2number: Record<string, number> = {
    'morning': 9,
    'lunch': 12,
    'afternoon': 16,
    'dusk': 18,
    'night': 22
  }
const timeslot2slotkey: Record<number, string> = {
  9:'morning',
  12:'lunch',
  16:'afternoon',
  18:'dusk',
  22:'night'
}

const DEFAULT_CONTROL = {
  currentTimeslot: '12',
  currentRegion: '九龙城区',
  currentRiderIdx: 0
}
const combinedorderControl = JSON.parse(localStorage.getItem('combinedorderControl') || JSON.stringify(DEFAULT_CONTROL))

  //根据本地数据决定select里面的内容？？
const localTimeslot:number = combinedorderControl.currentTimeslot
const currentSlotKey = ref(timeslot2slotkey[localTimeslot]) //默认选择10-14点

let timeoutId : number | null = null

//不接收 viewer 创建新的状态管理实例 因为在 takeaway/index.vue里面也会创建一个新的状态管理实例 两个数据不共享 不要重新创建
// 用 pinia 管理 但是不要直接把状态管理实例存成响应式的 会卡到爆炸 存成普通变量 用一个旗帜做标记 获取实例需要watch 那个旗帜 旗帜变化且变为true的时候说明 状态实例已存入 此时外界可以获取
const sceneStore = useSceneStore()
let sceneManager :SceneStateManager | null
watch(()=>sceneStore.isReady,async (ready)=>{
  if(ready){
    sceneManager = sceneStore.getManager()
    if(sceneManager){
      
      /* const needDelete =await orderStore.checkCombinedSubKey('九龙城区',18)
      console.log('收集到需要删除的needDelete', needDelete)

      if(!needDelete) return
      await orderStore.deleteCombinedData('九龙城区',18,needDelete)
      
      await orderStore.deleteMatrixSlotKey('九龙城区','dusk')

      await orderStore.prepareData(combinedorderControl.currentRegion,9,3) */
      const fns = useSceneLifecycle(sceneManager)
      initScene = fns.initScene
      switchRider = fns.switchRider

      initScene(combinedorderControl.currentRegion,localTimeslot)
      // sceneManager.initializeOrders(combinedorderControl.currentRegion,localTimeslot)

    }else{
      console.warn('SceneManager 仍为空')
    }
  }
},
{immediate:true}
)

//监听选择器的数据变化 加载其他时间段数据之前需要清除当前的轨迹
watch(currentSlotKey,async (newValue)=>{
  const timeslot = timeslot2number[newValue]
  
  if(sceneManager){
    sceneManager.clear()
  
    await sceneManager.loadRiderDataByRegionTime(combinedorderControl.currentRegion,timeslot)

    combinedControlStore.updateStatus() //通知二维底图更新数据
    //切换时间段订单状态重置
    orderStorePinia.resetStatus()

    //动态放大整个订单
    //添加
    activePanelSet.value.add('whole-panel')
    //600ms之后移除
    
    timeoutChanged = setTimeout(() => {
      activePanelSet.value.delete('whole-panel')
      if(timeoutChanged)
        clearTimeout(timeoutChanged)
    },600);

    //面板订单切换
    switchRider() 
    //清除轮询
    sceneStore.stopPolling()
    startLater(2000)

  }


})

function startLater(timeoutMS = 5000){
  //5s之后再次开始轮询
  if(!sceneStore.timeoutId && !ScenePersistence.getIsPath()){
    timeoutId = setTimeout(() => {
      if(sceneStore.timeoutId){ //如果此时的延时器没有被清除 可以重新开始轮询 并且清除这个延时器
        sceneStore.startPolling() 
        sceneStore.updateTimeoutId(null)
      }
      //如果此时的延时器被清除了呢? 就不会开启轮询 延时器已被清除过一次 不用再次被清除
    }, (timeoutMS));
  
    sceneStore.updateTimeoutId(timeoutId)

  }
}

//根据状态添加相应的类
function statusClass(status:string){
  switch (status) {
    case '赶往商家':
      return 'status-pending'
    case '配送中':
      return 'status-running'
    case '已送达':
      return 'status-finished'
    default:
      return 'status-unknown'
  }

}

// 监听状态变换
watch(()=>orderStorePinia.orderStatusMap,()=>{

  const id = orderStorePinia.currentUpdateOrder.orderId
  orderId.value = id
  if(!id) return 

  activeOrderSet.value.add(id)

  timeoutNumber = setTimeout(()=>{
    activeOrderSet.value.delete(id)
  },600)

},{deep:true})



onMounted(()=>{

})

function changeOrder(){
  if(!sceneManager){
    console.log('此时状态管理实例还没有准备好')
    return
  }

  //清除轮询
  sceneStore.stopPolling()

  startLater(2000)

  switchRider() 

  combinedControlStore.updateStatus()

  //添加
  activePanelSet.value.add('whole-panel')
  //600ms之后移除
  
  timeoutChanged = setTimeout(() => {
    activePanelSet.value.delete('whole-panel')
    if(timeoutChanged)
      clearTimeout(timeoutChanged)
  },600);

}

onUnmounted(()=>{
  if(timeoutNumber)
    clearTimeout(timeoutNumber)
  if(timeoutChanged)
    clearTimeout(timeoutChanged)

  //清除延时器
  if(timeoutId){
    sceneStore.clearTimeout()
    timeoutId = null
  } 
})



</script>

<style lang="scss" scoped>
.wrapper{
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  border-radius: 0.6rem;
  background-color: rgba(0, 194, 255, 0.2);
  .combinedOrder{
    &.panel-active{
      transform: scale(1.02);
    }
    transition: all 0.5s ease;
    width: 100%;
    height: 100%;
    border-radius: 0.6rem;
    padding: 2px;
    box-shadow: inset 0 0 10px rgba(0, 194, 255, 0.2);
 
    .head{
      display: flex;
      justify-content: space-around;
      align-items: center;
      text-align: center;
      color: rgb(0, 194, 255);
      //光晕
      // text-shadow:  
      //   0px 0px 20px  rgba(255, 255, 255, 0.7);
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 2px;
    }
  .body{
    .el-skeleton{
      margin-left: 20px;
      width: 80%;
    }
    height: 80%;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
      .order{
        &.status-active{
          transform: scale(1.05);
        }
        transition: all 0.8s ease;
        display: flex;
        align-items: center;
        padding: 0.3rem;
        height: 10vh;

        background: rgba(0, 50, 100, 0.4);

        border: 1px solid rgba(0, 194, 255, 0.3);
        box-shadow:
          inset 0 0 6px rgba(0, 194, 255, 0.2),
          0 0 10px rgba(0, 194, 255, 0.15);
        
        border-radius: 6px;

        .number{
          display: flex;
          width:16px;
          writing-mode: vertical-rl;//主轴已变换成竖轴
          justify-content: center; //主轴方向居中
          align-items: center; //侧轴方向居中

          font-size: 1rem;
          font-weight: 450;
          height: 90%;
          border-radius: 2px;

          background: linear-gradient(180deg, rgba(0, 194, 255, 0.9), rgba(0, 194, 255, 0.5));
          color: #fff;
          box-shadow: 0 0 6px rgba(0, 194, 255, 0.6);
          border: 1px solid rgba(0, 194, 255, 0.4);

        }
      
        .content{
          pointer-events: none;
          width: 82%;
          font-size: 10px;
          border-radius: 4px;
          overflow: hidden;
          margin-left: 5px;
          height: 90%;
          &::after {
          content: "";
            position: absolute;
            top: 0;
            right: -3px; /* 稍微延伸一点，覆盖边界 */
            width: 60%;  /* 控制过渡区域宽度 */
            height: 100%;
            background: linear-gradient(
              90deg,
              rgba(0, 194, 255, 0) 0%,   /* 从蓝透明开始 */
              rgba(255, 140, 255, 0.25) 90%,  /* 柔粉中间 */
              rgba(255, 100, 230, 0.20) 100%  /* 最右边更暖 */
            );
          }
          background:
          //这是线性渐变又叠加了一层吗
          linear-gradient(135deg, 
          rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.05) 100%),
          rgba(0, 150, 200, 0.25);
          
          /* 毛玻璃关键属性 模糊后面的元素 ? 好像效果不大*/
          backdrop-filter: blur(12px);

          border: 1px solid rgba(0, 194, 255, 0.15);
          box-shadow:
            0 0 10px rgba(0, 194, 255, 0.1),
            inset 0 1px 2px rgba(255, 255, 255, 0.2);

          color:#e8faff;

          .start,.end{
            display: flex;
            align-items: center;
            height: 50%;
            padding-top:3px;
            background: rgba(0, 0, 0, 0.02);
            /* 内部轻光线，增强层次 */
            box-shadow: inset 0 0 4px rgba(0, 194, 255, 0.15);
            span{
              display: inline-block;
              margin-left: 2px;
              width: 20%;
              white-space:nowrap;
              font-weight: 450;
              font-size: 10px;

              text-shadow: rgb(56, 225, 255) 0px 0px 5px, rgb(0, 255, 255,0.5) 0px 0px 10px;
              color: rgb(218, 250, 255);
              margin-right: 0.5rem;
            }

          }
          /* 分隔线：淡蓝半透明 */
          .start {
            position: relative;
          }
          // 分隔线 注意伪元素没有border-bottom
          .start::after{
            content: '';
            position: absolute;
            bottom:-5px;
            left: 5%;
            width: 100%;
            height: 1px;
            opacity: 1.0;
            background: linear-gradient(90deg, transparent, rgba(4, 72, 140, 0.9), transparent);

          }

        }
        
        .status{
          width: 8%;
          height: 90%;
          display: flex;
          justify-content: center;
          align-items: center;
          writing-mode: vertical-rl;
          margin-left: 5px;
          color: #fff;

          background: linear-gradient(180deg,
            rgba(248, 136, 220, 0.85), 
            rgba(255, 76, 177, 0.85));
          box-shadow: 
            0 0 10px rgba(245, 65, 255, 0.6),
            inset 0 0 3px rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(0, 255, 230, 0.4);
          border-radius: 2px;

          transition: all 0.5s ease;
          

          &.status-running {
            background: linear-gradient(180deg,
              rgba(0, 220, 255, 0.85),
              rgba(0, 150, 255, 0.75));
            box-shadow:
              0 0 12px rgba(0, 255, 255, 0.7),
              0 0 25px rgba(0, 194, 255, 0.5),
              inset 0 0 4px rgba(255, 255, 255, 0.4);
            animation: pulseRunning 2.2s ease-in-out infinite alternate;
          }

          /* 已完成 */
          &.status-finished {
            background: linear-gradient(180deg,
              rgba(255, 154, 189, 0.8),
              rgba(250, 77, 195, 0.682));
            box-shadow:
              0 0 12px rgba(254, 157, 231, 0.8),
              inset 0 0 4px rgba(240, 1, 125, 0.9);
            animation: glowFinished 3s ease-in-out infinite alternate;
          }

          @keyframes pulseRunning {
            0% {
              box-shadow:
                0 0 10px rgba(0, 255, 255, 0.4),
                inset 0 0 4px rgba(255, 255, 255, 0.2);
            }
            100% {
              box-shadow:
                0 0 25px rgba(0, 255, 255, 0.9),
                inset 0 0 6px rgba(255, 255, 255, 0.5);
            }
          }

          @keyframes glowFinished {
            0% {
              box-shadow: 
                0 0 10px rgba(254, 157, 231, 0.4)
                inset 0 0 4px rgba(255, 255, 255, 0.2);
            }
            100%{
              box-shadow:
                0 0 25px rgba(254, 157, 231, 0.4),
                inset 0 0 6px rgba(255, 255, 255, 0.5);
            }
          }
        }
      }
      .order:hover{
        box-shadow:
          inset 0 0 10px rgba(0, 194, 255, 0.5),
          0 0 15px rgba(255, 76, 177, 0.6);
        transform:translateY(-2px);
        transition: all 0.3 ease;
      }
    }
    .foot{
      display: flex;
      justify-content: center;
      border-radius: 5px;
      align-items: center;
      flex-wrap: wrap;

      /* 背景：蓝粉渐变 + 毛玻璃 + 内光 */
      background: 
      linear-gradient(90deg, rgba(107, 210, 244, 0.3) 0%, #09aec44d 100%),
      rgba(0, 50, 100, 0.3);
      backdrop-filter: blur(10px);

      border-top: 1px solid rgba(0, 194, 255, 0.25);
      box-shadow:
        inset 0 1px 3px rgba(255, 255, 255, 0.15),
        0 -2px 6px rgba(0, 194, 255, 0.15);
      
      color: #e8faff;
      font-size: 0.9rem;
      
      a{
        color: #30f1ff;
        cursor: pointer;
        text-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
        transition: all 0.3s ease;
        &:hover{
          color: #00ffbf;
          text-shadow: 0 0 10px #00ffbf;
        }
      }
      .rider-info{
        margin-top: 2px;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-around;
        width: 100%;
        letter-spacing: 0.02em; //文字间距
        color: #ccefff;
      }
      button{
        border: 0.5px solid rgba(4, 255, 255, 0.771);
        font-size: 0.9rem;
        letter-spacing: 0.05em;
      }
      .select{
        display: flex;
        align-items: center;
        font-weight: 400;
        color: #d9faff;
        text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        letter-spacing: 0.05em;

        label {
          margin-right: 6px;
        }
        .el-select{
          border: 0.5px solid rgba(4, 255, 255, 0.771);
          transform: scale(0.8); /* 整体缩小一点 */
          transform-origin: left center;
          border-radius: 3px;
          width: 90px;
          /* 控制文字大小 */
          /* 穿透 Element Plus 内部样式作用域 */
          :deep(.el-select__wrapper),
          :deep(.el-input__inner) {
            font-size: 1rem;
          }

          /* 下拉菜单全局样式 */
          /* 下拉选项样式 */
          :global(.timeslot-dropdown .el-select-dropdown__item) {
            font-size: 0.8rem;
            padding: 4px 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 2.5rem;
          }
        }
        
      }
    }
  }
}
</style>