

// 方法
const functions = `
// adapted from intersectCube in https://github.com/evanw/webgl-path-tracing/blob/master/webgl-path-tracing.js

// compute the near and far intersections of the cube (stored in the x and y components) using the slab method
// no intersection means vec.x > vec.y (really tNear > tFar)
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
    vec3 tMin = (boxMin - rayOrigin) / rayDir;
    vec3 tMax = (boxMax - rayOrigin) / rayDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
}

float rand(vec2 co){
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}
 
`

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

    float currentDepth = projectedTexcoord.z - 0.00098;
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
  uniform float u_no_texture;
  uniform vec4 u_color;
  
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
  attribute vec4 a_position2;
  attribute vec3 a_normal2;
  
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  
  varying vec3 v_worldNormal;
  varying vec2 v_texcoord;
  varying vec3 v_worldPosition;
  ${functions}
  
  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_texcoord = a_texcoord;
    
    v_worldPosition = (u_world * a_position).xyz;
    v_worldNormal = mat3(u_world) * a_normal;
  }
  `,
  fragment: `
  precision mediump float;
  
  uniform vec4 u_color;
  uniform vec3 u_reverseLightDirection;
  uniform vec3 u_cameraPosition;
  uniform vec3 u_cubeCameraCenter;
  uniform samplerCube u_cubeCameraTexture;
  uniform samplerCube u_skybox;
  
  varying vec3 v_worldNormal;
  varying vec2 v_texcoord;
  varying vec3 v_worldPosition;
  ${functions}

  vec4 getColor (vec3 origin, vec3 ray) {
    vec2 t = intersectAABB(origin, ray, vec3(-50, 0, -50), vec3(50, 80, 50));
    vec3 hit = origin + ray * t.y;
    if (hit.y > 39.999) {
      return textureCube(u_skybox, ray);
    } else {
      vec3 direction = normalize(hit - u_cubeCameraCenter);
      return textureCube(u_cubeCameraTexture, direction);
    }

  }
  
  void main() {

    vec3 worldNormal = normalize(v_worldNormal);

    vec3 eyeToSurfaceDir = normalize(v_worldPosition - u_cameraPosition);

    vec3 reflectedRay = reflect(eyeToSurfaceDir, worldNormal);
    vec4 reflectedColor = getColor(v_worldPosition, reflectedRay);
    
    float ratio = 1.00 / 1.333;
    vec4 refractedColor;

    // 水上
    if (u_cameraPosition.y >= u_cubeCameraCenter.y) {
      float fresnel = mix(0.25, 1.0, pow(1.0 - dot(worldNormal, -eyeToSurfaceDir), 3.0));
      vec3 refractedRay = refract(eyeToSurfaceDir, worldNormal, ratio);
      refractedColor = getColor(v_worldPosition, refractedRay);
      gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel).rgb, 1.0);
      // 水下
    } else {
      float fresnel = mix(0.5, 1.0, pow(1.0 - dot(-worldNormal, -eyeToSurfaceDir), 3.0));
      vec3 refractedRay = refract(eyeToSurfaceDir, -worldNormal, 1.0 / ratio);
      refractedColor = getColor(v_worldPosition, refractedRay);
      gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel) * length(refractedRay)).rgb, 1.0);
    }
    
    float light = dot(worldNormal, u_reverseLightDirection);

    gl_FragColor.rbg *= 0.6 + 0.2 * light;

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
