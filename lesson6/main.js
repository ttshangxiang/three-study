const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 1000
)

// 初始摄像机位置
camera.position.y = 10

// lookAt
const lookAtV = new THREE.Vector3(0, 0, -1)
// Spherical
let spherical = new THREE.Spherical().setFromVector3(lookAtV)
camera.lookAt(new THREE.Vector3().setFromSpherical(spherical).add(camera.position))

const scene = new THREE.Scene()

// 网格辅助线
const size = 1000;
const divisions = 100;

const gridHelper = new THREE.GridHelper( size, divisions );
scene.add( gridHelper );

// 调整视野
function addViewEvent () {
  const dom = window
  // 锁定状态
  let lockState = false
  renderer.domElement.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    if (lockState) {
      return
    }
    dom.addEventListener('mousemove', mousemove)
    renderer.domElement.requestPointerLock()
  }
  function mousemove (e) {
    const {movementX, movementY} = e

    // 增量
    const x = movementX
    const y = movementY

    // 灵敏度
    const rate = 1000
    // 极 0到180度
    const phi = THREE.Math.clamp(spherical.phi + y / rate, 0, Math.PI)
    // 赤
    const theta = spherical.theta + -x / rate
    spherical.set(spherical.radius, phi, theta)

  }
  document.addEventListener('pointerlockchange', e => {
    if (lockState) {
      dom.removeEventListener('mousemove', mousemove)
      const cross = document.querySelector('.cross-hair')
      cross.parentNode.removeChild(cross)
    } else {
      addCrossHair()
    }
    lockState = !lockState
  })
}
const view = addViewEvent()

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

    // 移动球坐标
    let s = spherical.clone()

    if (r === 1) {// 一键
      if (dMap["↑"]) {
        // 不变
      } else if (dMap["←"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI / 2)
      } else if (dMap["↓"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI)
      } else if (dMap["→"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI * 3 / 2)
      }
    } else if (r === 2) {// 二键
      if (dMap["↑"] && dMap["←"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI / 4)
      } else if (dMap["↓"] && dMap["←"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI * 3 / 4)
      } else if (dMap["↓"] && dMap["→"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI * 5 / 4)
      } else if (dMap["↑"] && dMap["→"]) {
        s.set(s.radius, s.phi, s.theta + Math.PI * 7 / 4)
      }
    }

    // 移动方向
    const ve = new THREE.Vector3().setFromSpherical(s).setY(0).normalize()
    // 摄像机移动ve
    camera.position.addScaledVector(ve, v)
  }
}

const walk = addWalkEvent()

// 跳一跳
function addJumpEvent () {
  // 初速度
  const v0 = 1
  // 加速度
  const a = -0.001
  // 速度
  let v = 0
  // 高度
  let h = 0
  // 时间
  let t = 0
  // 是否起跳
  let state = false
  
  window.addEventListener('keypress', e => {
    if (e.keyCode === 32) {
      if (state === false) {
        state = true
        v = v0
        t = 0
      }
    }
  })

  return function jump () {
    if (state) {
      t++
      v = v + a * t
      h = v * t

      if (h <= 0) {
        state = false
        h = 0
        t = 0
      }
    }
    
    camera.position.y = h + 10
  }

}

const jump = addJumpEvent()

// 显示一个准心
function addCrossHair () {
  const crossHair = document.createElement('span')
  crossHair.classList.add('cross-hair')
  document.body.appendChild(crossHair)
}

// 开枪吧
function addFireEvent () {
  let fireState = false
  renderer.domElement.addEventListener('mousedown', e => {
    fireState = true
    window.addEventListener('mouseup', mouseup)
  })

  function mouseup () {
    fireState = false
    window.removeEventListener('mouseup', mouseup)
  }

  function createTarget (x, y, z) {
    const geometry = new THREE.BoxGeometry( 100, 100, 100 );
    const material = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.set(x, y, z)
    scene.add(cube)
    return cube
  }

  // 靶子
  const targets = [
    createTarget(0, 50, 300),
    createTarget(0, 50, -300),
    createTarget(400, 50, 300),
    createTarget(200, 200, 300)
  ]

  // 子弹
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
  const cube = new THREE.Mesh( geometry, material );

  // 射击距离
  const maxDistance = 500

  // 射击速度
  const v = 10

  let t = 0
  let bullets = []
  return function fire () {
    if (fireState) {
      if (t % 10 === 0) {
        const c = cube.clone()
        c.position.set(camera.position.x, camera.position.y, camera.position.z)
        const obj = {
          cube: c,
          start: camera.position.clone(),
          direction: new THREE.Vector3().setFromSpherical(spherical),
        }
        
        const raycaster = new THREE.Raycaster(obj.start, obj.direction, 0, maxDistance)
        let raycasterR = []
        for (let j = 0; j < targets.length; j++) {
          const item = targets[j]
          const r = raycaster.intersectObject(item)
          raycasterR = raycasterR.concat(r)
        }
        obj.raycasterR = raycasterR

        bullets.push(obj)
        scene.add(c)
      }
      t++
    } else {
      t = 0
    }

    for (let i = 0; i < bullets.length; i++) {
      const item = bullets[i]
      const d = new THREE.Vector3().subVectors(item.cube.position, item.start).length()
      if (d < maxDistance) {
        for (let j = 0; j < item.raycasterR.length; j++) {
          const r = item.raycasterR[j]
          // 打中了，两个都消失
          if (r.object.parent && r.distance < d) {
            scene.remove(r.object)
            scene.remove(item.cube)
            bullets.splice(i, 1)
            i--
            return
          }
        }
        item.cube.position.addScaledVector(item.direction, v)
      } else {
        scene.remove(item.cube)
        bullets.splice(i, 1)
        i--
      }
    }

  }
}
const fire = addFireEvent()

function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  walk()
  jump()
  fire()
  camera.lookAt(new THREE.Vector3().setFromSpherical(spherical).add(camera.position))
}

render()
