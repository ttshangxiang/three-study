// 场景
const scene = new THREE.Scene()
// 相机
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
)
// 渲染器
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.appendChild(renderer.domElement)

// 形状
const geometry = new THREE.BoxGeometry(1, 1, 1)
// 素材
// const material = new THREE.MeshBasicMaterial({color: 0x00ff00})
// 受光影响的材质
const material = new THREE.MeshPhongMaterial({color: 0x00ff00})
// 物体 = 形状 + 素材
const cube = new THREE.Mesh(geometry, material)
// 添加物体
scene.add(cube)

// 光
const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

// 设置摄像机高度
camera.position.z = 10
// 渲染方法
function render () {
  // 动画方法，60帧递归调用
  requestAnimationFrame(render)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  // 渲染器执行
  renderer.render(scene, camera)
}
// 执行渲染方法
render()
