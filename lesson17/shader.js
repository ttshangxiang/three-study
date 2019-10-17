
// 阴影
const shadowVertexDefine = `
  varying vec4 v_projectedTexcoord;
`
const shadowVertex = `
  vec4 worldPosition = u_world * a_position;
  v_projectedTexcoord = u_textureMatrix * worldPosition;
`
const shadowFragment = `
  uniform sampler2D u_projectedTexture;
  varying vec4 v_projectedTexcoord;

  float setShadow () {
    // 阴影部分
    vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;

    float currentDepth = projectedTexcoord.z - 0.0009;
    bool inRange =
        projectedTexcoord.x >= 0.0 &&
        projectedTexcoord.x <= 1.0 &&
        projectedTexcoord.y >= 0.0 &&
        projectedTexcoord.y <= 1.0;

    float texelSize = 1.0 / 2048.0;
    float shadowLight = 0.0;
    
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec4 texel = texture2D(u_projectedTexture, projectedTexcoord.xy + vec2(x, y) * texelSize);
        float texelDepth = texel.r;
        shadowLight += currentDepth < texelDepth ? 1.0 : 0.0;
      }
    }
    shadowLight /= 9.0;

    return shadowLight;
  }
`

// 瓷砖

export const tilesShader = {
  vertex: `
  attribute vec4 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;
  
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform mat4 u_textureMatrix;
  
  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec4 v_position;
  ${shadowVertexDefine}
  
  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
  
    v_normal = mat3(u_world) * a_normal;
    v_texcoord = a_texcoord;
    v_position = u_world * a_position;

    ${shadowVertex}
  }
  `,
  fragment: `
  precision mediump float;
  
  uniform vec3 u_reverseLightDirection;
  uniform sampler2D u_image;
  
  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec4 v_position;
  ${shadowFragment}
  
  void main() {
    gl_FragColor = texture2D(u_image, v_texcoord);
    vec3 normal = normalize(v_normal);
    float light = dot(normal, u_reverseLightDirection);
    if (v_position.y < 30.0) {
      gl_FragColor.rgb *= vec3(0.4, 0.9, 1.0);
    }
    gl_FragColor.rgb *= 0.8 + 0.2 * light;
    gl_FragColor.rgb *= 0.8 + 0.2 * setShadow();

  }
  `
}

// 水面
export const waterShader = {
  vertex: `
  attribute vec4 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;
  
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform mat4 u_reflect_mat;
  uniform mat4 u_refract_mat;
  
  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec4 v_reflect_position;
  varying vec4 v_refract_position;
  
  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
    v_texcoord = a_texcoord;
    
    v_reflect_position = u_projection * u_reflect_mat * u_world * a_position;
    v_refract_position = u_projection * u_refract_mat * u_world * a_position;
  }
  `,
  fragment: `
  precision mediump float;
  
  uniform vec4 u_color;
  uniform vec3 u_reverseLightDirection;
  uniform sampler2D u_reflectImage;
  uniform sampler2D u_refractImage;
  uniform float u_has_refract;
  uniform float underWater;
  
  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec4 v_reflect_position;
  varying vec4 v_refract_position;
  
  void main() {

    // gl_FragColor = u_color;
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

    // 反射
    vec3 reflectTexcoord = v_reflect_position.xyz / v_reflect_position.w;
    float x1 = (reflectTexcoord.x * 0.5 + 0.5);
    float y1 = (reflectTexcoord.y * 0.5 + 0.5);
    vec4 reflect = texture2D(u_reflectImage, vec2(x1, y1));
    

    // 折射
    if (u_has_refract == 1.0) {
      vec3 refractTexcoord = v_refract_position.xyz / v_refract_position.w;
      float x2 = (refractTexcoord.x * 0.5 + 0.5);
      float y2 = (refractTexcoord.y * 0.5 + 0.5);
      vec4 refract = texture2D(u_refractImage, vec2(x2, y2));
      gl_FragColor = vec4(mix(reflect, refract, 0.6));
    } else {
      gl_FragColor.rgb = 0.8 * reflect.rgb;
    }

    // 光照
    // vec3 normal = normalize(v_normal);
    // float light = dot(normal, u_reverseLightDirection);
    // gl_FragColor.rgb *= 0.8 + 0.2 * light;
  }
  `
}

// 影子
export const shadowShader = {
  vertex: `
  attribute vec4 a_position;
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
  }
  `,
  fragment: `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
  `
}

// 天空盒子
export const skycubeShader = {
  vertex: `
  attribute vec4 a_position;
  varying vec4 v_position;
  void main() {
    v_position = a_position;
    gl_Position = a_position;
    gl_Position.z = 0.999999;
  }
  `,
  fragment: `
  precision mediump float;
 
  uniform samplerCube u_skybox;
  uniform mat4 u_viewDirectionProjectionInverse;
  
  varying vec4 v_position;
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_position;
    gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
  }
  `
}
