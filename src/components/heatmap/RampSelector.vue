<template>
  <div class="ramp">
    <el-form-item
      label="色带"
    >
      <el-select
        v-model="pickedName"
        placeholder="选择色带"
        popper-class="ramp-dropdown"
        @change="apply"
      >
        <!-- 下拉菜单选项 -->
        <el-option
          v-for="r in ramps"
          :key="r.name"
          :label="r.name"
          :value="r.name"
        >
          <div class="ramp-option">
            <span class="name">{{ r.name }}</span>
            <span
              class="ramp-bar"
            />
            
            <!-- :style="{ background: gradientBar(r) }" -->
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref,onMounted,watch} from 'vue'
import { rampToGradient } from '@/utils/toolbar/heatmap/rampToGradient'
import { ramps } from '@/utils/toolbar/heatmap/colorRamps'
import {heatmapPersistence} from '@/service/cesium/heatmap/heatmap-persistence'


const emit = defineEmits<{ 
  'update:heatmap-gradient':[gradient: Record<number, string>],
  "update:clear-select":[boolean]
 }>()

const pickedName = ref('')

function apply() { 
  if(!pickedName.value) return //什么都没选
  const ramp = ramps.find(r => r.name === pickedName.value)!
  heatmapPersistence.setRamp(ramp)
  heatmapPersistence.setGradient(rampToGradient(ramp, 10))

  emit('update:heatmap-gradient', rampToGradient(ramp, 10)) //保存数据到表单 开始绘制的时候可以拿到数据
}

const props = defineProps<{
  clearSelect:boolean,
  saveRamp:boolean,
  heatmapGradient:Record<string,string>,
}>()
//清空热力图的时候把当前选择的清空
watch(()=>props.clearSelect,(newValue)=>{
  if(newValue){
      pickedName.value = ''
      emit('update:clear-select',false)
      emit('update:heatmap-gradient', {})
    }
})
//回显回来的数据导致选择器改变 也要通知父组件应用
watch(pickedName,()=>{
  apply()
})

watch(()=>props.saveRamp,(newValue)=>{
  if(newValue && pickedName.value){
      heatmapPersistence.saveLocalRamp(pickedName.value)
    }
})


onMounted(()=>{
    const ramp = heatmapPersistence.getRamp()
    //如果不是刷新回显热力图那就回显本地保存的色带
    const localRamp = heatmapPersistence.getLocalRamp()
  
    if(ramp){
      pickedName.value = ramp.name
      //保存当前的gradient到本地
      heatmapPersistence.setGradient(rampToGradient(ramp, 10))
    }else if(localRamp){
      pickedName.value = localRamp
    }
  })

</script>

<style lang="scss" scoped>
.ramp {
  width: 70%;
  position: relative;
  top: -18px;
  :deep(.el-form-item__label){
    padding: 0 21px 0 0 !important;
  }
  
  .el-select{
    :deep(.el-select__placeholder.is-transparent){
      color: rgba(235, 245, 255, 0.808);
    }
    :deep(.el-select__wrapper) {
      min-height: 26px;
      line-height: 26px;
      font-size: 10px;
      padding: 0 12px 0 12px;
    }
  //改变下拉框要素样式 多加一个popper-class 使其只控制这个一个类
    :global(.ramp-dropdown .el-select-dropdown__item){
      font-size: 0.9rem;
      text-align: center;
      align-items: center;
      line-height: 2.0rem;
      min-height: 1.2rem;
      height: 2.0rem;
    }
  }
  
  
}
</style>

