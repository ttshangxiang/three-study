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

let params = {
  n_projectionMatrix: null,
  n_viewMatrix: null,
  cross_face: null
}

export default function addPointClickEvent (gl, callback) {


  // 点击事件
  window.addEventListener('mousedown', e => {
    const {pageX, pageY} = e
    const {near, far} = clickToPoint(pageX, pageY, gl.canvas.width, gl.canvas.height, params.n_projectionMatrix, params.n_viewMatrix)

    // 射线的起点与方向
    const p0 = near
    const v = m4.normalize(m4.subtractVectors(far, near))

    const r = lineCrossToFace(p0, v, params.cross_face)
    if (!r) {
      return
    }
    const {point} = r
    // 判断边距
    let data = [[],[],[]]
    params.cross_face.forEach(item => {
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
      callback(point)
    }
  })

  return function setClickParams (obj) {
    params = Object.assign(params, obj)
  }
}
