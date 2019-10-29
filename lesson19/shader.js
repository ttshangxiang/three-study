

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

vec4 getWaveParams (vec3 position, float waveDatas[400], float then, int u_waveLength) {
  float PI = 3.1415926;
  float step = 8.0;
  float speed = 40.0;
  float rad = PI * 2.0 / step;
  float height = 1.0 / 4.0;
  float incY = 0.0;
  vec3 normal = vec3(0.0, 1.0, 0.0);
  vec3 normal2 = vec3(0.0, 0.0, 0.0);
  bool change = false;

  for (int i = 0; i < 100; i++) {
    if (i >= u_waveLength) {
      break;
    }
    float dx = position.x - waveDatas[i * 4];
    float dz = position.z - waveDatas[i * 4 + 2];
    float t = then - waveDatas[i * 4 + 3];
    float d = sqrt(dx * dx + dz * dz);
    float x = t * speed - d * rad;
    // 衰弱
    float h = height * pow(1.0 - t / 20.0, 3.0);
    h = h < 0.0 ? 0.0 : h;
    if (d * rad >= t * speed - PI * 2.0 && d * rad <= t * speed) {
      change = true;
      incY += h * sin(x);
      float k = h * cos(x);
      normal2 += vec3(k * dx / d, 1, k * dz / d);
    }
  }
  // if (change) {
  //   normal = normal2;
  // }
  return vec4(incY, normal2);
}

vec4 getWallColor (vec3 p, sampler2D u_image) {
  if (p.x < -99.999) {
    return texture2D(u_image, vec2(p.y / 200.0 + 0.5, p.z / 200.0 + 0.5));
  }
  if (p.x > 99.999) {
    return texture2D(u_image, vec2(p.y / 200.0 + 0.5, -p.z / 200.0 + 0.5));
  }
  if (p.z < -99.999) {
    return texture2D(u_image, vec2(p.y / 200.0 + 0.5, p.x / 200.0 + 0.5));
  }
  if (p.z > 99.999) {
    return texture2D(u_image, vec2(p.y / 200.0 + 0.5, -p.x / 200.0 + 0.5));
  }
  if (p.y < 0.001) {
    return texture2D(u_image, vec2(p.x / 200.0 + 0.5, -p.z / 200.0 + 0.5));
  }
}

vec3 getWallNormal (vec3 p) {
  if (p.x < -99.999) {
    return vec3(1.0, 0.0, 0.0);
  }
  if (p.x > 99.999) {
    return vec3(-1.0, 0.0, 0.0);
  }
  if (p.z < -99.999) {
    return vec3(0.0, 0.0, 1.0);
  }
  if (p.z > 99.999) {
    return vec3(0.0, 0.0, -1.0);
  }
  if (p.y < 0.001) {
    return vec3(0.0, 1.0, 0.0);
  }
}

float setShadow (vec4 v_projectedTexcoord, sampler2D u_projectedTexture) {
  // 阴影部分
  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;

  float currentDepth = projectedTexcoord.z - 0.00198;
  bool inRange =
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;

  float texelSize = 1.0 / 1024.0;
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

// 线与面相交
vec2 lineCrossToFace (vec3 p0, vec3 n, vec3 d, vec3 face0) {
  float dn = dot(d, n);
  if (dn == 0.0) {
    return vec2(0.0, 0.0);
  }
  float D = dot(face0, n);
  float t = (D - dot(p0, n)) / dn;
  return vec2(1.0, t);
}

// 添加波纹阴影
float addWaveShadow (float shadow, vec3 position, vec3 u_reverseLightDirection, sampler2D u_waveShadowTexture) {
  if (shadow > 0.001 && position.y < 60.001) {
    vec2 t = intersectAABB(position.xyz, u_reverseLightDirection, vec3(-100.0, 60.0, -100.0), vec3(100.0, 61.0, 100.0));
    if (t.y > t.x) {
      vec3 hit = position.xyz + u_reverseLightDirection * t.x;
      vec4 wave = texture2D(u_waveShadowTexture, vec2(hit.x / 200.0 + 0.5, -hit.z / 200.0 + 0.5));
      vec3 waveShadowNormal = wave.gba;
      // float up = (wave.x - 0.5) * 100.0;
  
      waveShadowNormal *= 2.0;
      waveShadowNormal -= 1.0;
      if (waveShadowNormal.x + waveShadowNormal.y + waveShadowNormal.z > 0.001) {
        float shadowLight = dot(waveShadowNormal, u_reverseLightDirection);
        return shadowLight;
      }
    }
  }
  return 0.0;
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
  uniform vec4 u_color;
  uniform sampler2D u_waveShadowTexture;
  
  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec4 v_position;
  ${shadowFragment}
  ${functions}
  
  void main() {
    vec4 color = getWallColor(v_position.xyz, u_image);

    vec3 normal = normalize(v_normal);
    float light = dot(normal, u_reverseLightDirection);
    if (v_position.y < 60.001) {
      color.rgb *= vec3(0.4, 0.9, 1.0);
    }
    gl_FragColor = color;
    gl_FragColor.rgb *= 0.8 + 0.2 * light;
    float shadow = setShadow(v_projectedTexcoord, u_projectedTexture);
    gl_FragColor.rgb *= 0.8 + 0.2 * shadow;

    float shadowLight = addWaveShadow(shadow, v_position.xyz, u_reverseLightDirection, u_waveShadowTexture);
    if (shadowLight != 0.0) {
      gl_FragColor.rgb *= shadowLight + 0.3;
    }
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
  uniform sampler2D u_waveShadowTexture;
  
  varying vec3 v_worldNormal;
  varying vec2 v_texcoord;
  varying vec3 v_worldPosition;
  ${functions}
  
  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_texcoord = a_texcoord;
    
    vec4 wp = u_world * a_position;

    vec4 wave = texture2D(u_waveShadowTexture, vec2(wp.x / 200.0 + 0.5, -wp.z / 200.0 + 0.5));
    wp.y += (wave.x - 0.5) * 100.0;
    
    gl_Position = u_projection * u_view * wp;
    v_worldPosition = wp.xyz;
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
  uniform sampler2D u_image;
  uniform sampler2D u_projectedTexture;
  uniform mat4 u_textureMatrix;
  uniform sampler2D u_waveShadowTexture;

  varying vec3 v_worldNormal;
  varying vec2 v_texcoord;
  varying vec3 v_worldPosition;
  ${functions}

  vec4 getColor (vec3 origin, vec3 ray, bool isAboveWater) {
    vec2 t = intersectAABB(origin, ray, vec3(-100, 0, -100), vec3(100, 200, 100));
    vec3 hit = origin + ray * t.y;
    if (hit.y > 79.999) {
      return textureCube(u_skybox, ray);
    } else {
      vec4 color = getWallColor(hit, u_image);
      if (hit.y < 60.001) {
        if (isAboveWater) {
          color.rgb *= vec3(0.25, 1.0, 1.25);
        } else {
          color.rgb *= vec3(0.4, 0.9, 1.0);
        }
      }
      // 加上阴影
      vec4 projectedTexcoord = u_textureMatrix * vec4(hit, 1.0);
      float shadow = setShadow(projectedTexcoord, u_projectedTexture);
      color.rgb *= 0.8 + 0.2 * setShadow(projectedTexcoord, u_projectedTexture);

      vec3 normal = getWallNormal(hit);
      float light = dot(normal, u_reverseLightDirection);
      color.rbg *= 0.8 + 0.2 * light;

      float shadowLight = addWaveShadow(shadow, hit, u_reverseLightDirection, u_waveShadowTexture);
      if (shadowLight != 0.0) {
        color.rgb *= shadowLight + 0.3;
      }

      return color;
    }

  }
  
  void main() {

    bool isAboveWater = u_cameraPosition.y >= u_cubeCameraCenter.y;

    vec3 worldNormal = texture2D(u_waveShadowTexture, vec2(v_worldPosition.x / 200.0 + 0.5, -v_worldPosition.z / 200.0 + 0.5)).gba;
    worldNormal *= 2.0;
    worldNormal -= 1.0;
    if (worldNormal.x + worldNormal.y + worldNormal.z < 0.001) {
      worldNormal = vec3(0.0, 1.0, 0.0);
    }

    vec3 eyeToSurfaceDir = normalize(v_worldPosition - u_cameraPosition);

    vec3 reflectedRay = reflect(eyeToSurfaceDir, worldNormal);
    vec4 reflectedColor = getColor(v_worldPosition, reflectedRay, isAboveWater);
    
    float ratio = 1.00 / 1.333;
    vec4 refractedColor;

    // 水上
    if (isAboveWater) {
      float fresnel = mix(0.25, 1.0, pow(1.0 - dot(worldNormal, -eyeToSurfaceDir), 3.0));
      vec3 refractedRay = refract(eyeToSurfaceDir, worldNormal, ratio);
      refractedColor = getColor(v_worldPosition, refractedRay, isAboveWater);
      gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel).rgb, 1.0);
      // 水下
    } else {
      float fresnel = mix(0.5, 1.0, pow(1.0 - dot(-worldNormal, -eyeToSurfaceDir), 3.0));
      vec3 refractedRay = refract(eyeToSurfaceDir, -worldNormal, 1.0 / ratio);
      refractedColor = getColor(v_worldPosition, refractedRay, isAboveWater);
      gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel) * length(refractedRay)).rgb, 1.0);
      gl_FragColor.rgb *= 0.8;
    }

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

// 波浪的影子
export const waveShadowShader = {
  vertex: `
  attribute vec4 a_position;
  
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  
  varying vec3 v_worldPosition;
  
  void main() {
    vec4 wp = u_world * a_position;

    gl_Position = u_projection * u_view * wp;
    v_worldPosition = wp.xyz;
  }
  `,
  fragment: `
  precision mediump float;
  
  uniform vec4 u_color;
  uniform vec3 u_reverseLightDirection;

  uniform int u_waveLength;
  uniform float u_waveDatas[400];
  uniform float u_then;
  
  varying vec3 v_worldPosition;
  ${functions}

  void main() {

    vec4 wave = getWaveParams(v_worldPosition, u_waveDatas, u_then, u_waveLength);

    // 转换到0 - 1的范围，保存在颜色里
    wave.x = 0.5 + wave.x / 100.0;
    wave.yzw = normalize(wave.yzw);
    wave.yzw *= 0.5;
    wave.yzw += 0.5;
    
    gl_FragColor = wave;
    
  }
  `
}
