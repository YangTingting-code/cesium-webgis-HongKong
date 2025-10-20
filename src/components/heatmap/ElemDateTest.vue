<template>
  <div class="heatmapControler">
    <div class="head">
      <span class="title">热力图控制面板</span>
    </div>
    <div class="body">
      <form @submit.prevent="getForm(form)">
        <ul>
          <li>
            <el-form-item
              for="radius"
              label="半径："
            >
              <el-input-number
                v-model="form.radius"
                :precision="2"
                :step="0.1"
                :max="35"
                :size="size"
              />
            </el-form-item>
            <label for="radius">半径：</label>
          </li>
          <li>
            <label for="blur">光晕：</label>
            <el-input-number
              v-model="form.blur"
              :precision="2"
              :step="0.1"
              :max="1"
              :size="size"
            />
          </li>
          <li>
            <label for="maxOpacity">高值不透明度：</label>
            <el-input-number
              v-model="form.maxOpacity"
              :precision="2"
              :step="0.1"
              :max="1"
              :size="size"
            />
          </li>
          <li>
            <label for="minOpacity">低值不透明度：</label>
            <el-input-number
              v-model="form.minOpacity"
              :precision="2"
              :step="0.1"
              :max="1"
              :size="size"
            />
          </li>
          <li>
            <div class="demo-date-picker">
              <span class="demonstration">时间范围：</span>
              <div class="block">
                <el-date-picker
                  v-model="form.date"
                  type="daterange"
                  range-separator="To"
                  start-placeholder="Start date"
                  end-placeholder="End date"
                  :size="size"
                />
              </div>
            </div>
          </li>
          <li class="button">
            <button type="submit">
              开始绘制
            </button>
          </li>
        </ul>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {reactive} from 'vue'
import test from './ElemDateTest.vue'
const size = "small"
interface FormType {
  radius:number,
  blur:number,
  maxOpacity:number,
  minOpacity:number,
  date:any
}
const form = reactive({
  radius:20,
  blur:0.9,
  maxOpacity:0.75,
  minOpacity:0.15,
  date:null
})
const {getForm} = defineProps<{getForm:(data:FormType)=>void}>()

</script>

<style lang="scss"> //基本上把element plus 的scss文件全部换成了rem
@import url('../../../../lib/element-plus-theme/date-picker-copy.scss'); //可以把日历缩小
@import url('../../../../lib/element-plus-theme/input.scss');  //字体缩小
@import url('../../../../lib/element-plus-theme/input-number.scss'); //输入框长度缩小
.el-input-number--small .el-input--small .el-input__wrapper{ //关键：让数字输入框缩小到正常范围
  padding-left: 0;
  padding-right: 0;
}
.heatmapControler{
  width: 300px;
  height: 200px;
  background-color: pink;
  .head{
    text-align: center;
    .title{
      text-align: center;
      display: inline-block;
      font-size: 1rem;
    }
  }
  .body{
    li{
      list-style: none;
    }
    input{
      height: 2.5rem;
    }
  }
}
</style>
