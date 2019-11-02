
// 添加canvas
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

// 获取gl
const gl = canvas.getContext('webgl', { antialias: true })
if (!gl) {
  throw Error('gl都获取不到')
}

// 打开深度纹理扩展
const ext = gl.getExtension('WEBGL_depth_texture')
if (!ext) {
  throw Error('need WEBGL_depth_texture')
}

// 纹理开启gl.FLOAT的type
gl.getExtension('OES_texture_float')
gl.getExtension('OES_texture_float_linear')

const shader = {
  vertex: `
  attribute vec4 a_position;
  varying vec2 coord;
  void main() {
    coord = a_position.xy * 0.5 + 0.5;
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
  }
  `,
  fragment: `
  precision highp float;
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    /* get vertex info */
    vec4 info = texture2D(texture, coord);
    gl_FragColor = info;
  }
  `
}

const waveShader = {
  vertex: `
  attribute vec4 a_position;
  varying vec2 coord;
  void main() {
    coord = a_position.xy * 0.5 + 0.5;
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
  }
  `,
  fragment: `
  precision highp float;
  const float PI = 3.141592653589793;
  uniform sampler2D texture;
  uniform vec2 center;
  uniform float radius;
  uniform float strength;
  varying vec2 coord;
  void main() {
    // /* get vertex info */
    // vec4 info = texture2D(texture, coord);
    
    // /* add the drop to the height */
    // float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - coord) / radius);
    // drop = 0.5 - cos(drop * PI) * 0.5;
    // info.r += drop * strength;
    
    // gl_FragColor = info;
    gl_FragColor = vec4(center * 0.5 + 0.5, 1.0, 1.0);
  }
  `
}

// 获取着色器
const programInfo = webglUtils.createProgramInfo(gl, [shader.vertex, shader.fragment])
const waveShaderInfo = webglUtils.createProgramInfo(gl, [waveShader.vertex, waveShader.fragment])

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

const planeBuffer = webglUtils.createBufferInfoFromArrays(gl, plane)

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
  // const type = gl.UNSIGNED_BYTE;
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

function degToRad(d) {
  return d * Math.PI / 180;
}

let textureA = createWaterTexture(gl, 'A')
let textureB = createWaterTexture(gl, 'B')

// 交换着来
function swapTexture () {
  let temp = textureA
  textureA = textureB
  textureB = temp
}

// 添加波纹
function addDrop (x, y, radius, strength) {
  console.log(x, y, radius, strength)
  console.log(textureB.name)
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

gl.canvas.addEventListener('mousedown', e => {
  const {pageX, pageY} = e
  const x = pageX / gl.canvas.width * 2 - 1
  const y = -(pageY / gl.canvas.height * 2 - 1)
  addDrop(x, y, 0.03, 1)
})

function createAndSetupTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  return texture;
}

// Create a texture.
var texture = createAndSetupTexture(gl)
var image = new Image();
var imageLoaded = false
image.src = "./tiles.jpg";
image.addEventListener('load', function () {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
  gl.generateMipmap(gl.TEXTURE_2D)
  imageLoaded = true
})

// 绘制场景
let then = 0;
function render(time) {
  time *= 0.001;
  const deltaTime = time - then;
  then = time;
  // 重置尺寸
  webglUtils.resizeCanvasToDisplaySize(gl.canvas)
  // 隐藏背面
  gl.enable(gl.CULL_FACE);
  // 开启深度测试
  gl.enable(gl.DEPTH_TEST);
  // 背景
  gl.clearColor(0, 0, 0, 1)

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.useProgram(programInfo.program)
  webglUtils.setUniforms(programInfo, {
    texture: textureA.texture
  })
  webglUtils.setBuffersAndAttributes(gl, programInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)

}

function run(time) {
  render(time)
  requestAnimationFrame(run)
}

run()
