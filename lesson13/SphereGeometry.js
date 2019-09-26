
// 球形

export default class SphereGeometry {

  constructor (radius, widthSegments, heightSegments) {
    if (widthSegments < 3 || heightSegments < 2) {
      throw new Error('widthSegments or heightSegments is too small')
    }

    // 固定点
    const top = [0, radius, 0]
    const bottom = [0, -radius, 0]

    // 竖向分割，求初始弧线，x的负方向为起点
    const arc_o = []
    for (let i = 1; i < heightSegments; i++) {
      const rad = Math.PI / heightSegments * i
      arc_o.push([-Math.sin(rad) * radius, Math.cos(rad) * radius, 0])
    }

    // 横向分割，得出弧线z与弧线组
    const arcs = []
    for (let i = 0; i < widthSegments; i++) {
      let rad = 0
      if (i !== 0) {
        rad = 2 * Math.PI / widthSegments * i
      }
      const arc = []
      arc_o.forEach(item => {
        const point = []
        point[0] = -Math.cos(rad) * Math.abs(item[0])
        point[1] = item[1]
        point[2] = Math.sin(rad) * Math.abs(item[0])
        arc.push(point)
      })

      // 将头底塞入
      arc.unshift(top)
      arc.push(bottom)
      arcs.push(arc)
    }

    // 构造点、法线
    this.points = []
    this.normals = []
    this.faces = []
    this.pointsData = []
    this.normalsData = []

    // 遍历弧线，相邻两条弧线构造面，算法向量
    for (let i = 0; i < arcs.length; i++) {
      const current = arcs[i];
      let next = arcs[i + 1]
      // 最后一条跟第一条连接
      if (i === arcs.length - 1) {
        next = arcs[0]
      }

      // 中间部分
      for (let j = 0; j < current.length - 1; j++) {
        // 底部与顶部只有一个面，中间的两个
        if (current[j + 1] !== bottom) {
          // 面
          const face0 = [current[j], current[j + 1], next[j + 1]]
          this.faces.push(face0)
          // 点
          this.points.push(...face0)
          // 法向量
          const normal0 = computeNormal(face0)
          // 三次
          this.normals.push(normal0, normal0, normal0)
        }
        if (current[j] !== top) {
          // 面
          const face1 = [current[j], next[j + 1], next[j]]
          this.faces.push(face1)
          // 点
          this.points.push(...face1)
          // 法向量
          const normal1 = computeNormal(face1)
          // 三次
          this.normals.push(normal1, normal1, normal1)
        }
      }
    }

    this.points.forEach(item => {
      this.pointsData.push(...item)
    })

    this.normals.forEach(item => {
      this.normalsData.push(...item)
    })
  }

}

// 求法线
function computeNormal (arr) {
  const u = m4.subtractVectors(arr[1], arr[0])
  const v = m4.subtractVectors(arr[2], arr[0])
  return m4.normalize(m4.cross(u, v))
}
