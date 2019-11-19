
/**
 * 调整视野
 */

// 调整视野
function addViewEvent (canvas, camera, target, callback) {
  
  const dom = window
  canvas.addEventListener('mousedown', mousedown)
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

    const r = camera.position.distanceTo(target);
    const v = new THREE.Vector3().subVectors(camera.position, target);
    let phi = Math.atan2(v.x, v.z);
    let theta = Math.acos(v.y / r);

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

    camera.position.set(target.x + cx, target.y + cy, target.z + cz);
    camera.lookAt(target);
    callback && callback()

  }
  function mouseup () {
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}

window.addViewEvent = addViewEvent

export default addViewEvent

