<template>
  <div class="time">
    <span class="date">{{ time }}</span>
    <span class="week-day">{{ weekDay }}</span>
  </div>
</template>

<script lang="ts" setup>
import { onMounted,onUnmounted,ref } from 'vue'

const dayToZh = ['日', '一', '二', '三', '四', '五', '六']

function formatTime(date:Date){
  const y = String(date.getFullYear())
  const month = String(date.getMonth()+1)
  const d = String(date.getDate())
  const h = String(date.getHours()).padStart(2,'0')
  const m = String(date.getMinutes()).padStart(2,'0')
  const s = String(date.getSeconds()).padStart(2,'0')
  return `${y}-${month}-${d} ${h}:${m}:${s}`
}

function formatWeekDay(date:Date){
  const day = dayToZh[date.getDay()]
  return `星期${day}`
}

const time = ref('')
const weekDay = ref('')

let timer:number|null = null
onMounted(()=>{
  const data = new Date()
  time.value = formatTime(data)
  weekDay.value = formatWeekDay(data)
  timer = setInterval(() => {
    const data = new Date()
    time.value = formatTime(data)
    weekDay.value = formatWeekDay(data)
  }, 1000)
})
onUnmounted(()=>{
  if(timer)
    clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.time{
  transform: skewX(45deg);
  .date{
    margin-right: 10px;
    color: rgb(91, 236, 236);

  }
  .week-day{
    color: rgb(91, 195, 236);
    font-weight: bold;
  }
  
}

</style>