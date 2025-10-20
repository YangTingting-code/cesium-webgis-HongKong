// src/services/OSM/BuildingShader.ts
import * as Cesium from "cesium";

/**
 * 创建一个带颜色分类 + 发光光带的着色器
 */

export function createBuildingGlowShader() {
  return new Cesium.CustomShader({
    lightingModel: Cesium.LightingModel.UNLIT,

    uniforms: {
      u_timeSpeed: {
        type: Cesium.UniformType.FLOAT,
        value: 200.0,
      },
      u_glowRange: {
        type: Cesium.UniformType.FLOAT,
        value: 15.0,
      },
      u_heightRange: {
        type: Cesium.UniformType.FLOAT,
        value: 300.0,
      },
    },

    fragmentShaderText: `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        float h = fsInput.attributes.positionMC.z;
        float time = fract(czm_frameNumber / u_timeSpeed);
        float wavePos = time * u_heightRange;

        float dist = abs(h - wavePos);
        float glowIntensity = smoothstep(u_glowRange, 0.0, dist);

        float id = fsInput.attributes.featureId_0;
        vec3 baseColor = vec3(1.0);

        if (mod(id, 4.0) < 1.0) baseColor = vec3(1.0, 0.5, 0.0);
        else if (mod(id, 4.0) < 2.0) baseColor = vec3(0.2, 0.6, 1.0);
        else if (mod(id, 4.0) < 3.0) baseColor = vec3(0.2, 0.9, 0.6);
        else baseColor = vec3(0.8, 0.2, 0.3);

        vec3 glowColor = vec3(0.0, 1.0, 1.0) * glowIntensity;
        material.diffuse = baseColor + glowColor;
        material.alpha = 1.0;
      }
    `,
  });
}

