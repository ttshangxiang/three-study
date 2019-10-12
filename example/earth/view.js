
/**
 * 调整视野
 */

// 调整视野
function addViewEvent (canvas, object, callback) {
  
  const dom = window
  const xAxis = new THREE.Vector3(1, 0, 0)
  const yAxis = new THREE.Vector3(0, 1, 0)
  canvas.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    if (object.isBusy) {
      return
    }
    object.isBusy = true
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
  }
  function mousemove (e) {
    const {movementX, movementY} = e
    // 增量
    const x = movementX
    const y = movementY

    // 灵敏度
    const rate = 600

    if (object.selfRotate) {
      return
    }

    object.rotation.x += y / rate
    if (Math.floor(Math.abs(object.rotation.z)) === 0) {
      object.rotation.y += x / rate
    } else {
      object.rotation.y -= x / rate
    }

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
    object.isBusy = false
  }
}

window.addViewEvent = addViewEvent

export default addViewEvent

