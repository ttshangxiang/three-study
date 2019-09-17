
// 生成一个立方体

class BoxGeomerty {
  constructor (x = 1, y = 1, z = 1) {
    x /= 2
    y /= 2
    z /= 2
    const p = [
      [-x, y, z],
      [-x, -y, z],
      [x, y, z],
      [x, -y, z],
      [-x, y, -z],
      [-x, -y, -z],
      [x, y, -z],
      [x, -y, -z]
    ]

    // 面
    this.faces = [
      [0, 1, 2],
      [2, 1, 3],
      [2, 3, 6],
      [6, 3, 7],
      [6, 7, 4],
      [4, 7, 5],
      [4, 5, 0],
      [0, 5, 1],
      [4, 0, 6],
      [6, 0, 2],
      [1, 5, 3],
      [3, 5, 7]
    ]

    // 点
    this.points = []
    // 数据
    this.pointsData = []
    this.faces.forEach(item => {
      item.forEach(ii => {
        this.points.push(p[ii])
        this.pointsData = this.pointsData.concat(p[ii])
      })
    })
    
    const n = [
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, -1],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0]
    ]
    // 法向量
    this.normalsData = []
    this.normals = this.points.map((item, index) => {
      const i = Math.floor(index / 6)
      this.normalsData = this.normalsData.concat(n[i])
      return n[i]
    })
  }
}

export default BoxGeomerty
