<!-- 控制弹窗的长相 -->
<template>
  <div
    v-show="showRef"
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
        <!-- 循环生成span容器 -->
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
            <!-- target="_blank";rel="noopener noreferrer" 是什么意思 -->
            {{ val }}
          </a>
          <span 
            v-else
            class="val"
          >{{ val }}</span>

          <br>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed , type Ref } from 'vue';

//弹窗要显示的字段
const whitelist:Record<string,string[]> = {
  '外卖店':['pickName','phone','openinghours','cuisine','facebook','instagram'],
  '目的地':['dropoffName','building','description','region']
}

//弹窗边框颜色 class类名根据传入的title决定
const themeColor: Record<string, string> = {
  '外卖店': 'theme-takeaway',      // 绿色
  '目的地': 'theme-destination'    // 蓝色
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
// //默认宽高
const {
  showRef,
  popupId,
  title,
  options
} = withDefaults(defineProps<Props>(),{
  title:'默认'
});

const showRefRef = showRef as Ref<boolean>; // 类型断言


//会不会和之前在类里写好的toggle冲突？ 不会 因为都是用showRef控制
function closeClick() {
  showRefRef.value = false;
}

function isLink(val:string):boolean{
  return /^https?:\/\//.test(val)
}

</script>

<style lang="scss" scoped>
@import '@/assets/scss/popupInfo.scss';
</style>
