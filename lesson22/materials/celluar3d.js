
import { random } from './common.js';
export default new THREE.ShaderMaterial({
  vertexShader: `
  varying vec4 v_position;
  varying vec2 v_uv;
  void main () {
    v_position = modelMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * viewMatrix * v_position;
    v_uv = uv;
  }
  `,
  fragmentShader: `
  uniform float u_time;
  uniform bool u_invert;
  uniform bool u_dry;
  varying vec4 v_position;
  varying vec2 v_uv;
  ${random}

  // 细胞噪声-3维
  float noise_celluar3 (vec3 p, bool f2) {
    vec3 i = floor(p); // 获取当前网格索引i
    vec3 f = fract(p); // 获取当前片元在网格内的相对位置
    float F1 = 1.;
    float F2 = 1.;
    // 遍历当前像素点相邻的27个网格特征点
    for (int j = -1; j <= 1; j++) {
      for (int k = -1; k <= 1; k++) {
        for (int l = -1; l <= 1; l++) {
          vec3 neighbor = vec3(float(j), float(k), float(l));
          vec3 point = random3(i + neighbor);
          float d = length(point + neighbor - f);
          if (F1 >= d) {
            F2 = F1;
            F1 = d;
          } else {
            F2 = min(F2, d);
          }
        }
      }
    }
    if (f2) {
      return F2 - F1;
    }
    return F1;
  }

  void main () {
    // 干旱
    if (u_dry) {
      gl_FragColor = vec4(vec3(noise_celluar3(vec3(v_position.xy, u_time), true)), 1.0);
    } else {
      gl_FragColor = vec4(vec3(pow(noise_celluar3(vec3(v_position.xy, u_time), false), 2.)), 1.0);
    }

    // 反色
    if (u_invert) {
      gl_FragColor.rgb = 1.0 - gl_FragColor.rgb;
    }
  }
  `
})
