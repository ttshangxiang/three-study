
const scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer({antialias: true})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)

camera.position.set(200, 200, 200)
camera.lookAt(scene.position)

// 板子
const panelGeo = new THREE.PlaneGeometry(100, 100)
const panelMaterial = new THREE.MeshPhongMaterial({color: 0xffffff})
const panel = new THREE.Mesh(panelGeo, panelMaterial)
panel.receiveShadow = true
panel.rotateX(-Math.PI / 2)
scene.add(panel)

// 立方体
const cubeGeo = new THREE.BoxGeometry(10, 10, 10)
const cubeMaterial = new THREE.MeshPhongMaterial({color: 0x666666})
const cube = new THREE.Mesh(cubeGeo, cubeMaterial)
cube.position.set(0, 5, 0)
cube.castShadow = true
scene.add(cube)

const cubeWireframe = new THREE.WireframeGeometry(cubeGeo)
const cubeLine = new THREE.LineSegments(cubeWireframe)
cubeLine.material.lineWidth = 2
cubeLine.position.set(0, 5, 0)
// scene.add(cubeLine)

// 自然光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
scene.add(ambientLight)

// 半球光
const hemisphereLight = new THREE.HemisphereLight(0x0000ff, 0x00ff00, 0.6)
hemisphereLight.position.set(0, 500, 0)
scene.add(hemisphereLight)

// 聚光灯
const spotLight = new THREE.SpotLight( 0xffffff, 1 )
spotLight.position.set(-100, 100, 100)
spotLight.angle = 0.15
spotLight.distance = 1000
spotLight.castShadow = true
spotLight.decay = 1
spotLight.penumbra = 0

spotLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
spotLight.shadow.camera.far = 1000
spotLight.shadow.camera.near = 40
// scene.add(spotLight)
const lightHelper = new THREE.SpotLightHelper(spotLight)
// scene.add(lightHelper)

// dat
const gui = new dat.GUI();
const controls = new function () {
  this.x = spotLight.position.x
  this.y = spotLight.position.y
  this.z = spotLight.position.z
  this.distance = spotLight.distance
  this.angle = spotLight.angle
  this.cao = function () {
    console.log('cao')
    console.log(spotLight.shadow.camera)
  }
}
gui.add(controls, 'x', -100, 100);
gui.add(controls, 'y', -100, 100);
gui.add(controls, 'z', -100, 100);
gui.add(controls, 'distance', 0, 1000);
gui.add(controls, 'angle', 0.01, 1);
gui.add(controls, 'cao');

// scene.fog = new THREE.Fog(0x000000, 0.015, 250)

const stats = initStats()
function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  stats.update()
  spotLight.position.set(controls.x, controls.y, controls.z)
  spotLight.distance = controls.distance
  spotLight.angle = controls.angle
  lightHelper.update()
}
render()
