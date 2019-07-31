const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 1000
)
camera.position.set(0, 0, 100)
let lookAtParam = [0, 100, 100]
camera.lookAt(...lookAtParam)

const scene = new THREE.Scene()

// 天空是个球
const skyGeometry = new THREE.SphereGeometry(500, 32, 32)
const skyMaterial = new THREE.MeshBasicMaterial({color: 0xffff00})
skyMaterial.side = THREE.DoubleSide
const sky = new THREE.Mesh(skyGeometry, skyMaterial)

scene.add(sky)

// 地面是块板
const floorGeometry = new THREE.CircleGeometry(500, 32)
const floorMaterial = new THREE.MeshBasicMaterial({color: 0xcccccc})
const floor = new THREE.Mesh(floorGeometry, floorMaterial)

scene.add(floor)

function addEvent () {
  const dom = window
  let _x
  let _y
  let lookAtParam0
  dom.addEventListener('mousedown', mousedown)
  function mousedown (e) {
    const {pageX, pageY} = e
    _x = pageX
    _y = pageY
    lookAtParam0 = lookAtParam
    dom.addEventListener('mousemove', mousemove)
    dom.addEventListener('mouseup', mouseup)
  }
  function mousemove (e) {
    const {pageX, pageY} = e
    // 增量
    const x = _x - pageX
    const y = _y - pageY
    const x1 = Math.sin(x % 360 * Math.PI / 180) * 100
    const y1 = Math.cos(x % 360 * Math.PI / 180) * 100
    console.log(x1, y1)
    lookAtParam0 = [lookAtParam[0] + x1, lookAtParam[1] + y1, lookAtParam[2]]
    camera.lookAt(...lookAtParam0)
  }
  function mouseup () {
    lookAtParam = lookAtParam0
    dom.removeEventListener('mousemove', mousemove)
    dom.removeEventListener('mouseup', mouseup)
  }
}
addEvent()


function render () {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
}

render()
