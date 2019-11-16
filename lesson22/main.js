
// 场景
const scene = new THREE.Scene();
// 相机
const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 2000
);
// 渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const material = new THREE.ShaderMaterial({
  uniforms: {
    u_time: {value: 1.0}
  },
  vertexShader: `
  varying vec4 v_position;
  void main () {
    v_position = modelMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * viewMatrix * v_position;
  }
  `,
  fragmentShader: `
  varying vec4 v_position;
  uniform float u_time;

  // 输入网格顶点位置，输出随机向量
  vec2 random(vec2 p){
      return  -1.0 + 2.0 * fract(
          sin(
              vec2(
                  dot(p, vec2(127.1,311.7)),
                  dot(p, vec2(269.5,183.3))
              )
          ) * 43758.5453
      );
  }
  float noise_perlin (vec2 p) {
    vec2 i = floor(p); // 获取当前网格索引i
    vec2 f = fract(p); // 获取当前片元在网格内的相对位置
    // 计算梯度贡献值
    float a = dot(random(i),f); // 梯度向量与距离向量点积运算
    float b = dot(random(i + vec2(1., 0.)),f - vec2(1., 0.));
    float c = dot(random(i + vec2(0., 1.)),f - vec2(0., 1.));
    float d = dot(random(i + vec2(1., 1.)),f - vec2(1., 1.));
    // 平滑插值
    vec2 u = smoothstep(0.,1.,f);
    // 叠加四个梯度贡献值
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  }
  // 乘以4，叠加5次的分形噪声
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
  void main () {
    float n = fbm_noise(v_position.xy);
    gl_FragColor = vec4(n, n, n, 1.0);
  }
  `
});

const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1); 
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

function render (time) {
  plane.material.uniforms.u_time.value = time;
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
render();

