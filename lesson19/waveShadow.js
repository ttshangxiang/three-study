
// 波浪影子

function createWaveShadowTexture(gl) {

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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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

function drawWaveShadow(gl, params, callback) {
  const camera = {
    position: [0, 160, 0],
    target: [0, 60, 0],
    up: [0, 0, -1]
  }
  // 透视矩阵
  const aspect = params.targetTextureWidth / params.targetTextureHeight
  const projectionMatrix = m4.perspective(90 * Math.PI / 180, aspect, 1, 110)
  // 相机矩阵
  const cameraMatrix = m4.lookAt(camera.position, camera.target, camera.up)
  // 视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)

  // 绘制阴影到贴图
  gl.bindFramebuffer(gl.FRAMEBUFFER, params.fb)
  gl.viewport(0, 0, params.targetTextureWidth, params.targetTextureHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)


  callback(projectionMatrix, viewMatrix)

}

export default {
  createWaveShadowTexture,
  drawWaveShadow
}

