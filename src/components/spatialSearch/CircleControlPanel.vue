<template>
  <!-- 侧边栏 -->
  <div 
    class="control-panel" 
    :class="{glow:hover}"
  >
    <span class="slider-title">搜索半径</span>
    <div class="slider-demo-block">
      <el-slider
        v-model="localRadius"
        :min="10"
        :max="500"
        :step="10"
        show-input
      />
    </div>
    <div class="button-row">
      <el-button
        size="small"
        type="primary"
        round
        :disabled="isStartDisabled"
        class="start"
        @click="emit('start')"
      >
        开始搜索
      </el-button>
      <el-button
        size="small"
        type="success"
        round
        :disabled="isStopDisabled"
        @click="emit('stop')"
      >
        停止搜索
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref,watch} from 'vue'

const props = defineProps<{radius:number,hover:boolean,isStartDisabled:boolean,isStopDisabled:boolean}>()

const emit = defineEmits(['update:radius','start','stop'])

const localRadius = ref(props.radius) //？这句话能不能不写

//双向绑定 radius v-model? 
watch(localRadius,(val)=>{
  emit('update:radius',val)
})//滑块的值会改变
watch(()=>props.radius,(val)=>{
  localRadius.value = val
})

//也可以用computed dom中直接替换 localRadius
const radiusModl = computed({
  get:()=>props.radius,
  set:(val)=>emit('update:radius',val)
})

</script>

<style lang="scss" scoped>
.control-panel {
    position: relative;
    margin: 0.75rem auto;
    padding: 1rem 1.25rem;
    width: 95%;
    min-height: 8rem;
    border-radius: 1rem;
    background: rgba(10, 25, 47, 0.5); // 深蓝玻璃质感
    box-shadow: 0 0 1.25rem rgba(0, 255, 255, 0.3),inset 0 0 1rem rgba(172, 253, 253, 0.616);
    backdrop-filter: blur(.5rem);
    overflow: hidden;
    transition: all 0.5s ease;
    &.glow{
      box-shadow:
        0 0rem 1rem 0rem rgba(0, 255, 200, 0.6), // 第一个0rem 表示左右偏移为0 第二个0.25rem 表示向下偏移0.25rem 第三个1.25rem表示光晕 0rem表示光晕偏移量
        inset 0 0 2rem rgba(116, 231, 206, 0.6);
      transform: translateX(-0.5rem) scale(1.02);
    }
    .slider-title {
      font-size: 1.2rem;
      font-weight: bold;
      color:#00e5ff;
      text-shadow: 0 0 .5rem rgba(0, 255, 255, 0.6);
    }

    .slider-demo-block {
      margin-top: 0.75rem;
      max-width: 22rem;
      display: flex;
      align-items: center;
      pointer-events: auto;
      //数字输入框
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

      .el-slider {
        flex: 1;
        margin-left: 0.75rem;
        /* Slider轨道 */
        :deep(.el-slider__runway) {
          height: 3px;
          border-radius: 2px;
          margin-right: 16px;
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
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #00c2ff;
          background: radial-gradient(circle at 30% 30%, #00c2ff, #0f1325);
          position: relative;
          top: -1px;
          transition: transform 0.2s ease;
        }
        :deep(.el-slider__button:hover) {
          transform: scale(1.2);
          box-shadow: 0 0 6px rgba(0, 194, 255, 0.6);
        }
      }
    }

    .button-row {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-around;
    }
}
</style>