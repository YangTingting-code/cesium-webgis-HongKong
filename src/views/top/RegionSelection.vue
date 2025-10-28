<template>
  <div class="region-selection">
    <span class="region">{{ region }}</span>
    <el-select
      v-model="pickedRegion"
      placeholder="选择行政区"
      popper-class="region-dropdown"
      size="small"
    >
      <el-option
        v-for="r in regions"
        :key="r"
        :label="r"
        :value="r"
      >
        <div class="region-option">
          <span class="region">{{ r }}</span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import {regions} from '@/data/regionHK'
import {region} from '@/constant/index'
import { onMounted, ref, watch} from 'vue'
import {useRegionStore} from '@/store/useRegionStore'
import {regionPersistance} from '@/service/loaders'

const currRegion = regionPersistance.getRegion()

const pickedRegion = currRegion ? ref(currRegion) : ref('九龙城区')

const regionStore = useRegionStore()

watch(pickedRegion,(newV)=>{
  regionStore.updateRegion([newV])
  regionPersistance.setRegion(newV)
})

onMounted(()=>{
  //存储 pickedRegion 一开始的行政区到sessionStorge
  regionPersistance.setRegion(pickedRegion.value)
  regionStore.updateRegion(pickedRegion.value)

})



</script>

<style lang="scss" scoped>
.region-selection{
  color: rgb(91, 236, 236);
  transform: skewX(-45deg) ;  
  display: flex;
  align-items: center;
  width: 170px !important;
  span{
    display: inline-block;
    width: 100px;
  }
  .el-select{
    transform:scale(0.9) ;
  }
}
</style>