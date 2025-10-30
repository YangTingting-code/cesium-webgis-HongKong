<template>
  <BaseEchart 
    :options="option"
    :width="props.width"
    :height="props.height"
  />
</template>

<script lang="ts" setup>
import BaseEchart from '@/components/common/BaseEchart.vue'
import * as echarts from 'echarts';
import { computed} from 'vue';

const xAxis_zh = ['早上', '中午', '下午', '傍晚', '晚上']
const category_zh = ['咖啡饮品类', '烘焙类', '餐饮类', '食材类', '酒类', '便利/宵夜类']

interface Props {
  width?: string;
  height?: string;
  seriesData: echarts.SeriesOption[];
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '100%',
});

const option = computed<echarts.EChartsOption>(()=> ({
    title: {
      text: '外卖品类全天变化趋势',
      top: 13,
      left: 45,
      textStyle: {
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: '#00c2ff',
        textShadowColor: 'rgba(0,194,255,0.6)',
        textShadowBlur: 6
      }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(15,19,37,0.9)',
      transitionDuration: 0.4,
      hideDelay: 100,
      displayTransition: true,
      borderColor: '#2e6098',
      borderWidth: 1,
      // 根据鼠标位置控制弹窗位置 
      position: function (point, params, dom, rect, size) {
        const x = point[0]; // 鼠标 x 坐标
        const y = point[1]; // 鼠标 y 坐标
        const viewWidth = size.viewSize[0];
        const boxWidth = size.contentSize[0];

        // 让 tooltip 不超出右边界
        const left = x + boxWidth > viewWidth ? x - boxWidth - 10 : x + 10;
        return [left, y - 80];
      },
      textStyle: {
        color: '#eee',
        fontSize: 12
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#ffffffff',
          width: 1
        },
        label: {
          backgroundColor: '#4a96d4ff',
        }
      }
    },

    legend: {
      data: category_zh,
      bottom: '3%',
      textStyle: {
        fontSize: '0.9rem',
        color: '#fff'
      }
    },
    toolbox: {
      itemSize: 12,
      itemGap: 3,
      emphasis: {
        iconStyle: {
          borderColor: "#86d1f1ff",
          opacity: 0.8,
        }
      },
      feature: {
        saveAsImage: {
          title: '保存为图片',
          iconStyle: {
            borderColor: '#69cbf6ff',
            opacity: 0.8,
            borderWidth: 1
          }
        },
        dataView: {
          title: '数据查看',
          iconStyle: {
            borderColor: '#69cbf6ff',
            opacity: 0.8,
            borderWidth: 1
          }
        }

      }
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: xAxis_zh, // ✅ 对应时间段
        axisLabel: {
          margin: 10,
          fontFamily: 'Microsoft YaHei',
          fontSize: '0.9rem',
          fontWeight: 500,
          color: '#00c2ff',

        },
        axisLine: {

          lineStyle: {

            color: '#2e6098'
          }
        },
        axisTick: { show: false }
      }
    ],
    yAxis: [
      {
        type: 'value',
        axisLabel: {
          fontSize: "0.9rem",
          color: '#89bdedff'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.05)',
            width: 6,
          }
        },
      },
    ],
    grid: {
      top: '19%'
    },
    series:props.seriesData // ✅ 加上这一行
  }))
</script>

