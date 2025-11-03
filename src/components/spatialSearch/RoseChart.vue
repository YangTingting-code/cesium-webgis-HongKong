<template>
  <BaseEchart 
    :options="option"
  />
</template>

<script lang="ts" setup>
import * as echarts from 'echarts';
import { computed} from 'vue';
import BaseEchart from "@/components/common/BaseEchart.vue"

interface SeriesDataItem {
  value: number;
  name: string;
}
interface Props {
  width?: string;
  height?: string;
  seriesData?: SeriesDataItem[];
}

const props = withDefaults(defineProps<Props>(), {
  width: '220px',
  height: '200px',
  seriesData:()=>[]
});


const option =computed<echarts.EChartsOption>(()=>({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)',
  },
  legend: {
    // orient: 'vertical',//垂直排列
    orient: 'horizontal', //水平排列
    icon: 'circle',
    x: 'center',
    bottom: 0,
    textStyle: { color: '#fff' },
    data: props.seriesData.map((item) => item.name),
  },
  series: [
    {
      name: '统计',
      type: 'pie',
      radius: [30, 60], //半径改小一点
      center: ['50%', '40%'], //垂直位置往上提
      roseType: 'area',
      data: props.seriesData.map((item) => {
        if (item.name === '公共设施') {
          return {
            ...item,
            itemStyle: { color: '#ea7ccc' },
          };
        } else if (item.name === '交通类') {
          return {
            ...item,
            itemStyle: { color: '#fc8452' },
          };
        } else if (item.name === '未知') {
          return {
            ...item,
            itemStyle: { color: '#73c0de' },
          };
        }
        return item;
      }),
      label: { color: '#fff' },

      labelLine: {
        smooth: 0.2,
        length: 2,
        length2: 2,
        lineStyle: {
          width: 2,
          // color:'#fff'
        },
      },
      itemStyle: {
        borderRadius: 8, //设置圆角
      },
    },
  ],
})) 

</script>

