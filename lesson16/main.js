
import BoxGeometry from '../lesson10/BoxGeometry.js'
import SphereGeometry from '../lesson13/SphereGeometry.js'

// 添加canvas
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

// 获取gl
const gl = canvas.getContext('webgl')
if (!gl) {
  throw Error('webgl')
}

// 打开深度纹理扩展
const ext = gl.getExtension('WEBGL_depth_texture')
if (!ext) {
  throw Error('need WEBGL_depth_texture')
}

// 获取两对着色器
const textureProgramInfo = webglUtils.createProgramInfo(gl, ['3d-vertex-shader', '3d-fragment-shader'])
const colorProgramInfo = webglUtils.createProgramInfo(gl, ['color-vertex-shader', 'color-fragment-shader'])

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

// 画个方块

const box = new BoxGeometry(1, 1, 1)
const boxBuffer = webglUtils.createBufferInfoFromArrays(gl, {
  position: {numComponents: 3, data: box.pointsData},
  normal: {numComponents: 3, data: box.normalsData}
})

// 画个球

const sphere = new SphereGeometry(1, 48, 24)
const sphereBuffer = webglUtils.createBufferInfoFromArrays(gl, {
  position: {numComponents: 3, data: sphere.pointsData},
  normal: {numComponents: 3, data: sphere.normalsData}
})

function degToRad(d) {
  return d * Math.PI / 180;
}

// 视角
const fieldOfViewRadians = degToRad(60)

// 灯光位置
let lightPosition = [10, 10, 5]
// gui
const gui = new dat.GUI()
const controls = new function () {
  this.lightX = 100
  this.lightY = 100
  this.lightZ = 100
  this.cameraX = 20
  this.cameraY = 5
  this.cameraZ = 0
}

gui.add(controls, 'lightX', -100, 100).onChange(render)
gui.add(controls, 'lightY', -100, 100).onChange(render)
gui.add(controls, 'lightZ', -100, 100).onChange(render)
gui.add(controls, 'cameraX', -100, 100).onChange(render)
gui.add(controls, 'cameraY', -100, 100).onChange(render)
gui.add(controls, 'cameraZ', -100, 100).onChange(render)

// 创建深度纹理
const depthTexture = gl.createTexture();
const depthTextureSize = 2048;
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
    gl.TEXTURE_2D,      // target
    0,                  // mip level
    gl.DEPTH_COMPONENT, // internal format
    // gl.RGBA,
    depthTextureSize,   // width
    depthTextureSize,   // height
    0,                  // border
    gl.DEPTH_COMPONENT, // format
    // gl.RGBA,
    gl.UNSIGNED_INT,    // type
    // gl.UNSIGNED_BYTE,
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
    // gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,        // texture target
    depthTexture,         // texture
    0);                   // mip level

// 绘制深度纹理
const settings = {
  fieldOfView: degToRad(90),
  projWidth: 1,
  projHeight: 1
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

  lightPosition = [controls.lightX, controls.lightY, controls.lightZ]

  // 绘制到纹理
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer)
  gl.viewport(0, 0, depthTextureSize, depthTextureSize)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // 绘制纹理
  // 灯光透视矩阵
  const l_aspect = settings.projWidth / settings.projHeight
  const l_projectionMatrix = m4.perspective(settings.fieldOfView, l_aspect, 1, 2000)

  // 灯光相机矩阵
  const l_cameraPosition = lightPosition
  const l_target = [0, 0, 0]
  const l_up = [0, 1, 0]
  const l_cameraMatrix = m4.lookAt(l_cameraPosition, l_target, l_up)

  // 灯光视图矩阵
  const l_viewMatrix = m4.inverse(l_cameraMatrix)

  gl.frontFace(gl.CW);
  drawScene(colorProgramInfo, l_viewMatrix, l_cameraMatrix, l_projectionMatrix, m4.identity())
  gl.frontFace(gl.CCW);

  // 绘制到场景
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // 将灯光透视、视图矩阵转换到0-1的区间
  let textureMatrix = m4.identity();
  textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
  textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
  textureMatrix = m4.multiply(textureMatrix, l_projectionMatrix);
  textureMatrix = m4.multiply(textureMatrix, l_viewMatrix);


  // 透视矩阵
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000)

  // 相机矩阵
  const cameraPosition = [controls.cameraX, controls.cameraY, controls.cameraZ]
  const target = [0, 0, 0]
  const up = [0, 1, 0]
  const cameraMatrix = m4.lookAt(cameraPosition, target, up)

  // 视图矩阵
  const viewMatrix = m4.inverse(cameraMatrix)
  
  drawScene(textureProgramInfo, viewMatrix, cameraPosition, projectionMatrix, textureMatrix)
}

function drawScene (programInfo, viewMatrix, cameraPosition, projectionMatrix, textureMatrix) {
  // 使用着色器
  gl.disable(gl.BLEND);
  gl.useProgram(programInfo.program)
  webglUtils.setUniforms(programInfo, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_lightWorldPosition: lightPosition,
    u_viewWorldPosition: cameraPosition,
    u_shininess: 50.0,
    u_lightColor: [1, 1, 1],
    u_specularColor: [1, 1, 1],
    u_textureMatrix: textureMatrix,
    u_projectedTexture: depthTexture
  })
  webglUtils.setBuffersAndAttributes(gl, programInfo, planeBuffer)
  drawSome(programInfo, planeBuffer, {
    u_world: m4.scaling(20, 1, 10),
    u_color: [1, 1, 1, 1]
  })

  if (programInfo === textureProgramInfo) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const objects = [
      {
        text: '绿',
        param: {
          u_world: m4.scale(m4.translation(0, 1, 0), 2, 2, 2),
          u_color: [0, 1, 0, 0.5]
        },
        buffer: boxBuffer
      },
      {
        text: '红',
        param: {
          u_world: m4.translation(-5, 1, 0),
          u_color: [1, 0, 0, 0.5]
        },
        buffer: sphereBuffer
      },
      {
        text: '蓝',
        param: {
          u_world: m4.translation(5, 1, 0),
          u_color: [0, 0, 1, 0.5]
        },
        buffer: sphereBuffer
      }
    ]

    // 根据深度排序
    const matrix = m4.multiply(projectionMatrix, viewMatrix);
    objects.forEach(item => {
      const u_world = item.param.u_world
      const point = m4.transformPoint(viewMatrix, [u_world[12], u_world[13], u_world[14]])
      item.depth = -point[2]
    })
    objects.sort((a, b) => {
      return b.depth - a.depth;
    })
    objects.forEach(item => {
      drawSome(programInfo, item.buffer, item.param)
    })
  }
}

function drawSome (programInfo, buffer, params) {
  webglUtils.setBuffersAndAttributes(gl, programInfo, buffer)
  webglUtils.setUniforms(programInfo, Object.assign({
    u_worldInverseTranspose: m4.transpose(m4.inverse(m4.copy(params.u_world))),
  }, params))
  gl.drawArrays(gl.TRIANGLES, 0, buffer.numElements)
}

render()