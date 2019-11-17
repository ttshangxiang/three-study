
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
  uniform bool u_fbm;
  uniform bool u_fbm_abs;
  varying vec4 v_position;
  varying vec2 v_uv;
  ${random}

  // 时间作为3维的柏林噪声
  float noise_perlin3 (vec3 p) {
    vec3 i = floor(p);
    vec3 s = fract(p);

    // 3D网格有8个顶点
    float a = dot(random3v(i),s);
    float b = dot(random3v(i + vec3(1, 0, 0)),s - vec3(1, 0, 0));
    float c = dot(random3v(i + vec3(0, 1, 0)),s - vec3(0, 1, 0));
    float d = dot(random3v(i + vec3(0, 0, 1)),s - vec3(0, 0, 1));
    float e = dot(random3v(i + vec3(1, 1, 0)),s - vec3(1, 1, 0));
    float f = dot(random3v(i + vec3(1, 0, 1)),s - vec3(1, 0, 1));
    float g = dot(random3v(i + vec3(0, 1, 1)),s - vec3(0, 1, 1));
    float h = dot(random3v(i + vec3(1, 1, 1)),s - vec3(1, 1, 1));

    // Smooth Interpolation
    vec3 u = smoothstep(0.,1.,s);

    // 根据八个顶点进行插值
    return mix(mix(mix( a, b, u.x),
                mix( c, e, u.x), u.y),
            mix(mix( d, f, u.x),
                mix( g, h, u.x), u.y), u.z);
  }

  // fbm 乘以4，叠加5次的分形噪声
  float fbm_noise(vec3 p)
  {
    float f = 0.0;
    p = p * 4.0;
    float a = 1.;
    for (int i = 0; i < 5; i++)
    {
      f += a * noise_perlin3(p);
      p = 4.0 * p;
      a /= 4.;
    }
    return f;
  }

  // Turbulence 乘以4，叠加5次的分形噪声，
  float fbm_noise_abs(vec3 p)
  {
    float f = 0.0;
    p = p * 4.0;
    float a = 1.;
    for (int i = 0; i < 5; i++)
    {
      f += a * abs(noise_perlin3(p));
      p = 4.0 * p;
      a /= 4.;
    }
    return f;
  }

  void main () {
    vec3 p = vec3(v_uv, u_time / 10.0);
    float n;
    if (u_fbm) {
      n = fbm_noise(p);
    } else if (u_fbm_abs) {
      n = fbm_noise_abs(p);
    } else {
      n = noise_perlin3(vec3(p.xy * 4.0, u_time));
    }
    gl_FragColor = vec4(vec3(n), 1.0);
    if (u_fbm_abs) {
      // 红色
      gl_FragColor.rgb = vec3(1.5*n, 1.5*n*n*n, n*n*n*n*n*n);
    }
  }
  `
})
