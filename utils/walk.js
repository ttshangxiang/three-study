/**
 * 走路
 */

function addWalkEvent (camera, spherical) {
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

window.addWalkEvent = addWalkEvent
