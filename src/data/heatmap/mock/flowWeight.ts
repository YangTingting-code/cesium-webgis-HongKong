// ← 时段潮汐权重表 潮汐系数
export const sceneFlow: Record<string, Record<string, number>> = {
  residentialArea: {
    night: 0.9, //00:00–06:00 [0,6) 5h
    earlyMorning: 0.8, //06:00–08:00 [6,8) 2h
    morning: 0.7, // 08:00–10:00 [8,10) 2h
    lunch: 0.4, //10:00–14:00 [10,14) 4h
    afternoon: 0.4, //14:00–17:00 [14,17) 3h
    evening: 0.6, // 17:00–20:00 [17,20) 3h
    lateEvening: 0.8, //20:00–24:00 [20,24] 5h
  },
  officeArea: {
    night: 0.0,
    earlyMorning: 0.2,
    morning: 0.7,
    lunch: 0.6,
    afternoon: 0.8,
    evening: 0.3,
    lateEvening: 0.1,
  },
  mallArea: {
    night: 0.0,
    earlyMorning: 0.1,
    morning: 0.3,
    lunch: 0.6,
    afternoon: 0.4,
    evening: 0.8,
    lateEvening: 0.4,
  },
  stationArea: {
    night: 0.1,
    earlyMorning: 0.2,
    morning: 0.8,
    lunch: 0.4,
    afternoon: 0.4,
    evening: 0.8,
    lateEvening: 0.4,
  },
  educationArea: {
    night: 0.1,
    earlyMorning: 0.2,
    morning: 0.5,
    lunch: 0.4,
    afternoon: 0.5,
    evening: 0.3,
    lateEvening: 0.2,
  },
  mixedArea: {
    night: 0.1,
    earlyMorning: 0.2,
    morning: 0.5,
    lunch: 0.5,
    afternoon: 0.6,
    evening: 0.5,
    lateEvening: 0.2,
  },
};

//2
/* export const sceneFlow: Record<string, Record<string, number>> = {
  residentialArea: { night: 0.9, earlyMorning: 0.6, morning: 0.7, lunch: 0.4, afternoon: 0.5, evening: 0.7, lateEvening: 0.8 },
  officeArea: { night: 0.05, earlyMorning: 0.3, morning: 0.95, lunch: 0.85, afternoon: 0.95, evening: 0.4, lateEvening: 0.1 },
  mallArea: { night: 0.05, earlyMorning: 0.2, morning: 0.6, lunch: 0.9, afternoon: 0.7, evening: 0.95, lateEvening: 0.6 },
  stationArea: { night: 0.1, earlyMorning: 0.4, morning: 0.8, lunch: 0.7, afternoon: 0.8, evening: 0.9, lateEvening: 0.6 },
  educationArea: { night: 0.1, earlyMorning: 0.5, morning: 0.9, lunch: 0.9, afternoon: 0.9, evening: 0.3, lateEvening: 0.2 },
  mixedArea: { night: 0.1, earlyMorning: 0.3, morning: 0.6, lunch: 0.7, afternoon: 0.6, evening: 0.7, lateEvening: 0.4 }
}; */

/* export const sceneFlow: Record<string, Record<string, number>> = {
  residentialArea: { night: 0.9, earlyMorning: 0.6, morning: 0.7, lunch: 0.4, afternoon: 0.5, evening: 0.7, lateEvening: 0.8 },
  officeArea: { night: 0.05, earlyMorning: 0.3, morning: 0.95, lunch: 0.85, afternoon: 0.95, evening: 0.4, lateEvening: 0.1 },
  mallArea: { night: 0.05, earlyMorning: 0.2, morning: 0.6, lunch: 0.8, afternoon: 0.6, evening: 0.85, lateEvening: 0.6 },
  stationArea: { night: 0.1, earlyMorning: 0.4, morning: 0.8, lunch: 0.7, afternoon: 0.8, evening: 0.9, lateEvening: 0.6 },
  educationArea: { night: 0.1, earlyMorning: 0.5, morning: 0.9, lunch: 0.9, afternoon: 0.9, evening: 0.3, lateEvening: 0.2 },
  mixedArea: { night: 0.1, earlyMorning: 0.3, morning: 0.6, lunch: 0.7, afternoon: 0.6, evening: 0.7, lateEvening: 0.4 }
}; */

/* export const sceneFlow: Record<string, Record<string, number>> = {
  residentialArea: { night: 0.9, earlyMorning: 0.6, morning: 0.4, lunch: 0.4, afternoon: 0.4, evening: 0.6, lateEvening: 0.8 },
  officeArea: { night: 0.05, earlyMorning: 0.3, morning: 0.8, lunch: 0.7, afternoon: 0.8, evening: 0.4, lateEvening: 0.1 },
  mallArea: { night: 0.05, earlyMorning: 0.1, morning: 0.4, lunch: 0.5, afternoon: 0.6, evening: 0.8, lateEvening: 0.6 },
  stationArea: { night: 0.1, earlyMorning: 0.4, morning: 0.6, lunch: 0.5, afternoon: 0.5, evening: 0.8, lateEvening: 0.7 },
  educationArea: { night: 0.1, earlyMorning: 0.5, morning: 0.7, lunch: 0.8, afternoon: 0.7, evening: 0.3, lateEvening: 0.3 },
  mixedArea: { night: 0.1, earlyMorning: 0.2, morning: 0.4, lunch: 0.5, afternoon: 0.5, evening: 0.5, lateEvening: 0.3 }
}; */
