// src/mock/capacity.ts
/* 高峰实测密度（人/㎡）*/
export const sceneCapacity: Record<string, number> = {
  residentialArea: 0.06, // 住宅夜间几乎满：1 人 / 16 ㎡
  officeArea: 0.15, // 开放工位高峰：1 人 / 5 ㎡
  mallArea: 0.04, // 商场节假日：1 人 / 25 ㎡
  stationArea: 0.08, // 高铁/地铁大厅：1 人 / 12.5 ㎡
  educationArea: 0.02, // 中小学课间：1 人 / 25 ㎡
  mixedArea: 0.03, // 综合体平均：1 人 / 33.3 ㎡
};

//使用率
export const usageRate: Record<string, number> = {
  residentialArea: 0.6, // 住宅几乎全层可用
  officeArea: 0.7, // 办公 80 %
  mallArea: 0.6, // 商场 60 %（走廊、机房占 30 %）
  stationArea: 0.5, // 车站 60 %
  educationArea: 0.6,
  mixedArea: 0.4,
};
// 以 1000 ㎡为基准的“理论峰值”
export const maxPeople: Record<string, number> = {
  residentialArea: 2000,
  officeArea: 3000,
  mallArea: 3000,
  stationArea: 2000,
  educationArea: 1500,
  mixedArea: 2500,
};
