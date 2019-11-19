
import perlin from './materials/perlin.js';
import perlin3d from './materials/perlin3d.js';
import celluar from './materials/celluar.js';
import celluar3d from './materials/celluar3d.js';

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

const material = perlin;
const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1); 
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

camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

// gui
const gui = new dat.GUI()
const controls = new function () {
  this.type = 'perlin';
  this.u_fbm = false;
  this.u_fbm_abs = false;
  this.u_domain_wraping = false;
  this.u_invert = false;
  this.u_dry = false;
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
    plane.material = perlin;
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
    plane.material = perlin3d;
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
    plane.material = celluar;
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
    plane.material = celluar3d;
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

let renderTime = 0;
function render (time) {
  renderTime = time;
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
render();

