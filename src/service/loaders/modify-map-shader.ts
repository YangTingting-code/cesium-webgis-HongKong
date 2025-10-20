import { Viewer } from 'cesium'
import * as Cesium from 'cesium'
const filterRGB = [0.0, 50.0, 100.0]

// 用于替换的关键位置标记
const strS = "color = czm_saturation(color, textureSaturation);\n#endif\n"
let strT = "color = czm_saturation(color, textureSaturation);\n#endif\n"
strT += `
    color.r = 1.0 - color.r;
    color.g = 1.0 - color.g;
    color.b = 1.0 - color.b;
    color.r *= ${filterRGB[0].toFixed(1)} / 255.0;
    color.g *= ${filterRGB[1].toFixed(1)} / 255.0;
    color.b *= ${filterRGB[2].toFixed(1)} / 255.0;
`

// 缓存原始 shader，用于恢复
let originalShader: string | null = null

const FILTER_KEY = 'cesium_filter_enabled'

function setFilterState(isOn: boolean) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(isOn))
}

function getFilterState() {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) || 'false')
  } catch {
    return false
  }
}
//判断当前是否开启滤镜
export function isFilterActive(): boolean {
  return getFilterState()
}

/**
 * 切换过滤/恢复
 * @param viewer Cesium.Viewer
 * @param needModify 是否启用过滤
 */
export function modifyMap(viewer: Viewer, needModify: boolean) {
  const baseFragmentShader = viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources
  const lastIndex = baseFragmentShader.length - 1

  // 仅第一次缓存原始 shader
  if (!originalShader) {
    originalShader = baseFragmentShader[lastIndex]
  }

  if (needModify && originalShader) {
    // 启用过滤效果
    baseFragmentShader[lastIndex] = originalShader.replace(strS, strT)
  } else {
    // 关闭过滤，恢复原始 shader
    baseFragmentShader[lastIndex] = originalShader
  }

  if (needModify) {
    setFilterState(true)
  } else {
    setFilterState(false)
  }

  viewer.scene.requestRender()
}


export function forceReloadGlobe(viewer: Cesium.Viewer) {
  const oldGlobe = viewer.scene.globe;

  // 创建一个新的 Globe 实例，完全替代旧的
  const newGlobe = new Cesium.Globe(oldGlobe.ellipsoid);

  // 保留必要的参数
  newGlobe.enableLighting = oldGlobe.enableLighting
  newGlobe.terrainProvider = oldGlobe.terrainProvider

  // 用新的 Globe 替换旧的
  viewer.scene.globe = newGlobe;

  // 保留之前的 imagery 图层：
  const imageryLayers = oldGlobe.imageryLayers
  for (let i = 0; i < imageryLayers.length; i++) {
    newGlobe.imageryLayers.add(imageryLayers.get(i));
  }

  // 重新渲染
  viewer.scene.requestRender();
}








