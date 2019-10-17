
// 镜子

function createMirrorTexture(gl) {

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

function drawReflect(gl, camera, mirror, params, callback) {
  let n = mirror.normal
  let mirror_camera_target = [0, 60, 0]

  // 水下
  if (camera.position[1] < mirror.position[1]) {
    mirror_camera_target = [0, 0, 0]
  }

  const v_cm = m4.subtractVectors(camera.position, mirror.position)
  const d = m4.dot(n, v_cm)
  const n_cm = [n[0] * -2 * d, n[1] * -2 * d, n[2] * -2 * d]
  const mirror_camera_position = m4.addVectors(camera.position, n_cm)

  // 绘制阴影到贴图
  gl.bindFramebuffer(gl.FRAMEBUFFER, params.fb)
  gl.viewport(0, 0, params.targetTextureWidth, params.targetTextureHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  callback(mirror_camera_position, mirror_camera_target)

}

export default {
  createMirrorTexture,
  drawReflect
}
