<!-- 控制弹窗的长相 -->
<template>
  <basePopup
    v-model:show-ref="showRefRef"
    :info="info"
  >
    <template #body>
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
    </template>
  </basePopup>
</template>

<script lang="ts" setup>
import { computed , type Ref} from 'vue';
//测试弹窗组件
import basePopup from '@/components/common/BasePopup.vue'

//弹窗要显示的字段
const whitelist:Record<string,string[]> = {
  '外卖店':['pickName','phone','openinghours','cuisine','facebook','instagram'],
  '目的地':['dropoffName','building','description','region']
}

//弹窗边框颜色 class类名根据传入的title决定
const ThemeColor: Record<string, string> = {
  '外卖店': 'theme-takeaway',      // 绿色
  '目的地': 'theme-destination'    // 蓝色
}

// //默认宽高
const {
  showRef,
  title='默认',
  options
} = defineProps<Props>()

const info = {
  title:title,
  themeColor:ThemeColor[title]
}

const filteredEntries = computed(() =>
  Object.entries(options).filter(([k]) =>
    (whitelist[title] || []).includes(k) //title是传入的字符串
  )
)
const labelMap: Record<string,string> = {
  pickName:'店名',
  openinghours:'营业时间',
  phone:'电话',
  cuisine:'菜系',
  facebook:'facebook',
  instagram:'instagram',
  
  dropoffName:'目的地名',
  region:'行政区',
  building:'建筑类型',
  description:'描述'
}

interface Props {
  popupId: string;
  showRef: Ref<boolean>;
  title?: string;
  options:Record<string,string>
}

const showRefRef = showRef as Ref<boolean> // 类型断言

function isLink(val:string):boolean{
  return /^https?:\/\//.test(val)
}

</script>

<style lang="scss" scoped>
// @import '@/assets/scss/popupInfo.scss';

.theme-takeaway {
  background: linear-gradient(225deg, // 反向+更深
      rgba(0, 150, 255, 0.25) 0%,
      rgba(0, 90, 200, 0.18) 100%);
  box-shadow:
    inset 0 0 8px rgba(0, 150, 255, 0.50),
    0 0 12px rgba(0, 150, 255, 0.35);
}
.theme-destination {
  background: linear-gradient(45deg, // 更亮更浅
      rgba(0, 230, 255, 0.28) 0%,
      rgba(56, 225, 255, 0.20) 100%);
  box-shadow:
    inset 0 0 8px rgba(56, 225, 255, 0.55),
    0 0 12px rgba(56, 225, 255, 0.38);
}
</style>
