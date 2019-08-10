const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 500
)
// 初始Y轴
const Y0 = camera.up.clone()
// 初始X轴
const X0 = Y0.clone().applyEuler(new THREE.Euler(0, 0, -Math.PI / 2))

// 初始摄像机位置
camera.position.y = 10

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

    const rate = 1000

    const after = camera.quaternion.clone()
    let quaternion = new THREE.Quaternion()
    // 旋转后的Y轴
    const Y = Y0.applyQuaternion(after)
    quaternion.setFromAxisAngle(Y.normalize(), -x / rate)
    after.multiply(quaternion)

    // 旋转后的X轴
    const X = X0.applyQuaternion(after)
    quaternion.setFromAxisAngle(X.normalize(), -y / rate)
    after.multiply(quaternion)

    camera.setRotationFromQuaternion(after)

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}
addViewEvent()

// 走路
function addWalkEvent () {
  window.addEventListener('keydown', e => {
    switch (e.keyCode) {
      // 前
      case 87:
      case 38:
        walkStart('↑')
        break;
      // 后
      case 83:
      case 40:
        walkStart('↓')
        break;
      // 左
      case 65:
      case 37:
        walkStart('←')
        break;
      // 右
      case 68:
      case 39:
        walkStart('→')
        break;
    
      default:
        break;
    }
  })
  window.addEventListener('keyup', e => {
    switch (e.keyCode) {
      // 前
      case 87:
      case 38:
        walkEnd('↑')
        break;
      // 后
      case 83:
      case 40:
        walkEnd('↓')
        break;
      // 左
      case 65:
      case 37:
        walkEnd('←')
        break;
      // 右
      case 68:
      case 39:
        walkEnd('→')
        break;
    
      default:
        break;
    }
  })

  const dMap = {'↑':0, '↓': 0, '←': 0, '→': 0}
  function walkStart (direction) {
    dMap[direction] = 1
  }

  function walkEnd (direction) {
    dMap[direction] = 0
  }

  return function walk () {
    const r = Object.values(dMap).reduce((t, o) => t + o)
    // 无方向
    if (r === 0) {
      return;
    }
    // 反向时消除
    if (dMap["←"] && dMap["→"]) {
      dMap["←"] = dMap["→"] = 0
    }
    if (dMap["↑"] && dMap["↓"]) {
      dMap["↑"] = dMap["↓"] = 0
    }

    // 速度
    let v = 1

  }
}

const walk = addWalkEvent()


function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  walk()
}

render()
