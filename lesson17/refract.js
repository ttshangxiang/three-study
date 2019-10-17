
// 折射

function createRefractTexture(gl) {

  // 创建渲染对象
  const targetTextureWidth = 2048;
  const targetTextureHeight = 2048;
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);

  // 定义 0 级的大小和格式
  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
    targetTextureWidth, targetTextureHeight, border,
    format, type, data);

  // 设置筛选器，不需要使用贴图
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // 创建并绑定帧缓冲
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  
  // 附加纹理为第一个颜色附件
  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

  return {
    targetTexture,
    targetTextureWidth,
    targetTextureHeight,
    fb
  }
}

function drawRefract(gl, camera, mirror, params, callback) {
  let n = mirror.normal
  let refract_camera_target = [0, 0, 0]
  
  // 水下
  const underWater = camera.position[1] < mirror.position[1]
  if (underWater) {
    refract_camera_target = [0, 60, 0]
    n = [0, -1, 0]
  }

  const d = m4.normalize(m4.subtractVectors(refract_camera_target, camera.position))
  const result = lineCrossToFace(camera.position, d, n, mirror.position)
  if (!result) {
    return
  }
  const {point, t} = result
  // 水折射公式
  // 水的折射率 1.3330
  // point 相机与目标点的线与水面的交点

  // 交点映射到目标水平面
  let point0 = [point[0], refract_camera_target[1], point[2]]
  const ln01 = m4.distance(point0, refract_camera_target)
  const ln02 = Math.abs(point[1] - point0[1])
  const angle = Math.atan2(ln01, ln02)
  let angle2
  // 水下
  if (underWater) {
    const ss = Math.sin(angle) * 1.3330
    if (ss < 1) {
      angle2 = Math.asin(ss)
    } else {
      // 全反射，无折射
      callback(null, true)
      return
    }
  } else {
    angle2 = Math.asin(Math.sin(angle) / 1.3330)
  }

  const angle2tan = Math.tan(angle2)
  const ln03 = ln01 / angle2tan
  let ln04 = ln03 - ln02

  // 交点映射到相机平面
  let point1 = [point[0], camera.position[1], point[2]]
  const ln11 = m4.distance(point1, camera.position)
  const ln12 = Math.abs(point[1] - point1[1])
  const ln13 = ln11 / angle2tan
  let ln14 = ln13 - ln12

  // 水下
  if (underWater) {
    ln04 *= -1
    ln14 *= -1
  }

  refract_camera_target = [
    refract_camera_target[0],
    refract_camera_target[1] - ln04,
    refract_camera_target[2]
  ]

  const refract_camera_position = [
    camera.position[0],
    camera.position[1] + ln14,
    camera.position[2]
  ]

  // 绘制阴影到贴图
  gl.bindFramebuffer(gl.FRAMEBUFFER, params.fb)
  gl.viewport(0, 0, params.targetTextureWidth, params.targetTextureHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  callback({refract_camera_position, refract_camera_target, underWater})

}

/**
 * 
 * @param {*} p0 
 * @param {*} d 
 * @param {*} n 
 * @param {*} position
 * 相交公式
 * D = p.n
 * t = (D - p0.n) / d.n
 */
function lineCrossToFace (p0, d, n, position) {
  // 平行，不相交
  const dn = m4.dot(d, n)
  if (dn === 0) {
    return false
  }
  // 平面上任意点满足p.n = D，就随便取第一个
  const D = m4.dot(position, n)
  const t = (D - m4.dot(p0, n)) / dn
  
  const point = m4.addVectors(p0, [d[0] * t, d[1] * t, d[2] * t])

  return {point, t}
}

export default {
  createRefractTexture,
  drawRefract
}

