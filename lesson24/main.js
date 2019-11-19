

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
function createNoise(wh) {
  const width = wh;
  const height = wh;
  const renderTarget = new THREE.WebGLRenderTarget(width, height);
  
  // 场景
  const scene = new THREE.Scene();
  // 相机
  const camera = new THREE.PerspectiveCamera(90, 1, 1, 10);
  const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1);
  const material = perlin;
  const plane = new THREE.Mesh(geometry, material);
  plane.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    material.uniforms = Object.assign(material.uniforms, {
      u_time: { value: renderTime / 1000 },
      u_fbm: { value: controls.u_fbm },
      u_fbm_abs: { value: controls.u_fbm_abs },
      u_domain_wraping: { value: controls.u_domain_wraping },
      u_invert: { value: controls.u_invert },
      u_dry: { value: controls.u_dry },
    })
  }
  scene.add(plane);
  // 正方形边长10，fov90度，相机在在0，0，5时铺满屏幕
  camera.position.set(0, 0, 5);

  return {
    scene, camera, renderTarget, plane, width, height
  }
}
function createNormalMap(noise) {
  const width = noise.width;
  const height = noise.height;
  const texture = new THREE.DataTexture(null, width, height, THREE.RGBAFormat);

  const renderTarget = new THREE.WebGLRenderTarget(width, height);
  renderTarget.texture = texture;
  // 场景
  const scene = new THREE.Scene();
  // 相机
  const camera = new THREE.PerspectiveCamera(90, 1, 1, 10);
  const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: `
    varying vec4 v_position;
    varying vec2 v_uv;
    void main () {
      v_position = modelMatrix * vec4( position.xyz, 1.0 );
      gl_Position = projectionMatrix * viewMatrix * v_position;
      v_uv = uv;
    }
    `,
    fragmentShader: `
    uniform sampler2D u_texture;
    uniform float u_normal_calc_wh;
    varying vec2 v_uv;

    float PI = 3.1415926;
    vec3 calcNormal3 (vec2 coord, int num) {
      vec4 info = texture2D(u_texture, coord);
      vec2 delta = vec2(1.0 / u_normal_calc_wh);

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
      gl_FragColor = vec4(calcNormal3(v_uv, 8), 1.0);
    }
    `
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    material.uniforms = Object.assign(material.uniforms, {
      u_texture: {
        type: 't', value: noise.renderTarget.texture
      },
      u_normal_calc_wh: {
        value: controls.normal_calc_wh
      }
    })
  }
  scene.add(plane);
  camera.position.set(0, 0, 5);

  return {
    scene, camera, renderTarget, plane, width, height
  }
}

let noise = createNoise(1024);
let noiseNormal = createNormalMap(noise);
const material = new THREE.MeshPhysicalMaterial({
  color: 0x00456b,
  emissive: 0x0,
  roughness: 0.5,
  metalness: 0.5,
  reflectivity: 1,
  // 高度贴图
  displacementMap: noise.renderTarget.texture,
  displacementScale: 10,
  // 法线贴图
  normalMap: noiseNormal.renderTarget.texture
})

const geometry = new THREE.PlaneBufferGeometry(100, 100, 200, 200);
const plane = new THREE.Mesh(geometry, material);
plane.rotateX(-Math.PI / 2);

scene.add(plane);

// 环境光
const light = new THREE.AmbientLight(0xffffff);
scene.add(light);

// 平行光
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(100, 100, 100)
// directionalLight.target = plane;
// scene.add(directionalLight);
// var helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
// scene.add( helper );

var lights = [];
lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );

lights[ 0 ].position.set( 0, 200, 0 );
lights[ 1 ].position.set( 100, 200, 100 );
lights[ 2 ].position.set( - 100, - 200, - 100 );

scene.add( lights[ 0 ] );
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );

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

  this.color = [material.color.r * 255, material.color.g * 255, material.color.b * 255];
  this.roughness = 0.5;
  this.metalness = 0.5;
  this.reflectivity = 0.5;

  this.texture_wh = noise.width;
  this.normal_calc_wh = 64;
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
function typeChange(value) {
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

gui.addColor(controls, 'color').onChange(value => plane.material.color = {r: value[0] / 255, g: value[1] / 255, b: value[2] / 255});
gui.add(controls, 'roughness', 0.0, 1.0).onChange(value => plane.material.roughness = value);
gui.add(controls, 'metalness', 0.0, 1.0).onChange(value => plane.material.metalness = value);;
gui.add(controls, 'reflectivity', 0.0, 1.0).onChange(value => plane.material.reflectivity = value);;
gui.add(controls, 'texture_wh', [128, 256, 512, 1024]).onChange(value => {
  noise.renderTarget.setSize(value, value);
  noiseNormal.renderTarget.setSize(value, value);
});
gui.add(controls, 'normal_calc_wh', [64, 128, 256, 512, 1024]);

let renderTime = 0;
function render(time) {
  renderTime = time;
  requestAnimationFrame(render);

  renderer.setRenderTarget(noise.renderTarget);
  renderer.render(noise.scene, noise.camera);

  renderer.setRenderTarget(noiseNormal.renderTarget);
  renderer.render(noiseNormal.scene, noiseNormal.camera);

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
render();

