<!-- src/components/spatialSearch/InfoPopup.vue -->
<template>
  <BasePopup
    :popup-id="popupId"
    :title="title"
    :show-ref="showRef"
  >
    <span
      v-for="([key,val],idx) in filteredEntries"
      :key="idx"
      class="info-line"
    >
      <span class="label">{{ labelMap[key] ?? key }}：</span>
      <a
        v-if="isLink(val)"
        class="link"
        :href="val"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ val }}
      </a>
      <span
        v-else
        class="val"
      >{{ val }}</span>
      <br>
    </span>
  </BasePopup>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue';
import BasePopup from '@/components/common/BasePopup.vue';

interface Props {
  popupId: string;
  showRef: Ref<boolean>;
  title: string;
  options: Record<string, string>;
}

const { popupId, showRef, title, options } = defineProps<Props>();

const whitelist: Record<string, string[]> = {
  '外卖店': ['pickName', 'phone', 'openinghours', 'cuisine', 'facebook', 'instagram'],
  '目的地': ['dropoffName', 'building', 'description', 'region'],
};

const filteredEntries = computed(() =>
  Object.entries(options).filter(([k]) => (whitelist[title] || []).includes(k))
);

const labelMap: Record<string, string> = {
  pickName: '店名',
  openinghours: '营业时间',
  phone: '电话',
  cuisine: '菜系',
  facebook: 'facebook',
  instagram: 'instagram',
  dropoffName: '目的地名',
  region: '行政区',
  building: '建筑类型',
  description: '描述',
};

function isLink(val: string) {
  return /^https?:\/\//.test(val);
}
</script>
