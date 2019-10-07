
// 添加canvas
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

// 获取gl
const gl = canvas.getContext('webgl')
if (!gl) {
  throw Error('gl都获取不到')
}

// 获取着色器
const programInfo = webglUtils.createProgramInfo(gl, ['3d-vertex-shader', '3d-fragment-shader'])
const textProgramInfo = webglUtils.createProgramInfo(gl, ['text-vertex-shader', 'text-fragment-shader'])

// 画网格线
function createGridLine (x, y, w, h) {
  const position = []
  const indices = []
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      position.push(i * w, j * h, 0)
      const index = i * y + j
      i > 0 && indices.push(index - y, index)
      j > 0 && indices.push(index - 1, index)
    }
  }
  return {position, indices}
}

const gridLine = createGridLine(100, 100, 1, 1)
const gridLineBufferInfo = webglUtils.createBufferInfoFromArrays(gl, gridLine)

// 画板子
const plane = {
  position: {
    numComponents: 3, 
    data: [
      -0.5, 0, -0.5,
      -0.5, 0, 0.5,
      0.5, 0, -0.5,
      -0.5, 0, 0.5,
      0.5, 0, 0.5,
      0.5, 0, -0.5
    ]
  },
  texcoord: { numComponents: 2, data: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0]}
}
const planeBuffer = webglUtils.createBufferInfoFromArrays(gl, plane)

// 画纹理
var textCtx = document.createElement("canvas").getContext("2d");
// 将文字放在画布中间
function makeTextCanvas(text, width, height) {
  textCtx.canvas.width  = width;
  textCtx.canvas.height = height;
  textCtx.font = "20px monospace";
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";
  textCtx.fillStyle = "red";
  textCtx.clearRect(0, 0, textCtx.canvas.width, textCtx.canvas.height);
  textCtx.fillText(text, width / 2, height / 2);
  return textCtx.canvas;
}
// 创建纹理
var textCanvas = makeTextCanvas("卧槽!", 100, 26);
var textWidth  = textCanvas.width;
var textHeight = textCanvas.height;
var textTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, textTex);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
// make sure we can render it even if it's not a power of 2
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function degToRad(d) {
  return d * Math.PI / 180;
}

// 视角
const fieldOfViewRadians = degToRad(60)

// gui
const gui = new dat.GUI()
const controls = new function () {
  this.cameraX = 0
  this.cameraY = 2
  this.cameraZ = 2
}

gui.add(controls, 'cameraX', -100, 100).onChange(render)
gui.add(controls, 'cameraY', -100, 100).onChange(render)
gui.add(controls, 'cameraZ', -100, 100).onChange(render)

// 做射线

// 点击点坐标还原成3d坐标
/**
 * 
 * @param {*} x 点击的x
 * @param {*} y 点击的y
 * @param {*} width 画布宽度
 * @param {*} height 画布高度
 * @param {*} n_projectionMatrix 投影矩阵的逆
 * @param {*} n_viewMatrix 视图矩阵的逆
 * @returns {*} 近点与远点的坐标 
 */
function clickToPoint (x, y, width, height, n_projectionMatrix, n_viewMatrix) {
  // 转换到-1到1的区间
  x = x / width * 2 - 1
  y = -(y / height * 2 - 1)

  // 近远点
  let near = [x, y, -1]
  let far = [x, y, 1]

  // 从逆矩阵拿坐标
  near = m4.transformPoint(n_projectionMatrix, near)
  far = m4.transformPoint(n_projectionMatrix, far)
  near = m4.transformPoint(n_viewMatrix, near)
  far = m4.transformPoint(n_viewMatrix, far)

  // 返回近远点的真实坐标
  return {near, far}
}

/**
 * 
 * @param {*} p0 
 * @param {*} d 
 * @param {*} face 
 * 相交公式
 * D = p.n
 * t = (D - p0.n) / d.n
 */
function lineCrossToFace (p0, d, face) {
  const a = m4.subtractVectors(face[1], face[0])
  const b = m4.subtractVectors(face[2], face[1])
  // 法线
  const n = m4.normalize(m4.cross(a, b))
  // 平行，不相交
  const dn = m4.dot(d, n)
  if (dn === 0) {
    return false
  }
  // 平面上任意点满足p.n = D，就随便取第一个
  const D = m4.dot(face[0], n)
  const t = (D - m4.dot(p0, n)) / dn
  
  const point = m4.addVectors(p0, [d[0] * t, d[1] * t, d[2] * t])

  return {point, t}
}

let n_projectionMatrix = m4.identity()
let n_viewMatrix = m4.identity()
let cross_face = []
let text_arr = []

// 点击事件
window.addEventListener('mousedown', e => {
  const {pageX, pageY} = e
  const {near, far} = clickToPoint(pageX, pageY, gl.canvas.width, gl.canvas.height, n_projectionMatrix, n_viewMatrix)

  // 射线的起点与方向
  const p0 = near
  const v = m4.normalize(m4.subtractVectors(far, near))

  const r = lineCrossToFace(p0, v, cross_face)
  if (!r) {
    return
  }
  const {point} = r
  // 判断边距
  let data = [[],[],[]]
  cross_face.forEach(item => {
    data[0].push(item[0])
    data[1].push(item[1])
    data[2].push(item[2])
  })
  let max = [Math.max(...data[0]), Math.max(...data[1]), Math.max(...data[2])]
  let min = [Math.min(...data[0]), Math.min(...data[1]), Math.min(...data[2])]
  if (
    point[0] >= min[0] &&
    point[1] >= min[1] &&
    point[2] >= min[2] &&
    point[0] <= max[0] &&
    point[1] <= max[1] &&
    point[2] <= max[2]
  ) {
    console.log('点中了！')
    text_arr.push(point)
    render()
  }
})


// 绘制场景
function render () {
  // 重置尺寸
  webglUtils.resizeCanvasToDisplaySize(gl.canvas)
  // 隐藏背面
  gl.enable(gl.CULL_FACE);
  // 开启深度测试
  gl.enable(gl.DEPTH_TEST);
  // 背景
  gl.clearColor(0, 0, 0, 1)

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // 绘制 F 前关闭混合模式开启深度缓冲
  gl.disable(gl.BLEND);
  gl.depthMask(true);

  // 透视矩阵
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000)
  n_projectionMatrix = m4.inverse(projectionMatrix)

  // 相机矩阵
  const cameraPosition = [controls.cameraX, controls.cameraY, controls.cameraZ]
  const target = [0, 2, 0]
  const up = [0, 1, 0]
  const cameraMatrix = m4.lookAt(cameraPosition, target, up)
  n_viewMatrix = cameraMatrix

  // 视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)

  // 使用着色器
  gl.useProgram(programInfo.program)
  // 网格
  let u_matrix = m4.translate(m4.xRotation(degToRad(-90)), -50, -50, 0)
  u_matrix = m4.multiply(viewMatrix, u_matrix)
  u_matrix = m4.multiply(projectionMatrix, u_matrix)
  webglUtils.setUniforms(programInfo, {
    u_matrix: u_matrix,
    u_color: [1, 1, 1, 1]
  })

  webglUtils.setBuffersAndAttributes(gl, programInfo, gridLineBufferInfo)
  webglUtils.drawBufferInfo(gl, gridLineBufferInfo, gl.LINES)

  // 板子
  u_matrix = m4.identity()
  u_matrix = m4.translate(u_matrix, 0, 5, -20)
  u_matrix = m4.xRotate(u_matrix, degToRad(90))
  u_matrix = m4.scale(u_matrix, 20, 1, 10)
  const u_world = m4.copy(u_matrix)
  u_matrix = m4.multiply(viewMatrix, u_matrix)
  u_matrix = m4.multiply(projectionMatrix, u_matrix)
  webglUtils.setUniforms(programInfo, {
    u_matrix: u_matrix,
    u_color: [1, 1, 1, 1]
  })

  // 获取板子的坐标，用于判断射线
  cross_face = []
  const points = plane.position.data
  for (let i = 0; i < points.length; i++) {
    if (i % 3 === 2) {
      const v = [points[i], points[i - 1], points[i - 2]]
      cross_face.push(m4.transformPoint(u_world, v))
    }
  }

  webglUtils.setBuffersAndAttributes(gl, programInfo, planeBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)

  // 绘制文字开启混合关闭深度缓冲写入
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  // 关闭深度测试
  gl.disable(gl.DEPTH_TEST);

  // 文字
  gl.useProgram(textProgramInfo.program)
  webglUtils.setBuffersAndAttributes(gl, textProgramInfo, planeBuffer)
  text_arr.forEach(pos => {
    let u_matrix = m4.translation(pos[0], pos[1], pos[2])
    u_matrix = m4.multiply(viewMatrix, u_matrix)
    // 相机视角只取位移的部分，文字就会面对相机
    u_matrix = m4.translate(projectionMatrix, u_matrix[12], u_matrix[13], u_matrix[14])
    u_matrix = m4.xRotate(u_matrix, degToRad(90))
    // 还原比例
    u_matrix = m4.scale(u_matrix, textWidth, 1, textHeight)
    // 整体缩放，与到相机的z成正比，文字固定大小
    const scaleIn = u_matrix[14] / gl.canvas.height
    u_matrix = m4.scale(u_matrix, scaleIn, 1, scaleIn)
    webglUtils.setUniforms(textProgramInfo, {
      u_matrix: u_matrix,
      u_texture: textTex
    })
    gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)
  })
}

render()
