
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
  uniform bool u_domain_wraping;
  varying vec4 v_position;
  varying vec2 v_uv;
  ${random}

  float noise_perlin (vec2 p) {
    vec2 i = floor(p); // 获取当前网格索引i
    vec2 f = fract(p); // 获取当前片元在网格内的相对位置
    // 计算梯度贡献值
    float a = dot(random2v(i),f); // 梯度向量与距离向量点积运算
    float b = dot(random2v(i + vec2(1., 0.)),f - vec2(1., 0.));
    float c = dot(random2v(i + vec2(0., 1.)),f - vec2(0., 1.));
    float d = dot(random2v(i + vec2(1., 1.)),f - vec2(1., 1.));
    // 平滑插值
    vec2 u = smoothstep(0.,1.,f);
    // 叠加四个梯度贡献值
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  }

  // fbm 乘以4，叠加5次的分形噪声
  float fbm_noise(vec2 p)
  {
    float f = 0.0;
    p = p * 4.0;
    float a = 1.;
    for (int i = 0; i < 5; i++)
    {
      f += a * noise_perlin(p);
      p = 4.0 * p;
      a /= 4.;
    }
    return f;
  }

  // Turbulence 乘以4，叠加5次的分形噪声，
  float fbm_noise_abs(vec2 p)
  {
    float f = 0.0;
    p = p * 4.0;
    float a = 1.;
    for (int i = 0; i < 5; i++)
    {
      f += a * abs(noise_perlin(p));
      p = 4.0 * p;
      a /= 4.;
    }
    return f;
  }

  // 翘曲域
  // 翘曲域噪声用来模拟卷曲、螺旋状的纹理，比如烟雾、大理石等，实现公式如下：
  // f(p) = fbm( p + fbm( p + fbm( p ) ) )
  float domain_wraping( vec2 p )
  {
    vec2 q = vec2(fbm_noise(p));
    vec2 r = vec2(fbm_noise(p + q));
    return fbm_noise( p + r );
  }

  void main () {
    float n;
    if (u_fbm) {
      n = fbm_noise(v_uv);
    } else if (u_fbm_abs) {
      n = fbm_noise_abs(v_uv);
    } else if (u_domain_wraping) {
      n = domain_wraping(v_uv);
    } else {
      n = noise_perlin(v_uv * 4.0);
    }
    gl_FragColor = vec4(vec3(n), 1.0);
  }
  `
})
