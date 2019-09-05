

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
const scene = new THREE.Scene()

camera.position.set(0, 0, 5000)

// gui
// const gui = new dat.GUI()
// const controls = new function () {
//   this.a = 1
// }
// gui.add(controls, 'a', 0, 1)

// stats
const stats = initStats()

// 调整视野
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js'
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = new THREE.Vector3(0, 0, 0)
const clock = new THREE.Clock()

// 加载字体
function loadFont() {
  const loader = new THREE.FontLoader()
  return new Promise((resolve, reject) => {
    loader.load('../node_modules/three/examples/fonts/optimer_bold.typeface.json', font => {
      resolve(font)
    }, progress => {
    }, err => {
      reject(err)
    })
  })
}

// 创建贴图
function createLightMateria() {
  let canvasDom = document.createElement('canvas');
  canvasDom.width = 16;
  canvasDom.height = 16;
  let ctx = canvasDom.getContext('2d');
  //根据参数确定两个圆的坐标，绘制放射性渐变的方法，一个圆在里面，一个圆在外面
  let gradient = ctx.createRadialGradient(
    canvasDom.width / 2,
    canvasDom.height / 2,
    0,
    canvasDom.width / 2,
    canvasDom.height / 2,
    canvasDom.width / 2);
  //设置偏移值和颜色值

  //蓝色
  /*
    gradient.addColorStop(0,'rgba(255,255,255,1)');
    gradient.addColorStop(0.2,'rgba(0,255,255,1)');
    gradient.addColorStop(0.4,'rgba(0,0,64,1)');
    gradient.addColorStop(1,'rgba(0,0,0,1)');
   */

  //红色

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,182,193,1)');
  gradient.addColorStop(0.4, 'rgba(64,0,0,1)');
  gradient.addColorStop(1, 'rgba(0,0,0,1)');


  // gradient.addColorStop(0,'rgba(255,255,255,1)');
  // gradient.addColorStop(0.005,'rgba(139,69,19,1)');
  // gradient.addColorStop(0.4,'rgba(139,69,19,1)');
  // gradient.addColorStop(1,'rgba(0,0,0,1)');

  //设置ctx为渐变色
  ctx.fillStyle = gradient;
  //绘图
  ctx.fillRect(0, 0, canvasDom.width, canvasDom.height);

  //贴图使用
  let texture = new THREE.Texture(canvasDom);
  texture.needsUpdate = true;//使用贴图时进行更新
  return texture;
}

// 创建形状
async function createGeometry() {
  const font = await loadFont()
  const fontOptions = {
    font: font,
    size: 1000,
    height: 20,
    fontWeight: 'bold',
    curveSegments: 12,  //number of points on the curves
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 8,
    bevelSegments: 5
  }
  let geometry = new THREE.TextGeometry('ttsxnb', fontOptions)
  geometry.center()
  geometry.computeBoundingBox()
  geometry.morphAttributes = {}

  return geometry

}

const starsMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 80,
  transparent: true,//使材质透明
  blending: THREE.AdditiveBlending,//Blending is the stage of OpenGL rendering pipeline that takes the fragment color outputs from the Fragment Shader and combines them with the colors in the color buffers that these outputs map to.
  depthTest: false,//深度测试关闭，不消去场景的不可见面
  map: createLightMateria()
})

let animate = () => {}
async function createAnimatePoints (speedX, speedY, speedZ) {
  const geometry = await createGeometry()
  const animateGeometry = new THREE.Geometry()
  animateGeometry.morphAttributes = {}
  // 运动点
  const animateP = []
  // 原始点
  const originP = geometry.vertices.map(item => {
    animateP.push(geometry.boundingBox.min.clone())
    return item.clone()
  })
  animateGeometry.vertices = animateP
  const starField = new THREE.Points(animateGeometry, starsMaterial)
  scene.add(starField)
  animate = function () {
    animateGeometry.vertices.forEach((item, index) => {
      const o = originP[index]

      // 网上的算法，精华就这几句
      let distance = Math.abs(item.x - o.x) + Math.abs(item.y - o.y) + Math.abs(item.z - o.z);
      if (distance > 1){
          //利用距离与坐标差的余弦值
          item.x += ((o.x - item.x)/distance) * speedX * (1 - Math.random());
          item.y += ((o.y - item.y)/distance) * speedY * (1 - Math.random());
          item.z += ((o.z - item.z)/distance) * speedZ * (1 - Math.random());
      }
    })
    animateGeometry.verticesNeedUpdate = true
  }
}

createAnimatePoints(1000, 1000, 1000)

// render
function render() {
  const delta = clock.getDelta()
  orbitControls.update(delta)
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  stats.update()
  animate()
}

render()
