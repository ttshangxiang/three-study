const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 1000
)

// 初始摄像机位置
camera.position.set(0, 10, 0)
// lookAt的半径
const R = 10
let lookAtParam = [0, R, -1 * R]
camera.lookAt(...lookAtParam)

const scene = new THREE.Scene()

// 天空是个球
const skyGeometry = new THREE.SphereGeometry(500, 32, 32)
const skyMaterial = new THREE.MeshBasicMaterial({color: 0xffff00})
skyMaterial.side = THREE.DoubleSide
const sky = new THREE.Mesh(skyGeometry, skyMaterial)

scene.add(sky)

// 地面是块板
const floorGeometry = new THREE.CircleGeometry(500, 32)
const floorMaterial = new THREE.MeshBasicMaterial({color: 0xcccccc})
floorMaterial.side = THREE.DoubleSide
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
// 地板沿x轴偏移90度
floor.rotateX(90 * Math.PI / 180)
scene.add(floor)

// 参照物
const CubeGeometry = new THREE.BoxGeometry(100, 100, 100)
const CubeMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00})
const cube = new THREE.Mesh(CubeGeometry, CubeMaterial)
cube.position.set(0, 50, -400)
scene.add(cube)

function addEvent () {
  const dom = window
  let offsetX = 0;
  let offsetY = 0;
  let _x;
  let _y;
  dom.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    const {pageX, pageY} = e
    _x = pageX
    _y = pageY
    lookAtParam0 = lookAtParam
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
  }
  function mousemove (e) {
    const {pageX, pageY} = e
    // 增量
    const x = offsetX + pageX - _x
    const y_r = offsetY + pageY - _y
    // y轴的坐标与three坐标相反
    const y = -1 * y_r
    // 最终点与原始点滑动的弧度
    const arc = Math.atan2(y, x)
    // 最终点与原始点的长度
    const l = Math.sqrt(x * x + y * y)

    // 滑动的长度与角度的比，鼠标灵敏度
    const rate = 1 / 10

    // 球面偏移弧度
    const arc2 = (270 + l * rate) * Math.PI / 180
    // z轴按照长度计算，初始点为负数最小值，采用sin函数
    const lastZ = Math.sin(arc2) * R
    
    // 根据球面偏移弧度与鼠标最终滑动弧度，计算x与y坐标
    const ll = Math.cos(arc2) * R
    const lastX = Math.cos(arc) * ll
    const lastY = Math.sin(arc) * ll

    // 看向这个点
    camera.lookAt(
      camera.position.x + lastX,
      camera.position.y + lastY,
      camera.position.z + lastZ,
    )

  }
  function mouseup (e) {
    const {pageX, pageY} = e
    offsetX += pageX - _x;
    offsetY += pageY - _y;
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}
addEvent()


function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
}

render()
