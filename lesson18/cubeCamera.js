
// 仿threejs CubeCamera，实时生成天空盒

export default class CubeCamera {

  constructor(gl, near, far) {
    this.cubeTexture = this.createTextureCube(gl)
    this.faces = this.createFaces(gl, near, far)
  }

  createTextureCube(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    return texture;
  }

  createTexture(gl) {
    const targetTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, targetTexture)

    const width = 512;
    const height = 512;

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);

    return {
      targetTexture,
      frameBuffer,
      width,
      height
    }
  }

  createFaces(gl, near, far) {
    const faces = [
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, lookat: [1, 0, 0], up: [0, - 1, 0] },
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, lookat: [-1, 0, 0], up: [0, - 1, 0] },
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, lookat: [0, 1, 0], up: [0, 0, 1] },
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, lookat: [0, -1, 0], up: [0, 0, - 1] },
      { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, lookat: [0, 0, 1], up: [0, - 1, 0] },
      { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, lookat: [0, 0, -1], up: [0, - 1, 0] }
    ]

    const fov = 90, aspect = 1;

    const projectionMatrix = m4.perspective(fov * Math.PI / 180, aspect, near, far);

    faces.map(face => {
      face.projectionMatrix = projectionMatrix
      face._cameraMatrix = m4.lookAt([0, 0, 0], face.lookat, face.up)
      face.texture = this.createTexture(gl)
    })
    return faces;
  }

  getTexture(gl, position, draw, imageLoaded) {
    if (this.finished || !imageLoaded) {
      return this.cubeTexture
    }
    this.faces.forEach(face => {

      const transtionMatrix = m4.translation(position[0], position[1], position[2])
      face.cameraMatrix = m4.multiply(transtionMatrix, face._cameraMatrix)
      face.viewMatrix = m4.inverse(face.cameraMatrix)

      const { width, height } = face.texture

      gl.bindFramebuffer(gl.FRAMEBUFFER, face.texture.frameBuffer)
      gl.viewport(0, 0, width, height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      draw(face)

      const pixels = new Uint8Array(4 * width * height)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)


      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeTexture)
      gl.texImage2D(face.target, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    })
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    this.finished = true
    return this.cubeTexture
  }

}
