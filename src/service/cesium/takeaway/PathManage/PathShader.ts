//将来 已经过
export const futurePathShaderSource = `
  uniform vec4 color;               //传入颜色
  uniform float percent;           // 光带长度比例 (米数/总长)

    czm_material czm_getMaterial(czm_materialInput materialInput){
      vec4 outColor = color;
      czm_material material = czm_getDefaultMaterial(materialInput);

      vec2 st = materialInput.st;

      // =====================
      // 1. 基础轨迹 (全程均匀 + 呼吸)
      // =====================
      float time = fract(czm_frameNumber / 144.0); // [0.0 - 1.0)
      // float timePow = pow(time,0.1);
      float startPosition = time;

      outColor.a = 0.0; //默认透明度为0

      float stS = fract(st.s - startPosition + 1.0); //环形 首尾相连 计算像素与开始发光的地方的相对位置

      // if(stS < percent){
        // outColor.a = 1.0 - stS / percent;
      // }

      outColor.a = (1.0 - stS / percent) * step(stS, percent); //stS < percent 返回1

      material.diffuse = czm_gammaCorrect(outColor.rgb);
      material.alpha = outColor.a; 
    
      return material;
  }
`

//当前
export const pathShaderSource = `
  uniform float progress;          // 光带中心 (0~1)
  uniform float percent;           // 光带长度比例 (米数/总长)

  czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // =====================
    // 1. 基础轨迹 (全程均匀 + 呼吸)
    // =====================
    float time = fract(czm_frameNumber / 144.0);

    // 呼吸脉冲，整条线亮度上下浮动 0.7~1.0
    float breathe = 0.9 + 0.3 * sin(time * 1.5); 
    
    // 统一的青绿底色（不随 st.s 改变，保持亮度均匀）
    vec3 trailColor = vec3(0.0, 0.8, 0.5) * breathe;

    // =====================
    // 2. 动态光带 (骑手当前位置)
    // =====================
    float dist = abs(st.s - progress);
    float halfLen = percent / 2.0; //表示光带长度的一般 这样能让光带在骑手两侧各是0.1

    float intensity = smoothstep(halfLen, 0.0, dist);
    // float intensity = exp(-pow(dist / halfLen, 2.0));
    // float pulse = 0.75 + 0.25 * sin(time * 2.5 + st.s * 8.0);
    float pulse = 0.8 + 0.2 * sin(time * 3.0); // 不加 st.s，脉冲更集中在骑手位置
    vec3 glowColor = vec3(0.0, 1.0, 0.9) * intensity * pulse; // 电光蓝青

    // =====================
    // 3. 合成颜色
    // =====================
    vec3 finalColor = trailColor + glowColor;
    
    material.diffuse = czm_gammaCorrect(finalColor);
    material.alpha = 0.7; 
    // material.alpha = clamp(0.55 + 0.45 * intensity, 0.55, 1.0);

    return material;
  }
`
