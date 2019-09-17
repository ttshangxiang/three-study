
// 添加canvas
const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

// 获取gl
const gl = canvas.getContext('webgl')

// 顶点着色器
const vertexShaderSource = `
  // 一个属性值，将会从缓冲中获取数据
  attribute vec4 a_position;
  // 一个矩阵，将所有点映射到xyz-1，1的范畴
  uniform mat4 u_matrix;
  // 法向量
  attribute vec3 a_normal;
  // 世界矩阵求逆并转置，用于实时修改法向量
  uniform mat4 u_worldInverseTranspose;
  // 传递法向量到片段着色器
  varying vec3 v_normal;
  // 所有着色器都有一个main方法
  void main() {
    // gl_Position 是一个顶点着色器主要设置的变量
    gl_Position = u_matrix * a_position;

    // 重定向法向量并传递给片断着色器
    v_normal = mat3(u_worldInverseTranspose) * a_normal;
  }
`

// 片元着色器
const fragmentShaderSource = `
  // 片断着色器没有默认精度，所以我们需要设置一个精度
  // mediump是一个不错的默认值，代表“medium precision”（中等精度）
  precision mediump float;

  // 接受从顶点着色器获取的法向量
  varying vec3 v_normal;

  // 光线的逆
  uniform vec3 u_reverseLightDirection;
  
  void main() {
    // 归一化，因为插值可能不是归一向量
    vec3 normal = normalize(v_normal);

    // 计算点乘，1是正对着，-1是相反
    float light = dot(normal, u_reverseLightDirection);

    // gl_FragColor是一个片断着色器主要设置的变量
    gl_FragColor = vec4(1, 0, 0.5, 1); // 返回“瑞迪施紫色”

    gl_FragColor.rgb *= light;
  }
`

// 创建着色器方法，输入参数：渲染上下文，着色器类型，数据源
function createShader(gl, type, source) {
  var shader = gl.createShader(type); // 创建着色器对象
  gl.shaderSource(shader, source); // 提供数据源
  gl.compileShader(shader); // 编译 -> 生成着色器
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

// 创建着色程序
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
var program = createProgram(gl, vertexShader, fragmentShader);

// 寻找a_position属性值位置
var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

// 寻找a_normal属性值位置
var normalLocation = gl.getAttribLocation(program, "a_normal");

// 寻找u_matrix属性值的位置
var matrixLocation = gl.getUniformLocation(program, "u_matrix");

// 寻找u_worldInverseTranspose属性值的位置
var worldInverseTransposeLocation = gl.getUniformLocation(program, "u_worldInverseTranspose");

// 寻找u_reverseLightDirection属性值的位置
var reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

// 创建一个缓冲
var positionBuffer = gl.createBuffer();

// 绑定位置信息缓冲
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// 生成立方体
import BoxGeometry from './BoxGeometry.js'
const box = new BoxGeometry(2, 2, 2)

// 立方体数据
const positions = box.pointsData


gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// 视图
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

// 清空画布
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);

// 告诉它用我们之前写好的着色程序（一个着色器对）
gl.useProgram(program);

// 启用对应属性
gl.enableVertexAttribArray(positionAttributeLocation);

// 告诉属性怎么从positionBuffer中读取数据 (ARRAY_BUFFER)
var size = 3;          // 每次迭代运行提取两个单位数据
var type = gl.FLOAT;   // 每个单位的数据类型是32位浮点型
var normalize = false; // 不需要归一化数据
var stride = 0;        // 0 = 移动单位数量 * 每个单位占用内存（sizeof(type)）
// 每次迭代运行运动多少内存到下一个数据开始点
var offset = 0;        // 从缓冲起始位置开始读取
gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset)

// 角度换弧度
function degToRad(d) {
  return d * Math.PI / 180;
}

// 传递法向量
gl.enableVertexAttribArray(normalLocation);
var normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(box.normalsData), gl.STATIC_DRAW)

// Tell the attribute how to get data out of normalBuffer (ARRAY_BUFFER)
var size = 3;          // 3 components per iteration
var type = gl.FLOAT;   // the data is 32bit floating point values
var normalize = false; // normalize the data (convert from 0-255 to 0-1)
var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
var offset = 0;        // start at the beginning of the buffer
gl.vertexAttribPointer(
    normalLocation, size, type, normalize, stride, offset);

// 开启只画正面
gl.enable(gl.CULL_FACE);
// 开启深度测试
gl.enable(gl.DEPTH_TEST);

// 计算投影矩阵
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var zNear = 1;
var zFar = 2000;
var projectionMatrix = m4.perspective(degToRad(60), aspect, zNear, zFar);

// 计算相机的矩阵
// 相机位置
const cameraPosition = [0, 3, 5]
// 看向何方
const fPosition = [0, 0, 0]
// 上方
const up = [0, 1, 0]
var cameraMatrix = m4.lookAt(cameraPosition, fPosition, up)

// 光线的方向
gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

// 视角矩阵，等于相机矩阵的逆
var viewMatrix = m4.inverse(cameraMatrix)

// 物体的矩阵，等于投影矩阵乘视角矩阵
var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

// gui
const gui = new dat.GUI()
const controls = new function () {
  this.worldRotationX = 0
  this.worldRotationY = 0
  this.worldRotationZ = 0
}

gui.add(controls, 'worldRotationX', 0, 360)
gui.add(controls, 'worldRotationY', 0, 360)
gui.add(controls, 'worldRotationZ', 0, 360)

function render () {
  requestAnimationFrame(render)
    // 世界矩阵
  var worldMatrix = m4.xRotation(degToRad(controls.worldRotationX));
  worldMatrix = m4.yRotate(worldMatrix, degToRad(controls.worldRotationY));
  worldMatrix = m4.zRotate(worldMatrix, degToRad(controls.worldRotationZ));
  // 世界投影矩阵
  var worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);

  // 世界矩阵逆的转置
  var worldInverseMatrix = m4.inverse(worldMatrix);
  var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
  gl.uniformMatrix4fv(worldInverseTransposeLocation, false, worldInverseTransposeMatrix);

  // 画
  function draw (matrix) {
    // 设置矩阵
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // 运行GLSL着色程序
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = positions.length / 3;
    gl.drawArrays(primitiveType, offset, count);
  }

  // 多画几个
  draw(worldViewProjectionMatrix)
  draw(m4.translate(worldViewProjectionMatrix, 4, 0, 0))
  draw(m4.translate(worldViewProjectionMatrix, -4, 0, 0))
}

render()
