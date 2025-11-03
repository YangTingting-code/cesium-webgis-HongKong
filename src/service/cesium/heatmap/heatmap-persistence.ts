//步骤 1：新建 ScenePersistence.ts（封装 localStorage）
//把所有 localStorage.get/set/remove 集中起来，行为不变，调用点简化。
// 会话态 和 长期态，现在统一修改成会话态
type Json = any //这是什么? 返回任意

//读取 
const read = (key: string): Json => {
  try {
    const raw = sessionStorage.getItem(key)
    // const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const readLocal = (key: string): Json => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
//写
const write = (key: string, value: Json) => {
  sessionStorage.setItem(key, JSON.stringify(value))
}
const writeLocal = (key: string, value: Json) => {
  localStorage.setItem(key, JSON.stringify(value))
}
//删除
const del = (key: string) => {
  sessionStorage.removeItem(key)
}

const delLocal = (key: string) => {
  localStorage.removeItem(key)
}

export const heatmapPersistence = {
  //保存配置（长期保存） 数据回显到控制面板上面
  getOption() {
    return readLocal('heatmapOption')
  },
  saveOpion(val: Json) {
    writeLocal('heatmapOption', val)
  },
  removeOption() {
    delLocal('heatmapOption')
  },

  getLocalRamp() {
    return readLocal('heatmapRamp')
  },
  saveLocalRamp(val: Json) {
    writeLocal('heatmapRamp', val)
  },


  getHeatmapRegions() {
    return read('heatmapRegions')
  },
  setHeatmapRegions(val: Json) {
    write('heatmapRegions', val)
  },

  //热力图标记
  getIsHeatmap() {
    return read('heatmapVisited')
  },
  setIsHeatmap(val: Json) {
    write('heatmapVisited', val)
  },

  //得到上次会话状态的options
  getLastOption() {
    return read('lastOption')
  },
  setLastOption(val: Json) {

    write('lastOption', val)
  },

  //相机
  getCameraBeforeReload() {
    return read('cameraBeforeReload')
  },
  setCameraBeforeReload(val: Json) {
    write('cameraBeforeReload', val)
  },
  removeCameraBeforeReload() {
    del('cameraBeforeReload')
  },

  //保存选择的色带
  //得到保存的色带
  getRamp() {
    return read('lastRamp')
  },
  setRamp(val: Json) {
    write('lastRamp', val)
  },

  //保存颜色
  getGradient() {
    return read('lastGradient')
  },
  setGradient(val: Json) {
    write('lastGradient', val)
  },


  //清空热力图清除会话状态
  clearSessionKeys() {
    del('lastGradient')
    del('lastRamp')
    del('cameraBeforeReload')
    del('lastOption')
    del('heatmapVisited')
    del('heatmapRegions')
  }

}