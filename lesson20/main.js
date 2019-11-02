
import addViewEvent from './view.js'
import { tilesShader, waterShader, shadowShader, skycubeShader  } from './shader.js'
import shadow from './shadow.js'
import getObjects from './objects.js'
import skycube from './skycube.js'
import CubeCamera from './cubeCamera.js'
import addPointClickEvent from './clickPoint.js'
import waveShadow from './waveShadow.js'
import water from './water.js'

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
// const gui = new dat.GUI()
// const controls = new function () {
// }

// 创建阴影深度贴图
const depthTextureParams = shadow.createDepthTexture(gl)

// 创建天空贴图
const skyCubeTextureParams = skycube.createSkyCube(gl, render)

// 初始化水波参数
water.waterInit(gl)

const camera = {
  position: [0, 200, 200],
  target: [0, 0, 0],
  up: [0, 1, 0]
}

// 光线
const u_reverseLightDirection = m4.normalize([1, 2, 1])

// 绘制场景
let then = 0;

let waveList = []
let setClickParams = null
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

  // 点击产生波浪
  if (!setClickParams) {
    setClickParams = addPointClickEvent(gl, point => {
      
      water.addDrop(point[0] / 100, -point[2] / 100, 0.03, 0.02)
    })

    setClickParams({
      cross_face: [
        [-100, 60, -100], [-100, 60, 100], [100, 60, 100],
        [-100, 60, -100], [100, 60, 100], [100, 60, -100]
      ]
    })
  }
  const n_projectionMatrix = m4.inverse(projectionMatrix)
  setClickParams({
    n_projectionMatrix: n_projectionMatrix,
    n_viewMatrix: cameraMatrix
  })

  // 更新水波动画(执行两次速度变快)
  water.stepSimulation()
  water.stepSimulation()
  // 更新水波法线
  const outputTexture = water.updateNormals()

  const cubeCameraCenter = [0, 60, 0];

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  drawTiles(gl, tilesProgramInfo, projectionMatrix, viewMatrix, depthTexture, textureMatrix, outputTexture)

  // 水面
  gl.useProgram(waterProgramInfo.program)
  webglUtils.setUniforms(waterProgramInfo, Object.assign({}, waterObj.uniforms, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_reverseLightDirection: u_reverseLightDirection,
    u_cameraPosition: camera.position,
    u_cubeCameraCenter: cubeCameraCenter,
    // u_cubeCameraTexture: cubeCameraTexture,
    u_skybox: skyCubeTextureParams.texture,
    u_image: texture,
    u_textureMatrix: textureMatrix,
    u_projectedTexture: depthTexture,
    u_waveShadowTexture: outputTexture.texture,
  }))

  webglUtils.setBuffersAndAttributes(gl, waterProgramInfo, waterObj.buffer)

  gl.drawElements(gl.TRIANGLES, waterObj.buffer.numElements, gl.UNSIGNED_SHORT, 0);

}

function drawTiles(gl, programeInfo, projectionMatrix, viewMatrix, depthTexture, textureMatrix, outputTexture) {
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
      u_projectedTexture: depthTexture,
      // u_waveShadowTexture: waveShadowTextureParams.targetTexture
      u_waveShadowTexture: outputTexture.texture,
    }))
    webglUtils.setBuffersAndAttributes(gl, programeInfo, o.buffer)
    gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
  })
}

addViewEvent(gl, camera, () => {})

function run(time) {
  render(time)
  requestAnimationFrame(run)
}

run()
