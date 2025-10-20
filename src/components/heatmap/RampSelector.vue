<template>
  <div class="ramp">
    <el-form-item
      label="色带"
    >
      <el-select
        v-model="pickedName"
        placeholder="选择色带"
        @change="apply"
      >
        <!-- 输入框前缀：未选择时显示默认色带 -->
        <template #prefix>
          <div 
            v-if="!pickedName"
            class="ramp-mini"
            :style="{background:gradientBar(defaultRamp)}"
          />
        </template>

        <!-- 输入框选中显示 -->
        <template #label="{value}">
          <div class="ramp-option">
            <span class="name"> {{ value }}</span>
            <span
              class="ramp-bar"
              :style="{background:gradientBar(ramps.find(r=>r.name === value)!)}"
            />
          </div>
        </template>

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
              :style="{ background: gradientBar(r) }"
            />
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { rampToGradient } from '@/utils/toolbar/heatmap/rampToGradient'
import { ramps } from '@/utils/toolbar/heatmap/colorRamps'


const emit = defineEmits<{ apply: [gradient: Record<number, string>] }>()

const pickedName = ref('')
const defaultRamp = ramps[0]

function gradientBar(r: typeof ramps[0]) {
  const g = rampToGradient(r, 20)
  const stops = Object.keys(g)
    .map(pos => `${g[pos]} ${(+pos * 100).toFixed(1)}%`)
    .join(',')
  return `linear-gradient(to right, ${stops})`
}

function apply() {
  if(!pickedName.value) return //什么都没选
  const ramp = ramps.find(r => r.name === pickedName.value)!
  emit('apply', rampToGradient(ramp, 10))
}
</script>

<style lang="scss" scoped>
.ramp {
  width: 40%;

  :deep(.el-select__wrapper) {
    min-height: 26px;
    line-height: 26px;
    font-size: 10px;
    padding: 0;
  }

  .ramp-mini {
    position: relative;
    left: -10px;
    width: 100px;
    height: 24px;
    border-radius: 2px;
  }

  /* ✅ 修正穿透写法 */
  :deep(.ramp-option) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 160px;
  }

  :deep(.ramp-option .name) {
    flex: 0 0 60px;
    font-size: 12px;
  }

  :deep(.ramp-option .ramp-bar) {
    flex: 1;
    height: 12px;
    border-radius: 6px;
    margin-left: 8px;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }
}
</style>

