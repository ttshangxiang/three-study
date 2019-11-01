
import addViewEvent from './view.js'
import { tilesShader, waterShader, shadowShader, skycubeShader, waveShadowShader  } from './shader.js'
import shadow from './shadow.js'
import getObjects from './objects.js'
import skycube from './skycube.js'
import CubeCamera from './cubeCamera.js'
import addPointClickEvent from './clickPoint.js'
import waveShadow from './waveShadow.js'

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
const waveShadowProgrameInfo = webglUtils.createProgramInfo(gl, [waveShadowShader.vertex, waveShadowShader.fragment])

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
  this.bounce = false
}

gui.add(controls, 'bounce')

// 创建阴影深度贴图
const depthTextureParams = shadow.createDepthTexture(gl)

// 创建天空贴图
const skyCubeTextureParams = skycube.createSkyCube(gl, render)

// 创建动态贴图
// const cubeCamera = new CubeCamera(gl, 1, 2000)

// 创建波浪阴影贴图
const waveShadowTextureParams = waveShadow.createWaveShadowTexture(gl)

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
      waveList.push({ point, t: then })
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

  // 天空图
  // skycube.drawSkyCube(gl, skycubeProgrameInfo, skyCubeTextureParams, {
  //   viewMatrix, projectionMatrix
  // })

  // 获取天空图
  const cubeCameraCenter = [0, 60, 0];
  // const cubeCameraTexture = cubeCamera.getTexture(gl, cubeCameraCenter, face => {
  //   drawTiles(gl, tilesProgramInfo, face.projectionMatrix, face.viewMatrix, depthTexture, textureMatrix)
  // }, imageLoaded)

  const waveDatas = setWavesToTexture(time)

  // 波浪影子
  waveShadow.drawWaveShadow(gl, waveShadowTextureParams, (projectionMatrix, viewMatrix) => {

    gl.useProgram(waveShadowProgrameInfo.program)
    webglUtils.setUniforms(waveShadowProgrameInfo, Object.assign({}, waterObj.uniforms, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_reverseLightDirection: u_reverseLightDirection,
      u_waveLength: waveList.length,
      u_waveDatas: waveDatas,
      u_then: then
    }))

    webglUtils.setBuffersAndAttributes(gl, waveShadowProgrameInfo, waterObj.buffer)

    gl.drawElements(gl.TRIANGLES, waterObj.buffer.numElements, gl.UNSIGNED_SHORT, 0);
  }) 

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  drawTiles(gl, tilesProgramInfo, projectionMatrix, viewMatrix, depthTexture, textureMatrix)

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
    u_waveShadowTexture: waveShadowTextureParams.targetTexture,
    // u_waveDatas: waveDatas,
    // u_waveLength: waveList.length,
    // u_then: then,
    // u_waveDatas2: waveDatas,
    // u_waveLength2: waveList.length,
    // u_then2: then
  }))

  webglUtils.setBuffersAndAttributes(gl, waterProgramInfo, waterObj.buffer)

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
      u_projectedTexture: depthTexture,
      u_waveShadowTexture: waveShadowTextureParams.targetTexture
    }))
    webglUtils.setBuffersAndAttributes(gl, programeInfo, o.buffer)
    gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
  })
}

function setWavesToTexture (time) {

  console.log(waveList.length)
  const v = 40
  const step = 8
  const rad = Math.PI * 2.0 / step
  for (let i = 0; i < waveList.length; i++) {
    const item = waveList[i]
    // 初始距离
    const d0 = item.d0 || 0
    const t = time - item.t
    const d = (v * t - 2 * Math.PI) / rad
    const p = item.point
    if (!item.times) {
      item.times = 0
    }
    // 距离超过对角线长度，舍弃，反弹次数超过，删除
    if (d - d0 > 283 || item.times > 4) {
      waveList.splice(i, 1)
      i--
      continue
    }
    if (!controls.bounce) {
      continue
    }

    // 计算墙面反弹
    // -x，x，-z, z到边界，都新增一个与此点镜面的点，t相同，新增的点屏蔽一些反弹方向
    if (!item.split) {
      item.split = [1, 1, 1, 1]
    }

    if (item.split[0] && p[0] - d < -100) {
      item.split[0] = 0
      const negz = 100 - p[2] < d
      const posz = p[2] - (-100) < d
      waveList.push({point: [p[0] - 2 * d, p[1], p[2]], t: item.t, split: [0, 1, negz, posz], d0: d, times: item.times + 1})
    }
    if (item.split[1] && p[0] + d > 100) {
      item.split[1] = 0
      const negz = 100 - p[2] < d
      const posz = p[2] - (-100) < d
      waveList.push({point: [p[0] + 2 * d, p[1], p[2]], t: item.t, split: [1, 0, negz, posz], d0: d, times: item.times + 1})
    }
    if (item.split[2] && p[2] - d < -100) {
      item.split[2] = 0
      const negx = 100 - p[0] < d
      const posx = p[0] - (-100) < d
      waveList.push({point: [p[0], p[1], p[2] - 2 * d], t: item.t, split: [negx, posx, 0, 1], d0: d, times: item.times + 1})
    }
    if (item.split[3] && p[2] + d > 100) {
      item.split[3] = 0
      const negx = 100 - p[0] < d
      const posx = p[0] - (-100) < d
      waveList.push({point: [p[0], p[1], p[2] + 2 * d], t: item.t, split: [negx, posx, 1, 0], d0: d, times: item.times + 1})
    }
  }

  let datas = []
  for (let i = 0; i < 1000; i++) {
    datas[i] = 0
  }
  waveList.forEach((item, index) => {
    datas[index * 4 + 0] = item.point[0]
    datas[index * 4 + 1] = item.point[1]
    datas[index * 4 + 2] = item.point[2]
    datas[index * 4 + 3] = item.t
  })

  return datas
}

addViewEvent(gl, camera, () => {})

function run(time) {
  render(time)
  requestAnimationFrame(run)
}

run()
