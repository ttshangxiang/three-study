const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 500
)
camera.position.set(0, 0, 100)
camera.lookAt(0, 0, 0)

// 材质
const material = new THREE.LineBasicMaterial({color: 0x0000ff})
// 形状
const geometry = new THREE.Geometry()
geometry.vertices.push(new THREE.Vector3(-10, 0, 0))
geometry.vertices.push(new THREE.Vector3(0, 10, 0))
geometry.vertices.push(new THREE.Vector3(10, 0, 0))
// 线
const line = new THREE.Line(geometry, material)

const scene = new THREE.Scene()
scene.add(line)

renderer.render(scene, camera)
