<template>
  <div
    class="base-popup-container"
    :class="props.info.themeColor ?? 'theme-default'"
  >
    <!-- 有标题就传入标题 -->
    <div class="head">
      <slot name="title">
        <div 
          v-if="title" 
          class="title"
        >
          {{ title }}
        </div>
      </slot>
      <div
        class="close-btn"
        @click="closeClick"
      >
        X
      </div>
    </div>
    <div class="body">
      <slot name="body" />
    </div>
    <div class="foot">
      <slot name="foot" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  interface Info {
    title?:string,
    options?:Record<string,string>,
    themeColor?:string
  }
  interface Props {
    info?:Info,
    //留给用户自定义宽高的选择
    width?:string,
    height?:string,
    showRef:boolean //v-model控制弹窗显隐
  }

  const props = withDefaults(defineProps<Props>(),{
    info:()=>({
      themeColor:'theme-default'
    }),
    width:'200px',
    height:'150px'
  })

  
  const title = props.info.title

  const emit =  defineEmits(['update:show-ref'])

  function closeClick (){
    emit('update:show-ref',false)
  }

</script>

<style lang="scss" scoped>
.base-popup-container{
  user-select: none;
  padding: .3rem;
  border-radius: .375rem;
  max-width: 260px;
  min-width: 150px;
  min-height: 120px;
}
.head{
  margin-top: .5rem;
  position: relative;
  text-align: center;
  align-items: center;
}
.title{
  flex: 1;
  font-size: 1.7rem;
  color: #fff;
  font-weight: bold;
  text-shadow:
    0 0 .375rem #38e1ff,
    0 0 .75rem #0ff;
}

.theme-default {
  color: #38e1ff;
  box-shadow:
    inset 0 0 .5rem rgba(56, 225, 255, 0.6),
    0 0 .75rem rgba(56, 225, 255, 0.5);
  overflow: hidden;
  background: rgba(0, 50, 80, 0.35);
  backdrop-filter: blur(.1875rem);
}

.close-btn {
  position: absolute;
  right: 0.1rem;
  top: 0.2rem;
  pointer-events: auto;
  cursor: pointer;
  display: inline-block;
  border-radius: 50%;
  width: 1.2rem;
  height: 1.2rem; 
  line-height: 1.2rem; //垂直居中
  text-align: center;
  font-size: 0.7rem;
  color: #fff;
  background-color: rgba(98, 230, 212, 0.3);
  transition: all 0.3s ease; //让颜色变化平缓一点 不要那么突然 

  &:hover {
    background-color: rgba(75, 210, 230, 0.822);
    transform: scale(1.1);
  }
}
.body{
  margin: 0.5rem;
}
.foot{
  display: flex;
  justify-content: center;
  margin-bottom: .7rem;
}
</style>