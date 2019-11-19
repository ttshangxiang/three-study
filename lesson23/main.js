

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

// 创建噪声纹理
import perlin from '../lesson22/materials/perlin.js';
import perlin3d from '../lesson22/materials/perlin3d.js';
import celluar from '../lesson22/materials/celluar.js';
import celluar3d from '../lesson22/materials/celluar3d.js';
function createNoise () {
  const width = 512;
  const height = 512;
  const texture = new THREE.DataTexture(null, width, height, THREE.RGBAFormat);

  const renderTarget = new THREE.WebGLRenderTarget(width, height);
  renderTarget.texture = texture;
  // 场景
  const scene = new THREE.Scene();
  // 相机
  const camera = new THREE.PerspectiveCamera(90, 1, 1, 10);
  const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1);
  const material = perlin;
  const plane = new THREE.Mesh(geometry, material);
  plane.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    material.uniforms = Object.assign(material.uniforms, {
      u_time: {value: renderTime / 1000},
      u_fbm: {value: controls.u_fbm},
      u_fbm_abs: {value: controls.u_fbm_abs},
      u_domain_wraping: {value: controls.u_domain_wraping},
      u_invert: {value: controls.u_invert},
      u_dry: {value: controls.u_dry},
    })
  }
  scene.add(plane);
  camera.position.set(0, 0, 5);

  return {
    scene, camera, renderTarget, plane
  }
}
const noise = createNoise();

const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib[ "lights" ], {
  u_texture: {
    type: 't', value: null
  },
  u_color: {
    value: new THREE.Color(0x00456b)
  }
}]);
const material = new THREE.ShaderMaterial({
  lights: true,
  uniforms: uniforms,
  vertexShader: `
  uniform sampler2D u_texture;

  varying vec4 v_position;
  varying vec2 v_uv;
  void main () {

    // 根据噪声计算高度
    vec4 info = texture2D(u_texture, uv);
    float h = info.r * 10.0;

    v_position = modelMatrix * vec4( position.xy, position.z + h, 1.0 );
    gl_Position = projectionMatrix * viewMatrix * v_position;
    v_uv = uv;
  }
  `,
  fragmentShader: `
  struct DirectionalLight {
    vec3 direction;
    vec3 color;
    int shadow;
    float shadowBias;
    float shadowRadius;
    vec2 shadowMapSize;
  };
  uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
  uniform sampler2D u_texture;
  uniform vec3 u_color;
  
  // 死活不起效？
  // 在低于3.0的着色器版本中,您不能在循环条件下使用统一变量?
  uniform int u_normal_precision;

  // 用threejs的默认光线，它已经乘了viewMatrix，需要用逆矩阵，也就是相机矩阵还原。
  // 而且已经是光线的反向了
  uniform mat4 u_cameraMatrix;

  varying vec4 v_position;
  varying vec2 v_uv;

  vec3 calcNormal (vec2 coord) {
    vec4 info = texture2D(u_texture, coord);
    vec2 delta = vec2(1.0 / 512.0);
    vec3 dx = vec3(delta.x, texture2D(u_texture, vec2(coord.x + delta.x, coord.y)).r - info.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(u_texture, vec2(coord.x, coord.y + delta.y)).r - info.r, delta.y);
    vec3 normal = normalize(cross(dy, dx));
    return normal;
  }

  vec3 calcNormal2 (vec2 coord) {
    vec4 info = texture2D(u_texture, coord);
    vec2 delta = vec2(1.0 / 512.0);

    vec3 dx = vec3(delta.x, texture2D(u_texture, vec2(coord.x + delta.x, coord.y)).r - info.r, 0.0);
    vec3 dx2 = vec3(-delta.x, texture2D(u_texture, vec2(coord.x - delta.x, coord.y)).r - info.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(u_texture, vec2(coord.x, coord.y + delta.y)).r - info.r, delta.y);
    vec3 dy2 = vec3(0.0, texture2D(u_texture, vec2(coord.x, coord.y - delta.y)).r - info.r, -delta.y);
    vec3 normal = normalize(cross(dy, dx));
    vec3 normal2 = normalize(cross(dx, dy2));
    vec3 normal3 = normalize(cross(dy2, dx2));
    vec3 normal4 = normalize(cross(dx2, dy));
    return normalize(normal + normal2 + normal3 + normal4);
  }

  float PI = 3.1415926;
  vec3 calcNormal3 (vec2 coord, int num) {
    vec4 info = texture2D(u_texture, coord);
    vec2 delta = vec2(1.0 / 100.0);

    vec3 normal = vec3(0.0);
    vec3 first;
    vec3 prev;
    for (int i = 0; i < 999; i++) {
      if (i >= num) {
        break;
      }
      float x = sin(float(i) * 2.0 * PI / float(num)) * delta.x;
      float z = cos(float(i) * 2.0 * PI / float(num)) * delta.y;
      vec3 d = vec3(x, texture2D(u_texture, vec2(coord.x + x, coord.y + z)).r - info.r, z);
      if (i > 0) {
        normal += normalize(cross(prev, d));
        prev = d;
      } else {
        first = d;
      }
    }
    normal += normalize(cross(prev, first));
    return normalize(normal);
  }

  void main () {

    // 环境光
    vec3 ambientColor = vec3(0.4);
    vec3 ambient = ambientColor * u_color.rgb;

    // 根据噪声计算法向量
    vec3 normal = calcNormal3(v_uv, 8);

    // 漫反射
    vec3 diffuse = vec3(0.0);
    // 高光
    vec3 specular = vec3(0.0);
    float u_shininess = 50.0;
    vec3 surfaceToCamera = normalize(cameraPosition - v_position.xyz);
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
      vec3 direction = mat3(u_cameraMatrix) * directionalLights[i].direction;
      float ndotl = clamp(dot(normal, direction), 0.0, 1.0);
      diffuse += directionalLights[i].color * u_color.rgb * ndotl;

      vec3 halfVector = normalize(direction + surfaceToCamera);
      specular += pow(clamp(dot(normal, halfVector), 0.0, 1.0), u_shininess) * vec3(1.0);
    }

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);

  }
  `
})

const geometry = new THREE.PlaneBufferGeometry(100, 100, 100, 100);
const plane = new THREE.Mesh(geometry, material);
plane.rotateX(-Math.PI / 2);
plane.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
  material.uniforms.u_texture.value = noise.renderTarget.texture;
  material.uniforms.u_cameraMatrix = {value: camera.matrixWorld};
  material.uniforms.u_normal_precision = {value: controls.u_normal_precision};
}
scene.add(plane);

// 平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(100, 100, 100)
directionalLight.target = plane;
scene.add(directionalLight);
// var helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
// scene.add( helper );

const target = new THREE.Vector3(0, 10, 0);
camera.position.set(0, 100, 100);
camera.lookAt(target);

import addViewEvent from '../lesson21/view.js';
addViewEvent(renderer.domElement, camera, target);


// gui
const gui = new dat.GUI()
const controls = new function () {
  this.type = 'perlin';
  this.u_fbm = false;
  this.u_fbm_abs = false;
  this.u_domain_wraping = false;
  this.u_invert = false;
  this.u_dry = false;
  this.u_normal_precision = 8;
}
gui.add(controls, 'type', [
  'perlin',
  'perlin-fbm',
  'perlin-fbm-abs',
  'perlin-domain-wraping',
  'perlin3d',
  'perlin3d-fbm',
  'perlin3d-fbm-abs',
  'perlin3d-domain-wraping',
  'celluar',
  'celluar-invert',
  'celluar-dry',
  'celluar3d',
  'celluar3d-invert',
  'celluar3d-dry'
]).onChange(typeChange)
function typeChange (value) {
  if (['perlin', 'perlin-fbm', 'perlin-fbm-abs', 'perlin-domain-wraping'].includes(value)) {
    noise.plane.material = perlin;
    controls.u_fbm = false;
    controls.u_fbm_abs = false;
    controls.u_domain_wraping = false;
    if (value == 'perlin-fbm') {
      controls.u_fbm = true;
    }
    if (value == 'perlin-fbm-abs') {
      controls.u_fbm_abs = true;
    }
    if (value == 'perlin-domain-wraping') {
      controls.u_domain_wraping = true;
    }
  }
  if (['perlin3d', 'perlin3d-fbm', 'perlin3d-fbm-abs', 'perlin3d-domain-wraping'].includes(value)) {
    noise.plane.material = perlin3d;
    controls.u_fbm = false;
    controls.u_fbm_abs = false;
    controls.u_domain_wraping = false;
    if (value == 'perlin3d-fbm') {
      controls.u_fbm = true;
    }
    if (value == 'perlin3d-fbm-abs') {
      controls.u_fbm_abs = true;
    }
    if (value == 'perlin3d-domain-wraping') {
      controls.u_domain_wraping = true;
    }
  }
  if (['celluar', 'celluar-invert', 'celluar-dry'].includes(value)) {
    noise.plane.material = celluar;
    controls.u_invert = false;
    controls.u_dry = false;
    if (value == 'celluar-invert') {
      controls.u_invert = true;
    }
    if (value == 'celluar-dry') {
      controls.u_dry = true;
    }
  }
  if (['celluar3d', 'celluar3d-invert', 'celluar3d-dry'].includes(value)) {
    noise.plane.material = celluar3d;
    controls.u_invert = false;
    controls.u_dry = false;
    if (value == 'celluar3d-invert') {
      controls.u_invert = true;
    }
    if (value == 'celluar3d-dry') {
      controls.u_dry = true;
    }
  }
} 
// gui.add(controls, 'u_normal_precision', 4, 32).step(1);

let renderTime = 0;
function render(time) {
  renderTime = time;
  requestAnimationFrame(render);

  renderer.setRenderTarget(noise.renderTarget);
  renderer.render(noise.scene, noise.camera);
  
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
render();

