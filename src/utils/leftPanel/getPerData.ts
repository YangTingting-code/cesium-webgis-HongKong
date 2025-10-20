import { flowWeek } from '@/service/cesium/heatmap/FlowWeek';

export async function test() {
  const res = await flowWeek.averDiffRegionByDay()
  // const scaledData = logScaleAndNormalize(res)
  calcTotalFlow(res)
  console.log('res', res)
  // console.log('scaledData', scaledData)
  return res
}

// function logScaleAndNormalize(data, minTarget = 200, maxTarget = 5000) {
//   const scaledData = {};

//   for (const district in data) {
//     scaledData[district] = {};
//     const districtData = data[district];

//     // 先收集该 district 下所有功能区的时间序列
//     const areaKeys = Object.keys(districtData[Object.keys(districtData)[0]]);

//     for (const area of areaKeys) {
//       // 收集当前功能区的所有值
//       const values = [];
//       for (const time in districtData) {
//         const val = Number(districtData[time][area] || 0);
//         values.push(Math.log10(val + 1));
//       }

//       const minVal = Math.min(...values);
//       const maxVal = Math.max(...values);

//       // 再进行缩放
//       for (const time in districtData) {
//         if (!scaledData[district][time]) scaledData[district][time] = {};

//         const val = Number(districtData[time][area] || 0);
//         const logVal = Math.log10(val + 1);
//         const norm = (logVal - minVal) / (maxVal - minVal || 1);
//         scaledData[district][time][area] =
//           minTarget + norm * (maxTarget - minTarget);
//       }
//     }
//   }

//   return scaledData;
// }

/**
 * 计算各行政区每个时段的总人流
 * @param {Object} rawData - 原始嵌套数据
 * @returns {Object} 返回同样结构，但最里层只保留一个字段 total
 *
 * 使用示例：
 *   const result = calcTotalFlow(originalData);
 *   console.log(result.深水埗区.morning.total); // 299171.5
 */
function calcTotalFlow(rawData) {
  const districts = Object.keys(rawData); // ['九龙城区','油尖旺区', …]
  const periods = ['night', 'earlyMorning', 'morning', 'lunch', 'afternoon', 'evening', 'lateEvening'];

  const out = {};
  districts.forEach(d => {
    out[d] = {};
    periods.forEach(p => {
      const src = rawData[d][p];
      const total = (src.officeArea || 0) +
        (src.residentialArea || 0) +
        (src.mallArea || 0) +
        (src.educationArea || 0) +
        (src.stationArea || 0);
      out[d][p] = { total };
    });
  });
  console.log('计算总和', out)
  return out;
}

/* ========== 如果只想打印结果，可以再加一段 ========== */
// const res = calcTotalFlow(originalData);
// console.log(JSON.stringify(res, null, 2));

// function logScaleAndNormalize(data, minTarget = 200, maxTarget = 5000) {
//   const allValues = [];

//   // 先收集所有值
//   for (const district in data) {
//     const districtData = data[district];
//     for (const time in districtData) {
//       for (const area in districtData[time]) {
//         const val = Number(districtData[time][area] || 0);
//         allValues.push(Math.log10(val + 1));
//       }
//     }
//   }

//   const minVal = Math.min(...allValues);
//   const maxVal = Math.max(...allValues);

//   const scaledData = {};
//   for (const district in data) {
//     scaledData[district] = {};
//     const districtData = data[district];

//     for (const time in districtData) {
//       scaledData[district][time] = {};

//       for (const area in districtData[time]) {
//         const val = Number(districtData[time][area] || 0);
//         const logVal = Math.log10(val + 1);
//         const norm = (logVal - minVal) / (maxVal - minVal || 1); // 防止除0
//         scaledData[district][time][area] =
//           minTarget + norm * (maxTarget - minTarget);
//       }
//     }
//   }

//   return scaledData;
// }



// function logScaleAndNormalize(data, minTarget = 200, maxTarget = 5000) {
//   // 收集所有值
//   const allValues = [];
//   for (const time in data) {
//     for (const area in data[time]) {
//       allValues.push(Math.log2(data[time][area] + 1));
//     }
//   }

//   // 找到缩放前的最小/最大
//   const minVal = Math.min(...allValues);
//   const maxVal = Math.max(...allValues);

//   const scaledData = {};
//   for (const time in data) {
//     scaledData[time] = {};
//     for (const area in data[time]) {
//       const logVal = Math.log10(data[time][area] + 1);
//       // 归一化到 [0,1]
//       const norm = (logVal - minVal) / (maxVal - minVal);
//       // 拉伸到目标区间
//       scaledData[time][area] = minTarget + norm * (maxTarget - minTarget);
//     }
//   }

//   return scaledData;
// }

