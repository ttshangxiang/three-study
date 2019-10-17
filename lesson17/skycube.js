
function createSkyCube(gl, render) {
  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: './xpos.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: './xneg.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: './ypos.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: './ypos2.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: './zpos.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: './zneg.jpg',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 256;
    const height = 256;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function () {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

      render()
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  const rect = {
    position: {
      numComponents: 2,
      data: [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]
    }
  }

  const buffer = webglUtils.createBufferInfoFromArrays(gl, rect)
  return {
    texture,
    buffer
  }

}

// 画天空图
function drawSkyCube (gl, programeInfo, params, mats) {

  const viewMatrix = m4.copy(mats.viewMatrix)

  viewMatrix[12] = 0;
  viewMatrix[13] = 0;
  viewMatrix[14] = 0;

  const viewDirectionProjectionMatrix = m4.multiply(mats.projectionMatrix, viewMatrix);
  const viewDirectionProjectionInverseMatrix = m4.inverse(viewDirectionProjectionMatrix);

  gl.useProgram(programeInfo.program)
  webglUtils.setUniforms(programeInfo, Object.assign({}, {
    u_skybox: params.texture,
    u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix
  }))
  webglUtils.setBuffersAndAttributes(gl, programeInfo, params.buffer)
  gl.drawArrays(gl.TRIANGLES, 0, params.buffer.numElements)

}

export default {
  createSkyCube,
  drawSkyCube
}
