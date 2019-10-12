
import addViewEvent from './view.js'



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

function degToRad(d) {
  return d * Math.PI / 180;
}

// 视角
const fieldOfViewRadians = degToRad(60)

// gui
// const gui = new dat.GUI()
// const controls = new function () {
// }

// 水面
function createWaterPlane (x, y, w, h) {
  const y_num = y + 1
  const position = {numComponents: 3, data: []}
  const indices = {numComponents: 3, data: []}
  const normal = {numComponents: 3, data: []}
  for (let i = 0; i <= x; i++) {
    for (let j = 0; j <= y; j++) {
      position.data.push(i * w, j * h, Math.random()*2)
      normal.data.push(0, 1, 0)
      const index = i * y_num + j
      if (i > 0 && j > 0) {
        indices.data.push(
          index - y_num, index - y_num - 1, index - 1,
          index - y_num, index - 1, index
        )
      }
    }
  }
  return {position, indices, normal}
}

const waterPlane = createWaterPlane(100, 100, 1, 1)
console.log(waterPlane)
const waterPlaneBufferInfo = webglUtils.createBufferInfoFromArrays(gl, waterPlane)

// 画个地板
const plane = {
  position: {
    numComponents: 3, 
    data: [
      -0.5, 0, -0.5,
      -0.5, 0, 0.5,
      0.5, 0, 0.5,
      -0.5, 0, -0.5,
      0.5, 0, 0.5,
      0.5, 0, -0.5
    ]
  },
  normal: {
    numComponents: 3, 
    data: [
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0
    ]
  }
}
const planeBuffer = webglUtils.createBufferInfoFromArrays(gl, plane)

const camera = {
  position: [0, 100, 100],
  target: [0, 0, 0],
  up: [0, 1, 0]
}

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

  // 透视矩阵
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000)

  // 相机矩阵
  const cameraMatrix = m4.lookAt(camera.position, camera.target, camera.up)

  // 视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)

  // 使用着色器
  gl.useProgram(programInfo.program)

  webglUtils.setUniforms(programInfo, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_reverseLightDirection: [1, 2, 3]
  })

  let u_world

  // 池子，5块板子
  let bottom = m4.identity()
  bottom = m4.translate(bottom, 0, 0, 0)
  bottom = m4.scale(bottom, 100, 1, 100)
  let left = m4.identity()
  left = m4.translate(left, -50, 20, 0)
  left = m4.zRotate(left, degToRad(-90))
  left = m4.scale(left, 40, 1, 100)
  let right = m4.identity()
  right = m4.translate(right, 50, 20, 0)
  right = m4.zRotate(right, degToRad(90))
  right = m4.scale(right, 40, 1, 100)
  let near = m4.identity()
  near = m4.translate(near, 0, 20, 50)
  near = m4.xRotate(near, degToRad(-90))
  near = m4.scale(near, 100, 1, 40)
  let far = m4.identity()
  far = m4.translate(far, 0, 20, -50)
  far = m4.xRotate(far, degToRad(90))
  far = m4.scale(far, 100, 1, 40)

  const pool = [bottom, left, right, near, far]
  pool.forEach(item => {
    webglUtils.setUniforms(programInfo, {
      u_world: item,
      u_color: [0.7, 0.7, 0.7, 1]
    })
    webglUtils.setBuffersAndAttributes(gl, programInfo, planeBuffer)
    gl.drawArrays(gl.TRIANGLES, 0, planeBuffer.numElements)
  })

  // 水面
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  u_world = m4.identity()
  u_world = m4.xRotate(u_world, degToRad(-90))
  u_world = m4.translate(u_world, -50, -50, 30)
  webglUtils.setUniforms(programInfo, {
    u_world: u_world,
    u_color: [0, 0, 1, 0.4]
  })

  webglUtils.setBuffersAndAttributes(gl, programInfo, waterPlaneBufferInfo)
  gl.drawElements(gl.TRIANGLES, waterPlaneBufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
}

render()

addViewEvent(gl, camera, render)
