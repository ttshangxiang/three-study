
// 水面，用texture存储法向量和高度
// 使用两个texture交替，进行多次操作

function createWaterTexture(gl, name) {

  // 创建渲染对象
  const targetTextureWidth = 256;
  const targetTextureHeight = 256;
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);

  // 定义 0 级的大小和格式
  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.FLOAT;
  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
    targetTextureWidth, targetTextureHeight, border,
    format, type, data);

  // 设置筛选器，不需要使用贴图
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // 创建并绑定帧缓冲
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // 附加纹理为第一个颜色附件
  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

  return {
    name,
    texture: targetTexture,
    width: targetTextureWidth,
    height: targetTextureHeight,
    fb
  }
}

const plane = {
  position: {
    numComponents: 2,
    data: [
      -1, 1,
      -1, -1,
      1, -1,
      -1, 1,
      1, -1,
      1, 1
    ]
  }
}

const vertexShader = `
  attribute vec4 a_position;
  varying vec2 coord;
  void main() {
    coord = a_position.xy * 0.5 + 0.5;
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
  }
`

const waveShader = {
  vertex: vertexShader,
  fragment: `
  precision highp float;
  const float PI = 3.141592653589793;
  uniform sampler2D texture;
  uniform vec2 center;
  uniform float radius;
  uniform float strength;
  varying vec2 coord;
  void main() {
    /* get vertex info */
    vec4 info = texture2D(texture, coord);
    
    /* add the drop to the height */
    float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - coord) / radius);
    drop = 0.5 - cos(drop * PI) * 0.5;
    info.r += drop * strength;
    
    gl_FragColor = info;
  }
  `
}

const updateShader = {
  vertex: vertexShader,
  fragment: `
  precision highp float;
  uniform sampler2D texture;
  uniform vec2 delta;
  varying vec2 coord;
  void main() {
    /* get vertex info */
    vec4 info = texture2D(texture, coord);
    
    /* calculate average neighbor height */
    vec2 dx = vec2(delta.x, 0.0);
    vec2 dy = vec2(0.0, delta.y);
    float average = (
      texture2D(texture, coord - dx).r +
      texture2D(texture, coord - dy).r +
      texture2D(texture, coord + dx).r +
      texture2D(texture, coord + dy).r
    ) * 0.25;
    
    /* change the velocity to move toward the average */
    info.g += (average - info.r) * 2.0;
    
    /* attenuate the velocity a little so waves do not last forever */
    info.g *= 0.995;
    
    /* move the vertex along the velocity */
    info.r += info.g;
    
    gl_FragColor = info;
  }
  `
}

const normalShader = {
  vertex: vertexShader,
  fragment: `
  precision highp float;
  uniform sampler2D texture;
  uniform vec2 delta;
  varying vec2 coord;
  void main() {
    /* get vertex info */
    vec4 info = texture2D(texture, coord);
    
    /* update the normal */
    vec3 dx = vec3(delta.x, texture2D(texture, vec2(coord.x + delta.x, coord.y)).r - info.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(texture, vec2(coord.x, coord.y + delta.y)).r - info.r, delta.y);
    info.ba = normalize(cross(dy, dx)).xz;
    
    gl_FragColor = info;
  }
  `
}

const testShader = {
  vertex: vertexShader,
  fragment: `
  precision highp float;
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    /* get vertex info */
    vec4 info = texture2D(texture, coord);
    
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    float light = dot(normal, vec3(0, 1.0, 0));

    // float aa = info.r > 0.0 ? 1.0 : 0.0;
    
    gl_FragColor = vec4(light, 0, 0, 1.0);
  }
  `
}

let gl
let textureA
let textureB
let planeBuffer
let waveShaderInfo
let updateShaderInfo
let normalShaderInfo
let testShaderInfo

// 交换着来
function swapTexture () {
  let temp = textureA
  textureA = textureB
  textureB = temp
}

function waterInit (GL) {
  gl = GL
  textureA = createWaterTexture(gl, 'A')
  textureB = createWaterTexture(gl, 'B')
  planeBuffer = webglUtils.createBufferInfoFromArrays(gl, plane)

  waveShaderInfo = webglUtils.createProgramInfo(gl, [waveShader.vertex, waveShader.fragment])
  normalShaderInfo = webglUtils.createProgramInfo(gl, [normalShader.vertex, normalShader.fragment])
  updateShaderInfo = webglUtils.createProgramInfo(gl, [updateShader.vertex, updateShader.fragment])
  testShaderInfo = webglUtils.createProgramInfo(gl, [testShader.vertex, testShader.fragment])

}

// 添加波纹
function addDrop (x, y, radius, strength) {
  var v = gl.getParameter(gl.VIEWPORT);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, textureB.fb)
  gl.viewport(0, 0, textureB.width, textureB.height)

  gl.useProgram(waveShaderInfo.program)
  webglUtils.setUniforms(waveShaderInfo, {
    texture: textureA.texture,
    center: [x, y],
    radius: radius,
    strength: strength
  })
  webglUtils.setBuffersAndAttributes(gl, waveShaderInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)
  
  swapTexture()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(v[0], v[1], v[2], v[3])

  return textureA
}

// 计算法向量
function updateNormals () {
  var v = gl.getParameter(gl.VIEWPORT);

  gl.bindFramebuffer(gl.FRAMEBUFFER, textureB.fb)
  gl.viewport(0, 0, textureB.width, textureB.height)

  gl.useProgram(normalShaderInfo.program)
  webglUtils.setUniforms(normalShaderInfo, {
    texture: textureA.texture,
    delta: [1 / textureA.width, 1 / textureA.height]
  })
  webglUtils.setBuffersAndAttributes(gl, normalShaderInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)

  swapTexture()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(v[0], v[1], v[2], v[3])

  return textureA
}

// 模拟波纹动画
function stepSimulation () {
  var v = gl.getParameter(gl.VIEWPORT);

  gl.bindFramebuffer(gl.FRAMEBUFFER, textureB.fb)
  gl.viewport(0, 0, textureB.width, textureB.height)

  gl.useProgram(updateShaderInfo.program)
  webglUtils.setUniforms(updateShaderInfo, {
    texture: textureA.texture,
    delta: [1 / textureA.width, 1 / textureA.height]
  })
  webglUtils.setBuffersAndAttributes(gl, updateShaderInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)

  swapTexture()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(v[0], v[1], v[2], v[3])

  return textureA
}

// 测试
function test () {

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.useProgram(testShaderInfo.program)
  webglUtils.setUniforms(testShaderInfo, {
    texture: textureA.texture
  })
  webglUtils.setBuffersAndAttributes(gl, testShaderInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)

}

function count () {
  const pixels = new Float32Array(4 * 256 * 256)
  gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.FLOAT, pixels)
  let count = 0
  for (let i = 0; i < pixels.length;) {
    if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 0) {
      // console.log(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
      count++
    }
    i += 4
  }
  console.log(count)
}

export default {
  waterInit,
  addDrop,
  updateNormals,
  stepSimulation,
  test
}
