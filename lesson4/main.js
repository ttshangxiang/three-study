const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 1000
)

// 初始摄像机位置
camera.position.set(0, 10, 0)
// lookAt的向量
const vector = new THREE.Vector3(0, 10, -10)
camera.lookAt(vector)

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

// 调整视野
function addViewEvent () {
  const dom = window
  let _x
  let _y
  let _euler
  renderer.domElement.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    const {pageX, pageY} = e
    _x = pageX
    _y = pageY
    _euler = new THREE.Euler( 0, 0, 0, 'XYZ' )
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
  }
  function mousemove (e) {
    const {pageX, pageY} = e
    // 增量
    const x = pageX - _x
    const y = pageY - _y

    // 灵敏度
    const rate = 1000

    // 欧拉角
    _euler = new THREE.Euler( -y / rate, -x / rate, 0, 'XYZ' );

    // 看向这个点
    camera.lookAt(vector.clone().applyEuler(_euler))

  }
  function mouseup () {
    vector.applyEuler(_euler)
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
        walkStart('->')
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
        walkEnd('->')
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

    // 两个方向同时按时，速度减半
    let v = 1
    r > 1 && (v = v / 2)

    // 判断向量
    let ve = new THREE.Vector3(vector.x, 0, vector.z)
    // 角度
    let angle
    if (r === 1) {// 一键
      if (dMap["↑"]) {
        angle = null
      } else if (dMap["↓"]) {
        angle = Math.PI / 2
      } else if (dMap["←"]) {
        angle = -Math.PI / 4
      } else if (dMap["→"]) {
        angle = Math.PI / 4
      }
    } else if (r === 2) {// 二键
      if (dMap["↑"] && dMap["←"]) {
        angle = -Math.PI / 8
      } else if (dMap["↑"] && dMap["→"]) {
        angle = Math.PI / 8
      } else if (dMap["↓"] && dMap["←"]) {
        angle = -3 * Math.PI / 8
      } else if (dMap["↓"] && dMap["→"]) {
        angle = 3 * Math.PI / 8
      }
    }

    // 转向
    angle && ve.applyEuler(new THREE.Euler(0, angle, 0, 'XYZ'))
    // 归一
    ve = ve.normalize()

    // 摄像机和lookat同时新增ve
    vector.addScaledVector(ve, v)
    camera.position.addScaledVector(ve, v)
  }
}

const walk = addWalkEvent()


function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  walk()
}

render()
