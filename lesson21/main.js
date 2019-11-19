
// 场景
const scene = new THREE.Scene();
// 相机
const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 2000
);
// 渲染器
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true

document.body.appendChild(renderer.domElement);

const material = new THREE.ShaderMaterial({
  transparent: true,
  vertexShader: `
  uniform mat4 u_face_mat;
  varying vec4 v_position;
  varying vec2 v_uv;
  void main () {
    v_position =  modelMatrix * u_face_mat * vec4( position, 1.0 );
    gl_Position = projectionMatrix * viewMatrix * v_position;
    v_uv = uv;
  }
  `,
  fragmentShader: `
  uniform float u_time;
  uniform float u_strength;
  uniform float u_speed;
  uniform float u_width;
  
  varying vec4 v_position;
  varying vec2 v_uv;

  vec2 hash( vec2 p )
  {
    p = vec2( dot(p,vec2(127.1,311.7)),
        dot(p,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }

  float noise( in vec2 p )
  {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    
    vec2 i = floor( p + (p.x+p.y)*K1 );
    
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;
    
    vec3 h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    
    vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    
    return dot( n, vec3(70.0) );
  }

  float fbm(vec2 uv)
  {
    float f;
    mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
    f  = 0.5000*noise( uv ); uv = m*uv;
    f += 0.2500*noise( uv ); uv = m*uv;
    f += 0.1250*noise( uv ); uv = m*uv;
    f += 0.0625*noise( uv ); uv = m*uv;
    f = 0.5 + 0.5*f;
    return f;
  }

  void main () {
    // vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 uv = v_uv;
    vec2 q = uv;
    q.x *= 1.0 / u_width;
    q.y *= 2.;
    // float strength = floor(q.x+1.); // 变形强度
    float strength = u_strength;
    // float T3 = max(3.,1.25*strength)*iTime; // 时间影响
    float T3 = max(3.,1.25*strength)*(u_time * u_speed / 1000.);
    // q.x = mod(q.x,1.)-0.5; // x位置
    q.x -= 0.5 / u_width;
    q.y -= 1.1;
    float n = fbm(strength*q - vec2(0,T3));
    float c = 1. - 16. * pow( max( 0., length(q*vec2(1.8+q.y*1.5,.75) ) - n * max( 0., q.y+.25 ) ),1.2 );
  //	float c1 = n * c * (1.5-pow(1.25*uv.y,4.)); // 这里可以调整显示的高度
    float c1 = n * c * (1.5-pow(1.0*uv.y,4.));
    c1=clamp(c1,0.,1.);

    vec3 col = vec3(1.5*c1, 1.5*c1*c1*c1, c1*c1*c1*c1*c1*c1);
    
    // col = col.zyx;
    // col = 0.85*col.yxz;
  // #ifdef BLUE_FLAME
  //   col = col.zyx;
  // #endif
  // #ifdef GREEN_FLAME
  //   col = 0.85*col.yxz;
  // #endif
    
    float a = c * (1.-pow(uv.y,3.));
    gl_FragColor = vec4( mix(vec3(0.),col,a), 1.0);
    gl_FragColor.a = gl_FragColor.x + gl_FragColor.y + gl_FragColor.z;
  }
  `
});

function createCandle () {
  const geometry = new THREE.PlaneBufferGeometry(10, 10, 1, 1); 
  const plane = new THREE.Mesh(geometry, material);
  plane.position.setY(3.5);
  plane.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    
    // 火是2d的，所以侧面看不到，调整Y轴面向摄像机
    const v = new THREE.Vector3().subVectors(camera.position, plane.position);
    v.setY(0);
    v.normalize();
    const n = new THREE.Vector3(0, 0, 1);
    let angle = Math.acos(n.dot(v));
    if (v.x < 0) {
      angle *= -1;
    }
    var face_mat = new THREE.Matrix4();
    face_mat.makeRotationY(angle);

    material.uniforms = Object.assign(material.uniforms, {
      u_time: {value: renderTime},
      u_strength: {value: controls.strength},
      u_speed: {value: controls.speed},
      u_width: {value: controls.width},
      u_face_mat: {value: face_mat}
    })
  }

  // 点光源
  var light = new THREE.PointLight( 0xcccccc, 1, 30);
  light.position.set(0, 3, 0);
  // 阴影
  light.castShadow = true
  light.shadow.mapSize.width = 1024
  light.shadow.mapSize.height = 1024
  plane.add( light );

  // 装模作样弄个柱子
  const cylinderGeometry = new THREE.CylinderBufferGeometry( 0.3, 0.3, 6, 32 );
  const cylinderMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x0,
    roughness: 1,
    metalness: 0,
    reflectivity: 1
  });
  const cylinder = new THREE.Mesh( cylinderGeometry, cylinderMaterial );
  cylinder.position.setY(3);
  cylinder.castShadow = true;
  cylinder.add(plane);
  return cylinder;
}

const candle = createCandle();
candle.position.setX(-8);
scene.add(candle);
const candle2 = createCandle();
candle2.position.setX(8);
scene.add(candle2);

// 地板
const floorGeometry = new THREE.PlaneBufferGeometry(100, 100, 1, 1);
const floorMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  emissive: 0x0,
  roughness: 1,
  metalness: 0,
  reflectivity: 1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true
floor.rotateX(-Math.PI / 2);
scene.add(floor);

camera.position.set(0, 20, 30);
const target = new THREE.Vector3(0, 0, 0);
camera.lookAt(target);

// gui
const gui = new dat.GUI()
const controls = new function () {
  this.strength = 3;
  this.speed = 1;
  this.width = 0.2;
}
gui.add(controls, 'strength', 0.1, 10).step(0.1);
gui.add(controls, 'speed', 0.1, 2).step(0.1);
gui.add(controls, 'width', 0.1, 2).step(0.1);

import addViewEvent from './view.js';
addViewEvent(renderer.domElement, camera, new THREE.Vector3(0, 0, 0));

let renderTime = 0;
function render (time) {
  renderTime = time;
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
render();

