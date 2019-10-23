

// 创建
function createDepthTexture (gl) {
  // 创建深度纹理
  const depthTexture = gl.createTexture();
  const depthTextureSize = 2048;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,      // target
    0,                  // mip level
    gl.DEPTH_COMPONENT, // internal format
    depthTextureSize,   // width
    depthTextureSize,   // height
    0,                  // border
    gl.DEPTH_COMPONENT, // format
    gl.UNSIGNED_INT,    // type
    null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,       // target
    gl.DEPTH_ATTACHMENT,  // attachment point
    gl.TEXTURE_2D,        // texture target
    depthTexture,         // texture
    0);                   // mip level

  // 灯光正交矩阵
  const projectionMatrix = m4.orthographic(-100, 100, -100, 100, 0, 400)

  // 灯光相机矩阵
  const cameraPosition = [100, 200, 100]
  const target = [0, 0, 0]
  const up = [0, 1, 0]
  const cameraMatrix = m4.lookAt(cameraPosition, target, up)

  // 灯光视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)

  return {
    depthTexture,
    depthTextureSize,
    depthFramebuffer,
    projectionMatrix,
    viewMatrix
  }
}

// 绘制
function drawShadow (gl, programInfo, params, objects) {
  gl.useProgram(programInfo.program)
  // 绘制阴影到贴图
  gl.bindFramebuffer(gl.FRAMEBUFFER, params.depthFramebuffer)
  gl.viewport(0, 0, params.depthTextureSize, params.depthTextureSize)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // 画背面
  gl.frontFace(gl.CW)

  objects.forEach(o => {
    webglUtils.setUniforms(programInfo, Object.assign({}, o.uniforms, {
      u_view: params.viewMatrix,
      u_projection: params.projectionMatrix
    }))
    webglUtils.setBuffersAndAttributes(gl, programInfo, o.buffer)
    gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
  })

  // 设回正面
  gl.frontFace(gl.CCW)

  // 将灯光透视、视图矩阵转换到0-1的区间
  let textureMatrix = m4.identity()
  textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5)
  textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5)
  textureMatrix = m4.multiply(textureMatrix, params.projectionMatrix)
  textureMatrix = m4.multiply(textureMatrix, params.viewMatrix)

  return {
    textureMatrix,
    depthTexture: params.depthTexture
  }
}

export default {
  createDepthTexture,
  drawShadow
}
