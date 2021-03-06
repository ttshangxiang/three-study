

// 方法
const functions = `
// 折射率
float ratio = 1.00 / 1.333;

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

float intersectSphere(vec3 origin, vec3 ray, vec3 sphereCenter, float sphereRadius) {
  vec3 toSphere = origin - sphereCenter;
  float a = dot(ray, ray);
  float b = 2.0 * dot(toSphere, ray);
  float c = dot(toSphere, toSphere) - sphereRadius * sphereRadius;
  float discriminant = b*b - 4.0*a*c;
  if (discriminant > 0.0) {
    float t = (-b - sqrt(discriminant)) / (2.0 * a);
    if (t > 0.0) return t;
  }
  return 1.0e6;
}

float rand(vec2 co){
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

vec4 getWaveParams (vec3 position, float waveDatas[1000], float then, int u_waveLength) {
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
  if (change) {
    normal = normal2;
  }
  return vec4(incY, normal);
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

  float currentDepth = projectedTexcoord.z - 0.001;
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

// 获取被波浪影响的光线
float getWaveLight (vec3 position, vec3 u_reverseLightDirection, sampler2D u_waveShadowTexture) {
  // 折射
  vec3 ray = u_reverseLightDirection;
  vec2 t = intersectAABB(position.xyz, ray, vec3(-100.0, 60.0, -100.0), vec3(100.0, 60.1, 100.0));
  if (t.y > t.x) {
    vec3 hit = position.xyz + ray * t.x;
    vec2 c = vec2(hit.x / 200.0 + 0.5, -hit.z / 200.0 + 0.5);
    vec4 info = texture2D(u_waveShadowTexture, c);
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    float light = max(1.0 - dot(normal, vec3(0, 1.0, 0)), 0.0);
    float h = info.r * 200.0;
    if (h > -0.001 && h < 0.001) {
      return 0.0;
    }
    light = pow(light, 1./3.);
    return -light;
  }
  return 0.0;
}

// 光线
vec4 setLight (vec4 color, vec3 position, vec3 v_normal, vec3 u_reverseLightDirection, sampler2D u_waveShadowTexture, sampler2D u_image,
  vec4 v_projectedTexcoord, sampler2D u_projectedTexture) {
    
  // 水下区域染蓝色
  vec2 coord = vec2(position.x / 200.0 + 0.5, -position.z / 200.0 + 0.5);
  vec4 info = texture2D(u_waveShadowTexture, coord);
  if (position.y < 60.0 + info.r * 200.0) {
    color.rgb *= vec3(0.4, 0.9, 1.0);
  }

  // 环境光
  vec3 ambientColor = vec3(0.4, 0.4, 0.4);
  vec3 ambient = ambientColor * color.rgb;

  // 平行光
  vec3 lightColor = vec3(0.8, 0.8, 0.8);
  vec3 normal = normalize(v_normal);
  float ndotl = max(dot(normal, u_reverseLightDirection), 0.0);
  vec3 diffuse = lightColor * color.rgb * ndotl;

  // 波浪影响法线
  if (position.y < 60.0 + info.r * 200.0) {
    float wave = getWaveLight(position, u_reverseLightDirection, u_waveShadowTexture);
    diffuse += wave;
  }

  // 阴影
  float shadow = setShadow(v_projectedTexcoord, u_projectedTexture);
  diffuse *= shadow;

  return vec4(diffuse + ambient, color.a);
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
    vec4 origin = getWallColor(v_position.xyz, u_image);
    gl_FragColor = setLight(origin, v_position.xyz, v_normal, u_reverseLightDirection, u_waveShadowTexture, u_image, v_projectedTexcoord, u_projectedTexture);
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
    wp.y += wave.x * 200.0;
    
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

  uniform vec3 u_sphereCenter;
  uniform float u_sphereRadius;

  varying vec3 v_worldNormal;
  varying vec2 v_texcoord;
  varying vec3 v_worldPosition;
  ${functions}

  vec4 getColor (vec3 origin, vec3 ray, bool isAboveWater) {
    // 球
    float q = intersectSphere(origin, ray, u_sphereCenter, u_sphereRadius);
    vec4 color;
    vec3 hit;
    vec3 normal;
    if (q < 1.0e6) {
      color = vec4(1.0, 1.0, 1.0, 1.0);
      hit = origin + ray * q;
      normal = normalize(hit - u_sphereCenter);
    } else {
      // 墙
      vec2 t = intersectAABB(origin, ray, vec3(-100, 0, -100), vec3(100, 200, 100));
      hit = origin + ray * t.y;
      if (hit.y > 79.999) {
        return textureCube(u_skybox, ray);
      } else {
        normal = getWallNormal(hit);
        color = getWallColor(hit, u_image);
      }
    }

    vec4 projectedTexcoord = u_textureMatrix * vec4(hit, 1.0);
    return setLight(color, hit, normal, u_reverseLightDirection, u_waveShadowTexture, u_image, projectedTexcoord, u_projectedTexture);

  }
  
  void main() {

    bool isAboveWater = u_cameraPosition.y >= u_cubeCameraCenter.y;
    vec2 coord = vec2(v_worldPosition.x / 200.0 + 0.5, -v_worldPosition.z / 200.0 + 0.5);
    vec4 info = texture2D(u_waveShadowTexture, coord);

    // 更好看一点吧
    /* make water look more "peaked" */
    for (int i = 0; i < 5; i++) {
      coord += info.ba * 0.005;
      info = texture2D(u_waveShadowTexture, coord);
    }

    vec3 worldNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    vec3 eyeToSurfaceDir = normalize(v_worldPosition - u_cameraPosition);

    vec3 reflectedRay = reflect(eyeToSurfaceDir, worldNormal);
    vec4 reflectedColor = getColor(v_worldPosition, reflectedRay, isAboveWater);
    
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

// 球

export const sphereShader = {
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
    vec4 origin = vec4(1.0, 1.0, 1.0, 1.0);
    gl_FragColor = setLight(origin, v_position.xyz, v_normal, u_reverseLightDirection, u_waveShadowTexture, u_image, v_projectedTexcoord, u_projectedTexture);
  }
  `
}
