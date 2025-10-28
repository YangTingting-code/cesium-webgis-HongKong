<template>
  <div class="region">
    <el-form-item
      label="行政区"
    >
      <el-select
        v-model="pickedRegion"
        placeholder="选择行政区"
        multiple
        popper-class="region-dropdown"
        @change="chooseRegion"
      >
        <el-option
          v-for="region in regions"
          :key="region"
          :label="region"
          :value="region"
        >
          <div class="region-option">
            <span class="region">{{ region }}</span>
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">

import {onMounted, ref,toRaw, watch} from 'vue'
import {regions} from '@/data/regionHK'
import {heatmapPersistence} from '@/service/cesium/heatmap/heatmap-persistence'

  const pickedRegion = ref(regions[0])
  const emit = defineEmits(["chooseRegion",'saved',
  // 'regionChanged'
])

  function chooseRegion(){
    emit('chooseRegion',toRaw(pickedRegion.value))
  }

  //清空热力图的时候把当前选择的清空
  const props = defineProps<{clearSelect:boolean,saveRegions:string[]}>()

  watch(()=>props.clearSelect,(newValue)=>{
    if(newValue){
      pickedRegion.value = ''
      emit('saved')
    }
  })

  //数据由于回显带来的更新
  watch(pickedRegion,()=>{
    chooseRegion()
  })


  onMounted(()=>{
    //刷新之后回显/持久化数据回显 如果是刷新的话就回显刷新的数据  如果不是刷新就回显本地数据
    const lastOption = heatmapPersistence.getLastOption()
    const localOption = heatmapPersistence.getOption()
    if(lastOption && lastOption.regions){
      pickedRegion.value = lastOption.regions
    }else if(localOption && localOption.regions){
      pickedRegion.value = localOption.regions
    }
  })


</script>

<style lang="scss" scoped>
.region{
  width: 100%;
  .el-select{
    :deep(.el-select__placeholder.is-transparent){
      color: rgba(235, 245, 255, 0.808);
    }
    :deep(.el-select__wrapper){
      min-height: 26px;
      line-height:26px;
      font-size: 10px;
      // overflow: hidden;
      max-height: 60px; //竖向滚动条
      // overflow-y: auto; /* ✅ 在 wrapper 上滚动，不会截断 placeholder */
      gap: 0;
      padding: 4px 4px 4px 12px; //选择框内部元素距离边框距离
    }
    //控制选中元素的
    :deep(.el-tag){
      font-size: 0.9rem !important;
      height:15px;
      line-height: 15px;
      padding-left: 5px;
    }

    // //控制下拉框偏移
    // :global(.el-popper.region-dropdown) {
    //   transform: translateX(50%) !important;
    // } 
    // //控制下拉框大小
    // :global(.region-dropdown){
    //   //改变下拉框宽度
    //   min-width: 120px !important;  // 最小宽度
    //   width: 160px !important;      // 固定宽度
    //   max-width: 200px;             // 可选：最大宽度防止溢出
    // }
    
    //改变下拉框要素样式 多加一个popper-class 使其只控制这个一个类
    :global(.region-dropdown .el-select-dropdown__item){
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