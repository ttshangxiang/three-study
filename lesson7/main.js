
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
camera.position.y = 10

const scene = new THREE.Scene()
scene.add(camera)

const helper = new THREE.CameraHelper(camera)
scene.add(helper)

// 网格辅助线
const size = 1000
const divisions = 100

const gridHelper = new THREE.GridHelper(size, divisions)
scene.add(gridHelper)

// 球坐标
const v = new THREE.Vector3()
camera.getWorldDirection(v)
const spherical = new THREE.Spherical().setFromVector3(v)

// 旋转
addViewEvent(camera, spherical)

// 走路
const walk = addWalkEvent(camera, spherical)

// 白板一块
const whiteBoardGeometry = new THREE.BoxGeometry(200, 100, 1)
const whiteBoardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
const whiteBoard = new THREE.Mesh(whiteBoardGeometry, whiteBoardMaterial)
whiteBoard.position.set(0, 50, -400)
scene.add(whiteBoard)

// 点击白板
function addClickEvent() {

  const v2 = new THREE.Vector2()
  renderer.getSize(v2)
  // 相机角度的弧度
  const angle = camera.fov * Math.PI / 180
  // 焦距
  const distance = v2.y / 2 / Math.tan(angle / 2)

  renderer.domElement.addEventListener('click', e => {
    const { pageX, pageY } = e

    // 鼠标相对中心的偏移
    const x = pageX - v2.x / 2
    const y = pageY - v2.y / 2

    // 产生的角度
    const angleX = Math.atan2(x, distance)
    const angleY = Math.atan2(y, distance)

    // 角度应用到球坐标，获得射线向量
    const s = spherical.clone()
    s.set(s.radius, s.phi + angleY, s.theta - angleX)
    const clickVector = new THREE.Vector3().setFromSpherical(s).normalize()

    // 获得点击射线
    const raycaster = new THREE.Raycaster(camera.position.clone(), clickVector, 0, 1000)
    const r = raycaster.intersectObject(whiteBoard)
    console.log(r)
  })
}

addClickEvent()

function render() {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  walk()
}
render()
