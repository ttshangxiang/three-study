
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

scene.add(earth)

const light = new THREE.AmbientLight(0x404040)
scene.add(light)

// 平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(-30, 15, 100)
directionalLight.target = earth
scene.add(directionalLight)

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
  return {v, dom}
})

let selfRotate = true
const facez = new THREE.Vector3(0, 0, 1)
let timer
function rorateTo (item) {
  selfRotate = false
  vlist.forEach(ii => {
    ii.dom.firstElementChild.style = ''
  })
  item.dom.firstElementChild.style = 'display: block;'
  const crossV = item.v.clone().cross(facez).normalize()
  const angle = item.v.angleTo(facez)
  const q = new THREE.Quaternion().setFromAxisAngle(crossV, angle)

  let t = 0
  clearInterval(timer)
  timer = setInterval(() => {
    if (t >= 1) {
      clearInterval(timer)
    }
    t = ( t + 0.01 ) % 1
    THREE.Quaternion.slerp(earth.quaternion, q, earth.quaternion, t)
  }, 10)
}


// 相机位置
camera.position.set(0, 0, 500)

function render() {
  requestAnimationFrame(render)
  selfRotate && (earth.rotation.y += 0.003)
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
