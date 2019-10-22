
import addViewEvent from './view.js'
import { tilesShader, waterShader, shadowShader, skycubeShader } from './shader.js'
import shadow from './shadow.js'
import getObjects from './objects.js'
import skycube from './skycube.js'
import CubeCamera from './cubeCamera.js'

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

// 获取着色器
const tilesProgramInfo = webglUtils.createProgramInfo(gl, [tilesShader.vertex, tilesShader.fragment])
const waterProgramInfo = webglUtils.createProgramInfo(gl, [waterShader.vertex, waterShader.fragment])
const shadowProgrameInfo = webglUtils.createProgramInfo(gl, [shadowShader.vertex, shadowShader.fragment])
const skycubeProgrameInfo = webglUtils.createProgramInfo(gl, [skycubeShader.vertex, skycubeShader.fragment])

// 获取物体
const { waterObj, tilesObjs, sphereObj } = getObjects(gl)

function degToRad(d) {
  return d * Math.PI / 180;
}

// 视角
const fieldOfViewRadians = degToRad(60)

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
  render()
})

// gui
const gui = new dat.GUI()
const controls = new function () {
  this.type = 0
  this.step = 8
  this.speed = 4
  this.height = 4
  this.division = true
  this.linearAngle = 0
  this.waveX = 0
  this.waveZ = 100
}

gui.add(controls, 'type', { Linear: 0, Circle: 1 })
gui.add(controls, 'step', 8, 64).step(8)
gui.add(controls, 'speed', 1, 10).step(1)
gui.add(controls, 'height', 0.5, 64).step(1)
gui.add(controls, 'division')
gui.add(controls, 'linearAngle', 0, 90).step(1)
gui.add(controls, 'waveX', 0, 100).step(1)
gui.add(controls, 'waveZ', 0, 100).step(1)

// 创建阴影深度贴图
const depthTextureParams = shadow.createDepthTexture(gl)

// 创建天空贴图
const skyCubeTextureParams = skycube.createSkyCube(gl, render)

// 创建动态贴图
const cubeCamera = new CubeCamera(gl, 1, 2000)

const camera = {
  position: [0, 100, 100],
  target: [0, 0, 0],
  up: [0, 1, 0]
}

// 光线
const u_reverseLightDirection = [1, 2, 1]

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

  // 生成阴影并返回贴图与矩阵
  const { depthTexture, textureMatrix } = shadow.drawShadow(gl, shadowProgrameInfo, depthTextureParams, [].concat(tilesObjs))

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // 透视矩阵
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000)

  // 相机矩阵
  const cameraMatrix = m4.lookAt(camera.position, camera.target, camera.up)

  // 视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)

  // 天空图
  // skycube.drawSkyCube(gl, skycubeProgrameInfo, skyCubeTextureParams, {
  //   viewMatrix, projectionMatrix
  // })

  drawTiles(gl, tilesProgramInfo, projectionMatrix, viewMatrix, depthTexture, textureMatrix)

  // 获取天空图
  const cubeCameraCenter = [0, 30, 0];
  const cubeCameraTexture = cubeCamera.getTexture(gl, cubeCameraCenter, face => {
    // skycube.drawSkyCube(gl, skycubeProgrameInfo, skyCubeTextureParams, {
    //   viewMatrix: face.viewMatrix, projectionMatrix: face.projectionMatrix
    // })
    drawTiles(gl, tilesProgramInfo, face.projectionMatrix, face.viewMatrix, depthTexture, textureMatrix)
  }, imageLoaded)

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  // skycube.drawSkyCube(gl, skycubeProgrameInfo, {buffer: skyCubeTextureParams.buffer, texture: cubeCameraTexture}, {
  //   viewMatrix: viewMatrix, projectionMatrix: projectionMatrix
  // })

  // 水面
  gl.useProgram(waterProgramInfo.program)
  webglUtils.setUniforms(waterProgramInfo, Object.assign({}, waterObj.uniforms, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_reverseLightDirection: u_reverseLightDirection,
    u_cameraPosition: camera.position,
    u_cubeCameraCenter: cubeCameraCenter,
    u_cubeCameraTexture: cubeCameraTexture,
    u_skybox: skyCubeTextureParams.texture
  }))

  webglUtils.setBuffersAndAttributes(gl, waterProgramInfo, waterObj.buffer)

  // 水波
  const normalData = []
  const positionData = []
  // Math.sin(time * .1)
  // y = sin(x)的导数是cos(x)，导数就是那点的切线斜率
  // 法线斜率 = -1 / 切线斜率
  // 点(x0, y0)到直线Ax + By + C = 0的距离d = Math.abs(A*x0 + B*y0 + C) / Math.sqrt(A*A + B*B)
  const w_height = controls.division ? 1 / controls.height : controls.height
  const point0 = [controls.waveX, 0, controls.waveZ]
  const deg = controls.linearAngle * Math.PI / 180
  const k = Math.tan(deg)
  for (let i = 0; i <= 100; i++) {
    const step = controls.step
    const rad = Math.PI * 2 / step
    for (let j = 0; j <= 100; j++) {
      // 直线波浪
      if (controls.type == 0) {
        let d = i
        if (k != 0) {
          const k2 = -1 / k
          d = Math.abs(k2 * i - j) / Math.sqrt(k2 * k2 + 1)
        }
        const x = time * controls.speed - d * rad
        positionData.push(i, w_height * Math.sin(x), j)
        const f = -w_height * Math.cos(x)
        normalData.push(f * Math.cos(deg), 1, -f * Math.sin(deg))
      }
      // 圆形波浪
      else if (controls.type == 1) {
        const dx = i - point0[0]
        const dy = j - point0[2]
        const d = Math.sqrt(dx * dx + dy * dy)
        const x = time * controls.speed - d * rad
        positionData.push(i, w_height * Math.sin(x), j)
        const f = -w_height * Math.cos(x)
        const deg = Math.atan2(dy, dx)
        normalData.push(f * Math.cos(deg), 1, -f * Math.sin(deg))
      }
    }
  }
  const attrib = webglUtils.createAttribsFromArrays(gl, {
    normal2: { numComponents: 3, data: normalData },
    position2: { numComponents: 3, data: positionData }
  });
  webglUtils.setAttributes(waterProgramInfo, attrib)

  gl.drawElements(gl.TRIANGLES, waterObj.buffer.numElements, gl.UNSIGNED_SHORT, 0);
}

function drawTiles(gl, programeInfo, projectionMatrix, viewMatrix, depthTexture, textureMatrix) {
  // 瓷砖
  gl.useProgram(programeInfo.program)
  const objs = [].concat(tilesObjs)
  objs.forEach(o => {
    webglUtils.setUniforms(programeInfo, Object.assign({}, o.uniforms, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_image: texture,
      u_reverseLightDirection: u_reverseLightDirection,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture
    }))
    webglUtils.setBuffersAndAttributes(gl, programeInfo, o.buffer)
    gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
  })
}

addViewEvent(gl, camera, render)

requestAnimationFrame(render)

function run(time) {
  render(time)
  requestAnimationFrame(run)
}

run()
