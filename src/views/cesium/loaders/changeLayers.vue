<template>
  <div
    class="layer-control"
    :class="{
      glow: isHover,
      orangeBorder: isClicked,
    }"
    @click="toggleList"
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
  >
    <div
      class="icon"
      :style="{
        backgroundImage: `url(${currentBG})`,
      }"
    />
    <div
      v-if="showList"
      class="layer-list"
      @click.stop="selectLayer"
    >
      <h3 class="layer">
        Imagery
      </h3>
      <div class="tileset-list">
        <!-- 循环生成div容器 -->
        <div
          v-for="(item, index) in tileStyle"
          :key="index"
          class="item"
          :class="{ active: index === activeTilesetIndex }"
          :data-url="item.url"
          :data-styleid="item.tilesetId"
        >
          <button
            :style="{
              backgroundImage: `url(${item.url})`,
            }"
          />
          <span>{{ item.description }}</span>
        </div>
      </div>
      <h3 class="layer">
        矢量
      </h3>
      <div class="mapbox-list">
        <!-- 循环生成div容器 -->
        <div
          v-for="(item, index) in mapboxStyle"
          :key="index"
          class="item"
          :class="{ active: index === activeMapboxIndex }"
          :data-url="item.url"
          :data-styleid="item.mapboxId"
        >
          <!-- button自定义属性 点击它能够传获得该button的styleId-->
          <button
            :style="{
              backgroundImage: `url(${item.url})`,
            }"
          />
          <span>{{ item.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { mapboxPicUrl, mapboxData,tilesetPicUrl, tilesetData } from '@/data/layersData';
import {useMapboxStyleStore} from '@/store/mapStyleStore'
import {mapPersistence} from '@/service/loaders/load-persistence'

//底图风格Store 
const mapboxStyleStore = useMapboxStyleStore()
//控制进入离开状态
const isHover = ref(false);
const isClicked = ref(false);

const {Cesium_Ion} = tilesetPicUrl
// 定义一个类型
interface MapboxStyle {
  mapboxId: string;
  description: string;
  url: string;
}
interface TilesetStyle {
  tilesetId: string;
  description: string;
  url: string;
}

const mapboxStyle = reactive<MapboxStyle[]>([]);
const tileStyle = reactive<TilesetStyle[]>([]);

mapboxData.forEach((e) => {
  mapboxStyle.push({
    mapboxId: e.mapboxId,
    description: e.description,
    url: e.url,
  })
})

tilesetData.forEach((e)=>{
  tileStyle.push({
    tilesetId: e.tilesetId,
    description: e.description,
    url: e.url,
  })
})

const showList = ref(false);
function toggleList() {
  isClicked.value = !isClicked.value; //点击时变true
  isHover.value = false;
  showList.value = !showList.value;
}

//事件委托  监听事件 layer-list
let currentBG = ref(Cesium_Ion);
let currentStyleId = ref();
// let currentIndex = ref(0);
const activeTilesetIndex = ref<number | null>(0);

const activeMapboxIndex = ref<number | null>(null);

const emit = defineEmits<{ changeLayer: [stringId: string] }>();

function selectLayer(e: MouseEvent) {

  const item = (e.target as HTMLElement).closest('.item') as HTMLElement
  //这是btn写法
  // const btn = (e.target as HTMLElement).closest('button[data-url]')
  //点击的不是按钮就返回
  if (!item) return
  
  const url = item.dataset.url;
  const id = item.dataset.styleid;

  //点击的是同样的就返回
  if (currentBG.value === url || !url || !id) return;

  const parent = item.parentElement?.classList.contains('tileset-list')
    ? 'tileset'
    : 'mapbox';

    const index = Array.from((item.parentNode as HTMLElement).children).indexOf(item)  

  if(parent === 'tileset'){
    activeTilesetIndex.value = index;
    activeMapboxIndex.value = null;
  }else{
    activeMapboxIndex.value = index;
    activeTilesetIndex.value = null;
  }
  
  //关闭面板
  toggleList();
  currentBG.value = url;
  currentStyleId.value = id;
  // 子传父 父自定义函数
  emit('changeLayer', id);

  //更新此时的图层id
  mapboxStyleStore.updateId(id)
}

//mapId 对应到图片
onMounted(()=>{
  const mapId = mapPersistence.getMapstyle()
  if(Object.keys(mapboxPicUrl).includes(mapId)){
    currentBG.value = mapboxPicUrl[mapId]
  }else if(Object.keys(tilesetPicUrl).includes(mapId)){
    currentBG.value = tilesetPicUrl[mapId]
  }
})

</script>

<style scoped lang="scss">
.layer-control {
  border-radius: .3125rem;
  transition: 0.3s all ease;
  //发光效果
  &.glow {
    box-shadow: 0 0 0rem .0625rem rgb(189, 236, 248);
  }
  &.orangeBorder {
    box-shadow: 0 0 0rem .0625rem orange;
  }
  .icon {
    border: 1px solid rgb(41, 209, 251);
    height: 2.5rem;
    width: 2.5rem;
    background-size: cover;
    border-radius: .3125rem;
    background-image: url('../assets/mapboxLayersPic/mapbox-navigation-night.png');
  }
  .layer-list {
    position: absolute;
    top: 3rem;
    // left: -10.625rem;
    right: 0px;
    width: 15rem;
    height: 23rem;
    background-color: rgba(38, 38, 38, 0.75);
    border-radius: .3125rem;
    h3 {
      color: white;
    }
    .layer{
      margin:.6rem .8rem;
    }
    .mapbox-list,
    .tileset-list {
      display: flex;
      flex-wrap: wrap;
      .item {
        //active时btn和文字样式不一样
        &.active {
          button {
            border: double .25rem rgb(189, 236, 248);
          }
          span {
            color: rgb(189, 236, 248);
          }
        }
        display: flex;
        justify-content: center;
        align-items: top;
        margin-bottom: .0625rem;
        width: 5rem;
        height: 5.625rem;
        // background-color: pink;
        flex-wrap: wrap;
        cursor: pointer;
        button {
          width: 3.75rem;
          height: 3.75rem;
          // background-image: url('../assets/mapboxLayersPic/mapbox-navigation-night.png');
          background-size: cover;
          border-radius: .3125rem;
          border: .125rem solid transparent;
          transition: all 0.2s ease;
        }
        &:hover button {
          border-color: #fff; // 白色边框
          box-shadow: 0 0 .5rem .125rem rgba(255, 255, 255, 0.8); // 白色发光描边
          background-color: rgba(255, 255, 255, 0.1); // 可选浅背景增强层次
        }
        // 关键部分：当 button hover，span 添加下划线
        &:hover span {
          text-decoration: underline;
        }
        span {
          font-size: .75rem;
          color: white;
          position: relative;
          top: -0.1875rem;
        }
      }
    }
    .tileset-list{
      &::after{
        content: ''; // 必须有，否则伪元素不会渲染
        display: inline-block;
        position: relative;
        left: 5%;
        width: 90%;
        height: 1px;
        background-color: rgb(82, 103, 145);
        opacity: 0.6;
      }
    }
  }
}
</style>
