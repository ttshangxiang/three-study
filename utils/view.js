/**
 * 调整视野
 */

// 调整视野
function addViewEvent (camera, spherical) {
  const dom = window
  // 锁定状态
  renderer.domElement.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
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

    camera.lookAt(new THREE.Vector3().setFromSpherical(spherical).add(camera.position))

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}

window.addViewEvent = addViewEvent
