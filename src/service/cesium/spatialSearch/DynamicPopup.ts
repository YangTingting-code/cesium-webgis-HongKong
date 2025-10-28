//导入popup组件
//导入 popup.vue 的作用，就是让你可以在 Cesium 的弹窗里直接用 Vue 组件来写内容，而不是死板的 innerHTML。
import popup from '@/components/spatialSearch/Popup.vue';
import { createApp, type Ref, type Reactive } from 'vue';

import * as Cesium from 'cesium';

interface PopupOptions {
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

export default class DynamicPopup {
  private viewer: Cesium.Viewer;
  private entity: Cesium.Entity | undefined;
  private div: HTMLDivElement;
  private width: number;
  private height: number;
  private appInstance: any; //vue应用实例
  private postRenderFn: () => void; //()=> void是什么意思 //postRenderFn 是一个没有参数、没有返回值的函数。
  private showRef: Ref<boolean>;
  private chartData: Reactive<{ value: number; name: string }[]>;
  private scale = 1;

  constructor(options: PopupOptions) {
    this.showRef = options.showRef;
    this.viewer = options.viewer;
    this.entity = this.viewer.entities.getById(options.entityId);
    this.width = options.width ?? 270;
    this.height = options.height ?? 10;
    //添加图表数据
    this.chartData = options.chartData;
    //创建DOM
    this.div = document.createElement('div');
    this.div.id = options.id;
    this.div.style.position = 'absolute';
    this.div.style.width = this.width + 'px';
    this.div.style.height = this.height + 'px';
    this.div.innerHTML = `
    <div style="
                background:rgba(255,122,0,0.6);
                color:#fff;
                text-align:center;
                line-height:${this.height}px;
                border-radius:.375rem;
                font-size:.875rem;">
      ${options.title}
    </div>
    `;
    //创建vue组件实例
    this.appInstance = createApp(popup, {
      title: options.title || '标题',
      id: options.id || '001',
      showRef: this.showRef, //为什么不是option.showRef？
      chartData: this.chartData,
      removeCircle: options.onDelete,
    }).mount(this.div);
    this.viewer.cesiumWidget.container.appendChild(this.div);
    //帧刷新绑定
    this.postRenderFn = this.updatePosition.bind(this); //这句话什么意思 bind什么意思? bind用法？
    /**bind(this) 会返回一个新的函数，并且在调用时 this 永远指向当前的 DynamicPopup 实例。
因为 updatePosition 是类的方法，如果直接传给 addEventListener，this 会指向 Cesium 的上下文，而不是你的类实例，所以要 bind(this) 保证方法内的 this.div、this.viewer 等能正常访问 */
    this.viewer.scene.postRender.addEventListener(this.postRenderFn); //事件绑定的话 需不需要把弄成像handel一样的方便解绑呢？
  }


  /** 每帧更新位置  */
  private updatePosition() {
    if (!this.entity || !this.entity.position) return;
    if (this.showRef && !this.showRef.value) {
      this.div.style.display = 'none';
      return;
    }

    const position = this.entity.position.getValue(this.viewer.clock.currentTime);
    if (!position) return;

    const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      position
    );
    if (!screenPos) return;

    // === 相机高度缩放：越高越大，越近越小 ===
    const cameraHeight = this.viewer.camera.positionCartographic.height;
    const BASE_HEIGHT = 500;  // 基准高度
    const scale = Math.min(0.8, Math.max(0.6, cameraHeight / BASE_HEIGHT));
    // 应用位置 + 缩放
    this.div.style.left = `${screenPos.x}px`;
    this.div.style.top = `${screenPos.y}px`;
    this.div.style.transform = `translate(-50%, -100%) scale(${scale})`;
    this.div.style.transformOrigin = 'center bottom';

    // 可见性控制
    const cameraPosition = this.viewer.camera.position;
    let height =
      this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cameraPosition)
        .height;
    height += this.viewer.scene.globe.ellipsoid.maximumRadius;

    if (
      !(Cesium.Cartesian3.distance(cameraPosition, position) > height) &&
      this.viewer.camera.positionCartographic.height < 50000000
    ) {
      this.div.style.display = 'block';
    } else {
      this.div.style.display = 'none';
    }
  }


  show() {
    if (this.showRef) this.showRef.value = true;
  }
  hide() {
    if (this.showRef) this.showRef.value = false;
  }
  //切换

  toggle() {
    if (this.showRef) this.showRef.value = !this.showRef.value;
  }
  /**销毁  为什么是销毁这些？
   * 解除帧刷新事件绑定，避免内存泄漏
   * 删除 DOM，避免页面上残留无用的弹窗
   * */
  destroy() {
    this.viewer.scene.postRender.removeEventListener(this.postRenderFn);
    this.div.remove();
  }

  updateChartData(newData: { value: number; name: string }[]) {
    //this.chartData是响应式数据 修改了这里的数据也可以同步修改到vue组件的数据
    this.chartData.splice(0, this.chartData.length, ...newData);
  }
}
