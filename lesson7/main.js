
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.id = 'main'
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
camera.position.y = 10

const scene = new THREE.Scene()
scene.add(camera)

const helper = new THREE.CameraHelper(camera)
scene.add(helper)

// 网格辅助线
const size = 1000
const divisions = 100

const gridHelper = new THREE.GridHelper(size, divisions)
scene.add(gridHelper)

// 球坐标
const v = new THREE.Vector3()
camera.getWorldDirection(v)
const spherical = new THREE.Spherical().setFromVector3(v)

// 旋转
addViewEvent(camera, spherical)

// 走路
const walk = addWalkEvent(camera, spherical)

// 白板一块
const whiteBoardGeometry = new THREE.BoxGeometry(200, 100, 1)
const whiteBoardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
const whiteBoard = new THREE.Mesh(whiteBoardGeometry, whiteBoardMaterial)
whiteBoard.position.set(0, 50, -400)
scene.add(whiteBoard)

// 点击白板
function addClickEvent() {

  const v2 = new THREE.Vector2()
  renderer.getSize(v2)

  renderer.domElement.addEventListener('click', e => {
    const { pageX, pageY } = e

    // 鼠标相对中心的偏移
    const x = (pageX - v2.x / 2) / (v2.x / 2)
    const y = (pageY - v2.y / 2) / (v2.y / 2)
    // 获得点击射线，y为负方向
    const coords = new THREE.Vector2(x, -y)
    const raycaster = new THREE.Raycaster()
    raycaster.far = 1000
    raycaster.setFromCamera(coords, camera)
    const r = raycaster.intersectObject(whiteBoard)

    r[0] && addText(r[0])
  })

  let font = null
  function createTexture(text) {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.font = '28px bold 黑体'
    ctx.textBaseline = 'top'
    ctx.fillText(text, 0, 0)
    document.body.appendChild(canvas)
    return new THREE.CanvasTexture(canvas)
  }

  function createSprite (texture) {
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, color: 0x666666, depthTest: false})
    spriteMaterial.sizeAttenuation = false
    const sprite = new THREE.Sprite(spriteMaterial)
    return sprite
  }

  const spriteTexture = createTexture('哈')
  function addText(r) {
    const sprite = createSprite(spriteTexture)
    sprite.position.copy(r.point)
    sprite.scale.set(0.04, 0.04, 0.04)
    scene.add(sprite)
  }
}

addClickEvent()

function render() {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
  walk()
}
render()
