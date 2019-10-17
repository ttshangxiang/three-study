
function degToRad(d) {
  return d * Math.PI / 180;
}

export default function getObjects (gl) {
  // 水面
  function createWaterPlane(x, y, w, h) {
    const y_num = y + 1
    const position = { numComponents: 3, data: [] }
    const indices = { numComponents: 3, data: [] }
    const normal = { numComponents: 3, data: [] }
    const texcoord = {numComponents: 2, data: []}
    for (let i = 0; i <= x; i++) {
      for (let j = 0; j <= y; j++) {
        position.data.push(i * w, j * h, 0)
        normal.data.push(0, 1, 0)
        texcoord.data.push(i / x, 1 - j / y)

        const index = i * y_num + j
        if (i > 0 && j > 0) {
          // 正面
          indices.data.push(
            index - y_num, index - y_num - 1, index - 1,
            index - y_num, index - 1, index
          )
          // 反面也要
          indices.data.push(
            index - 1, index - y_num - 1, index - y_num,
            index, index - 1, index - y_num
          )
        }
      }
    }
    return { position, indices, normal, texcoord }
  }
  const waterPlane = createWaterPlane(1, 1, 100, 100)
  const waterPlaneBufferInfo = webglUtils.createBufferInfoFromArrays(gl, waterPlane)
  let u_world = m4.identity()
  u_world = m4.xRotate(u_world, degToRad(-90))
  u_world = m4.translate(u_world, -50, -50, 30)
  const waterObj = {
    buffer: waterPlaneBufferInfo,
    uniforms: {
      u_world: u_world,
      u_color: [0.25, 1.0, 1.25, 1]
    }
  }

  // 瓷砖
  function createTile(x, y) {
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
      },
      texcoord: {
        numComponents: 2,
        data: [
          0, 0,
          0, y,
          x, y,
          0, 0,
          x, y,
          x, 0
        ]
      }
    }
    const planeBuffer = webglUtils.createBufferInfoFromArrays(gl, plane)
    return planeBuffer
  }

  const tiles = [
    createTile(1, 1),
    createTile(0.4, 1),
    createTile(1, 0.4)
  ]

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

  const tilesObjs = [
    { buffer: tiles[0], uniforms: { u_world: bottom } },
    { buffer: tiles[1], uniforms: { u_world: left } },
    { buffer: tiles[1], uniforms: { u_world: right } },
    { buffer: tiles[2], uniforms: { u_world: near } },
    { buffer: tiles[2], uniforms: { u_world: far } }
  ]

  return {
    waterObj,
    tilesObjs
  }

}
