<!-- src/components/common/BasePopup.vue -->
<template>
  <div
    v-if="showRef"
    :id="popupId"
    class="divlabel-container"
    :class="themeColor[title] || 'theme-default'"
  >
    <div class="animate-maker-border">
      <div class="head">
        <span class="animate-marker__text">{{ title }}</span>
        <div
          class="close-btn"
          @click="closeClick"
        >
          X
        </div>
      </div>

      <div class="body">
        <slot /> <!-- 子组件内容插槽 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Ref } from 'vue';

interface Props {
  popupId: string;
  title: string;
  showRef: Ref<boolean>;
}

const { popupId, title, showRef } = defineProps<Props>();

const themeColor: Record<string, string> = {
  '外卖店': 'theme-takeaway',
  '目的地': 'theme-destination',
  '默认': 'theme-default',
};

const emit = defineEmits(['update:showRef'])

function closeClick() {
  emit('update:showRef', false)
}
</script>

<style lang="scss" scoped>
@import '@/assets/scss/popupInfo.scss';
</style>
