const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 500
)

window.camera = camera

// 初始摄像机位置
camera.position.y = 10

const Y0 = camera.up.clone()

const scene = new THREE.Scene()

// 网格辅助线
const size = 1000;
const divisions = 100;

const gridHelper = new THREE.GridHelper( size, divisions );
scene.add( gridHelper );

// 调整视野
function addViewEvent () {
  const dom = window
  let _x
  let _y
  renderer.domElement.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    const {pageX, pageY} = e
    // 存
    _x = pageX
    _y = pageY
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
  }
  function mousemove (e) {
    const {pageX, pageY} = e
    // 增量
    const x = pageX - _x
    const y = pageY - _y
    // 存
    _x = pageX
    _y = pageY

    if (x === 0 && y === 0) {
      return
    }

    rotate(x, y)

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }

  function rotate (x, y) {
    const rate = 1000
    let quaternion = new THREE.Quaternion()

    // 左右旋转
    const up = new THREE.Vector3(0, 1, 0)
    // up.applyQuaternion(camera.quaternion) // 需要一直朝着0，1，0
    quaternion.setFromAxisAngle(up, -x / rate)
    camera.quaternion.premultiply(quaternion)
    
    // 上下旋转
    const left = new THREE.Vector3(1, 0, 0)
    left.applyQuaternion(camera.quaternion)
    quaternion.setFromAxisAngle(left, -y / rate)
    camera.quaternion.premultiply(quaternion)

  }

  return rotate
}
const rotate = addViewEvent()

function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
}

render()
