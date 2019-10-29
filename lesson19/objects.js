import SphereGeometry from '../lesson13/SphereGeometry.js'

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
        position.data.push(i * w, 0, j * h)
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
  const waterPlane = createWaterPlane(200, 200, 1, 1)
  const waterPlaneBufferInfo = webglUtils.createBufferInfoFromArrays(gl, waterPlane)
  let u_world = m4.identity()
  u_world = m4.translate(u_world, -100, 60, -100)
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
  bottom = m4.scale(bottom, 200, 1, 200)
  let left = m4.identity()
  left = m4.translate(left, -100, 40, 0)
  left = m4.zRotate(left, degToRad(-90))
  left = m4.scale(left, 80, 1, 200)
  let right = m4.identity()
  right = m4.translate(right, 100, 40, 0)
  right = m4.zRotate(right, degToRad(90))
  right = m4.scale(right, 80, 1, 200)
  let near = m4.identity()
  near = m4.translate(near, 0, 40, 100)
  near = m4.xRotate(near, degToRad(-90))
  near = m4.scale(near, 200, 1, 80)
  let far = m4.identity()
  far = m4.translate(far, 0, 40, -100)
  far = m4.xRotate(far, degToRad(90))
  far = m4.scale(far, 200, 1, 80)

  const tilesObjs = [
    { buffer: tiles[0], uniforms: { u_world: bottom } },
    { buffer: tiles[1], uniforms: { u_world: left } },
    { buffer: tiles[1], uniforms: { u_world: right } },
    { buffer: tiles[2], uniforms: { u_world: near } },
    { buffer: tiles[2], uniforms: { u_world: far } }
  ]

  // 球一个
  const sphere = new SphereGeometry(10, 64, 32)
  const sphereBuffer = webglUtils.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: sphere.pointsData},
    normal: { numComponents: 3, data: sphere.normalsData}
  })
  u_world = m4.identity()
  u_world = m4.translate(u_world, 0, 10, 0)
  const sphereObj = {
    buffer: sphereBuffer,
    uniforms: {
      u_no_texture: 0.0,
      u_world,
      u_color: [0.9, 0.9, 0.9, 1.0]
    }
  }

  return {
    waterObj,
    tilesObjs,
    sphereObj
  }

}
