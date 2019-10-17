
import addViewEvent from './view.js'
import { tilesShader, waterShader, shadowShader, skycubeShader } from './shader.js'
import shadow from './shadow.js'
import getObjects from './objects.js'
import reflect from './reflect.js'
import refract from './refract.js'
import skycube from './skycube.js'

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
const { waterObj, tilesObjs, skycubeObj } = getObjects(gl)

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
image.src = "./tiles.jpg";
image.addEventListener('load', function () {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
  gl.generateMipmap(gl.TEXTURE_2D)

  render()
})

// 创建阴影深度贴图
const depthTextureParams = shadow.createDepthTexture(gl)

// 创建镜像贴图
const mirrorTextureParams = reflect.createMirrorTexture(gl)

// 创建折射贴图
const refractTextureParams = refract.createRefractTexture(gl)

// 创建天空贴图
const skyCubeTextureParams = skycube.createSkyCube(gl, render)

const camera = {
  position: [0, 100, 100],
  target: [0, 0, 0],
  up: [0, 1, 0]
}

// 绘制场景
function render() {
  // 重置尺寸
  webglUtils.resizeCanvasToDisplaySize(gl.canvas)
  // 隐藏背面
  gl.enable(gl.CULL_FACE);
  // 开启深度测试
  gl.enable(gl.DEPTH_TEST);
  // 背景
  gl.clearColor(0, 0, 0, 1)

  // 生成阴影并返回贴图与矩阵
  const { depthTexture, textureMatrix } = shadow.drawShadow(gl, shadowProgrameInfo, depthTextureParams, tilesObjs)

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

  // 光线
  const u_reverseLightDirection = [1, 2, 1]

  // 瓷砖
  gl.useProgram(tilesProgramInfo.program)
  tilesObjs.forEach(o => {
    webglUtils.setUniforms(tilesProgramInfo, Object.assign({}, o.uniforms, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_image: texture,
      u_reverseLightDirection: u_reverseLightDirection,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture
    }))
    webglUtils.setBuffersAndAttributes(gl, tilesProgramInfo, o.buffer)
    gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
  })

  const mirror = { position: [0, 30, 0], normal: [0, 1, 0] }

  // 镜像
  let reflect_mat = m4.identity()
  reflect.drawReflect(gl, camera, mirror, mirrorTextureParams, (mirror_camera_position, mirror_camera_target) => {
    // 相机矩阵
    const mir_cameraMatrix = m4.lookAt(mirror_camera_position, mirror_camera_target, camera.up)
    // 视图矩阵
    const mir_viewMatrix = m4.inverse(mir_cameraMatrix)
    reflect_mat = mir_viewMatrix

    // 天空图
    skycube.drawSkyCube(gl, skycubeProgrameInfo, skyCubeTextureParams, {
      viewMatrix: mir_viewMatrix, projectionMatrix
    })

    // 瓷砖
    gl.useProgram(tilesProgramInfo.program)
    tilesObjs.forEach(o => {
      webglUtils.setUniforms(tilesProgramInfo, Object.assign({}, o.uniforms, {
        u_view: mir_viewMatrix,
        u_projection: projectionMatrix,
        u_image: texture,
        u_reverseLightDirection: u_reverseLightDirection,
        u_textureMatrix: textureMatrix,
        u_projectedTexture: depthTexture
      }))
      webglUtils.setBuffersAndAttributes(gl, tilesProgramInfo, o.buffer)
      gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
    })

    gl.bindTexture(gl.TEXTURE_2D, mirrorTextureParams.targetTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  })

  // 折射
  let refract_mat = m4.identity()
  let has_refract = 1
  let underWater = 0
  refract.drawRefract(gl, camera, mirror, refractTextureParams, (result, no_refract) => {

    // 全反射
    if (no_refract) {
      has_refract = 0
      return
    }

    const { refract_camera_position, refract_camera_target } = result
    underWater = result.underWater

    // 相机矩阵
    const mir_cameraMatrix = m4.lookAt(refract_camera_position, refract_camera_target, camera.up)
    // 视图矩阵
    const mir_viewMatrix = m4.inverse(mir_cameraMatrix)
    refract_mat = mir_viewMatrix

    // 天空图
    skycube.drawSkyCube(gl, skycubeProgrameInfo, skyCubeTextureParams, {
      viewMatrix: mir_viewMatrix, projectionMatrix
    })

    // 瓷砖
    gl.useProgram(tilesProgramInfo.program)
    tilesObjs.forEach(o => {
      webglUtils.setUniforms(tilesProgramInfo, Object.assign({}, o.uniforms, {
        u_view: mir_viewMatrix,
        u_projection: projectionMatrix,
        u_image: texture,
        u_reverseLightDirection: u_reverseLightDirection,
        u_textureMatrix: textureMatrix,
        u_projectedTexture: depthTexture
      }))
      webglUtils.setBuffersAndAttributes(gl, tilesProgramInfo, o.buffer)
      gl.drawArrays(gl.TRIANGLES, 0, o.buffer.numElements)
    })
    gl.bindTexture(gl.TEXTURE_2D, refractTextureParams.targetTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
  })

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  // 水面
  gl.useProgram(waterProgramInfo.program)
  webglUtils.setUniforms(waterProgramInfo, Object.assign({}, waterObj.uniforms, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_reverseLightDirection: u_reverseLightDirection,
    u_reflect_mat: reflect_mat,
    u_reflectImage: mirrorTextureParams.targetTexture,
    u_has_refract: has_refract,
    u_refract_mat: refract_mat,
    u_refractImage: refractTextureParams.targetTexture,
    u_underWater: underWater
  }))
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  webglUtils.setBuffersAndAttributes(gl, waterProgramInfo, waterObj.buffer)
  gl.drawElements(gl.TRIANGLES, waterObj.buffer.numElements, gl.UNSIGNED_SHORT, 0);
}

render()

addViewEvent(gl, camera, render)
