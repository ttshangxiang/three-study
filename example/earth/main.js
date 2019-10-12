
// 根节点
const RootDom = document.getElementById('earth')

// 场景
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)
// 相机
const camera = new THREE.PerspectiveCamera(
  45, RootDom.clientWidth / RootDom.clientHeight, 0.1, 1000
)
// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(RootDom.clientWidth, RootDom.clientHeight)
renderer.shadowMap.enabled = true

RootDom.appendChild(renderer.domElement)

// 球
const earthR = 100
const earthGeometry = new THREE.SphereGeometry(earthR, 64, 64)
// 贴图
const earthTexture = new THREE.TextureLoader().load('./EarthSpec.png')
const earthMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  emissive: 0x0,
  roughness: 1,
  metalness: 0,
  reflectivity: 1,
  map: earthTexture
})
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
earth.receiveShadow = true
scene.add(earth)

const light = new THREE.AmbientLight(0x404040)
scene.add(light)

// 平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(-30 * 2, 15 * 2, 100 * 2)
directionalLight.target = earth
// 阴影
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.camera.left = -100
directionalLight.shadow.camera.right = 100
directionalLight.shadow.camera.top = 100
directionalLight.shadow.camera.bottom = -100

scene.add(directionalLight)

// var helper = new THREE.CameraHelper( directionalLight.shadow.camera )
// scene.add( helper )

// 点数据
const data = [
  {name: '北京', latitude: 39.889631, longitude: 116.385399},
  {name: '东京', latitude: 35.671940, longitude: 139.766967},
  {name: '悉尼', latitude: -33.894452, longitude: 151.211734},
  {name: '纽约', latitude: 40.671612, longitude: 286.071652},
  {name: '巴黎', latitude: 48.826607, longitude: 362.348260}
]

// 添加按钮
const placeDom = document.getElementById('place')
data.forEach((item, index) => {
  const dom = document.createElement('div')
  dom.className = 'item'
  dom.innerText = item.name
  placeDom.appendChild(dom)
  dom.addEventListener('click', e => {
    rorateTo(vlist[index])
  })
})

function degToRad(d) {
  return d * Math.PI / 180;
}

// 计算点坐标
const vlist = data.map(item => {
  const theta = degToRad(item.latitude)
  // 这张贴图的经度0点在中间，还往左边偏一点
  const phi = degToRad(item.longitude) + Math.PI - 0.05
  const y = Math.sin(theta) * earthR
  const yr = Math.abs(Math.cos(theta) * earthR)
  const x = -Math.cos(phi) * yr
  const z = Math.sin(phi) * yr
  const v = new THREE.Vector3(x, y, z)
  const dom = document.createElement('div')
  dom.innerHTML = '<div class="point-text">' + item.name + '</div>'
  dom.className = 'point'
  RootDom.appendChild(dom)
  dom.addEventListener('click', e => {
    rorateTo({v, dom})
  })
  dom.addEventListener('mouseenter', e => {
    earth.isBusy = true
  })
  dom.addEventListener('mousemove', e => {
    earth.isBusy = true
  })
  dom.addEventListener('mouseleave', e => {
    earth.isBusy = false
  })
  return {v, dom}
})

// 繁忙
earth.isBusy = false
const xAxis = new THREE.Vector3(1, 0, 0)
const yAxis = new THREE.Vector3(0, 1, 0)
let timer
function rorateTo (item) {
  earth.isBusy = true
  vlist.forEach(ii => {
    ii.dom.firstElementChild.style = ''
  })
  item.dom.firstElementChild.style = 'display: block;'
  
  const phi = Math.atan2(item.v.z, item.v.x)
  const theta = Math.asin(item.v.y / earthR)

  const t_phi = Math.PI / 2
  const t_theta = 0
  const qx = new THREE.Quaternion().setFromAxisAngle(xAxis, theta - t_theta)
  const qy = new THREE.Quaternion().setFromAxisAngle(yAxis, phi - t_phi)
  qx.multiply(qy)

  let t = 0
  clearInterval(timer)
  timer = setInterval(() => {
    if (t >= 1) {
      clearInterval(timer)
      earth.isBusy = false
    }
    t = t + 0.01
    THREE.Quaternion.slerp(earth.quaternion, qx, earth.quaternion, t)
  }, 10)
}

// 画一些线
const lines = [
  [vlist[0], vlist[1]],
  [vlist[3], vlist[4]],
  [vlist[1], vlist[2]]
].map(item => {
  const v1 = item[0].v
  const v3 = item[1].v
  const v2 = new THREE.Vector3().addVectors(v1, v3)
  const angle = v1.angleTo(v3)
  const r1 = earthR * Math.cos(angle / 2)
  const r2 = earthR - r1
  // 曲线离表面高度
  const h = 10
  const scalar = r1 + (r2 + h) * 2
  v2.normalize().multiplyScalar(scalar)

  const curve = new THREE.QuadraticBezierCurve3(v1, v2, v3)
  const points = curve.getPoints(50)

  const geometry = new THREE.BufferGeometry()
  geometry._vertices = points
  geometry.setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color: '#ff9900'}),
  line = new THREE.Line(geometry, material);
  line.castShadow = true

  earth.add(line)
  return line
})

// 相机位置
camera.position.set(0, 0, 500)

// 拖拽查看
import addViewEvent from './view.js'
addViewEvent(renderer.domElement, earth, () => {})

let tt = 0
function render() {
  requestAnimationFrame(render)
  // 自转哦
  if (!earth.isBusy) {
    if (Math.floor(Math.abs(earth.rotation.z)) === 0) {
      earth.rotation.y += 0.003
    } else {
      earth.rotation.y -= 0.003
    }
  }
  // 线段动画
  tt++
  const pointNum = 28
  lines.forEach(item => {
    const start = tt - pointNum
    item.geometry.setFromPoints(item.geometry._vertices.slice(start < 0 ? 0 : start, tt))
    if (tt > 50 + pointNum) {
      tt = 0
    }
  })

  const p0 = new THREE.Vector3(0, 0, 0)
  p0.project(camera)
  vlist.forEach((item, index) => {
    const v = item.v.clone().applyMatrix4(earth.matrixWorld)
    v.project(camera)
    const screen_x = (v.x / 2 + 0.5) * RootDom.clientWidth
    const screen_y = (1 - (v.y / 2 + 0.5)) * RootDom.clientHeight
    // 比0点还后，隐藏
    if (v.z < p0.z - 0.00002) {
      item.dom.style = 'display: block; transform: translate(' + screen_x + 'px, ' + screen_y + 'px)'
    } else {
      item.dom.style = 'display: none;'
    }
  })
  renderer.render(scene, camera)
}

render()
