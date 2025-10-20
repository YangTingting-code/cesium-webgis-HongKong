import * as Cesium from 'cesium';

export async function loadOSMBuildings(viewer: Cesium.Viewer) {
  const tileset = await Cesium.createOsmBuildingsAsync()
  viewer.scene.primitives.add(tileset)

  // // 2. 调整基础渲染环境
  viewer.scene.globe.enableLighting = true
  viewer.shadows = false //模拟日照光影 光影会影响泛光的统一亮度

  // 3. 使用自定义着色器制造“流动发光”
  const customShader =
    // createBuildingGlowShader()
    new Cesium.CustomShader({
      lightingModel: Cesium.LightingModel.UNLIT, // 不使用内置光照模型
      fragmentShaderText: `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        //获取建筑当前顶点高度
        float h = fsInput.attributes.positionMC.z; //h是模型上某个像素的高度 每个像素都会执行一次这个函数

        //时间变成循环波动
        float time = fract(czm_frameNumber / 144.0); //0 到 1循环
        float wavePos = time * 220.0; //wavePos是当前光带的位置 , 300.0控制光带能上升的高度(300.0m)

        //计算片元与光带距离（越近越亮）
        float dist = abs(h - wavePos); //光带位置和像素位置之差
        float intensity = smoothstep(15.0,0.0,dist); //光带厚度 smoothstep(edge0, edge1, x) 会在 edge0 → edge1 的范围内平滑插值出一个 0→1 的渐变? 

        //计算最终发光颜色
        vec3 base = vec3(0.114,0.318,1.0); // rgba(29, 81, 253, 1)
        vec3 glow = vec3(0.0, 0.8, 1.0) * intensity; //,颜色乘以亮度因子 亮度因子为0的地方就没有光带

        material.diffuse = base + glow ; //颜色叠加
      }
    `,
    });

  tileset.customShader = customShader;

  return tileset;
}

function createBuildingGlowShader() {
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

