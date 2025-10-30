//导入popup组件
//导入 popup.vue 的作用，就是让你可以在 Cesium 的弹窗里直接用 Vue 组件来写内容，而不是死板的 innerHTML。
import popup from '@/components/spatialSearch/Popup.vue';
import { createApp, type Ref, type Reactive } from 'vue';
import { BasePopup } from '../popup/BasePopup'
import * as Cesium from 'cesium';

interface DynamicPopupOptions {
  id: string; //弹窗id dom的id
  title: string;
  viewer: Cesium.Viewer;
  entityId: string;
  width?: number;
  height?: number;
  //新增show 让外界控制显示还是隐藏
  showRef: Ref<boolean>;
  chartData: Reactive<{ value: number; name: string }[]>;
  onDelete: () => void; //新增
}

export class DynamicPopup extends BasePopup {
  private chartData: Reactive<{ value: number; name: string }[]>
  private title: string
  private onDelete: () => void

  constructor(options: DynamicPopupOptions) {
    super(options.viewer, options.entityId, options.showRef)
    //添加图表数据
    this.chartData = options.chartData
    this.title = options.title
    this.onDelete = options.onDelete
    this.div.id = options.id
    this.mountContent()
    this.viewer.scene.postRender.addEventListener(this.postRenderFn); //事件绑定的话 需不需要把弄成像handel一样的方便解绑呢？
  }
  //创建vue组件实例

  mountContent() {
    createApp(popup, {
      title: this.title || '标题',
      showRef: this.showRef, //为什么不是option.showRef？
      chartData: this.chartData,
      removeCircle: this.onDelete,
    }).mount(this.div)
  }

  updateChartData(newData: { value: number; name: string }[]) {
    //this.chartData是响应式数据 修改了这里的数据也可以同步修改到vue组件的数据
    this.chartData.splice(0, this.chartData.length, ...newData);
  }

  //覆盖偏移Y
  protected getOffsetY(): number {
    return 50
  }
}