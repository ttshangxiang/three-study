
/**
 * 调整视野
 */

// 调整视野
function addViewEvent (gl, camera, callback) {
  
  const dom = window
  gl.canvas.addEventListener('mousedown', mousedown)
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
    const rate = 600

    const r = m4.distance(camera.position, camera.target)
    const v = m4.subtractVectors(camera.position, camera.target)
    let phi = Math.atan2(v[0], v[2])
    let theta = Math.acos(v[1] / r)

    phi -= x / rate

    if (theta > Math.PI) {
      theta = Math.PI
    } else if (theta < 0) {
      theta = 0
    } else {
      theta -= y /rate
    }

    const cy = Math.cos(theta) * r
    const rr = Math.abs(Math.sin(theta) * r)
    const cx = Math.sin(phi) * rr
    const cz = Math.cos(phi) * rr

    camera.position = m4.addVectors([cx, cy, cz], camera.target)
    callback()

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}

window.addViewEvent = addViewEvent

export default addViewEvent

