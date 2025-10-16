// --- Configuración inicial ---

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// --- Crear input de carga ---
const fileInput = document.createElement("input")
fileInput.type = "file"
fileInput.multiple = true
fileInput.accept = "image/*"
fileInput.style.position = "absolute"
fileInput.style.top = "20px"
fileInput.style.left = "20px"
fileInput.style.zIndex = "10"
fileInput.style.background = "#fff"
fileInput.style.padding = "6px"
fileInput.style.borderRadius = "6px"
fileInput.style.cursor = "pointer"
document.body.appendChild(fileInput)

let spheres = []
const textureLoader = new THREE.TextureLoader()

// --- Crear esfera base ---
let geometry = new THREE.SphereGeometry(1000, 60, 40)
geometry.scale(-1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

let currentSphere = 0
let inside = false

// --- Posiciones de cámara ---
const insidePos = new THREE.Vector3(0, 0, 0)
const outsidePos = new THREE.Vector3(0, 0, 1800)

camera.position.copy(outsidePos)
camera.lookAt(0, 0, 0)

// --- Manejar carga de imágenes ---
fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files)
  spheres = []

  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      spheres.push(e.target.result)
      if (spheres.length === 1) {
        changeSphere(0)
      }
    }
    reader.readAsDataURL(file)
  })
})

// --- Función para cambiar textura ---
function changeSphere(direction) {
  if (spheres.length === 0) return
  currentSphere = (currentSphere + direction + spheres.length) % spheres.length
  const newTexture = textureLoader.load(spheres[currentSphere])
  sphere.material.map = newTexture
  sphere.material.needsUpdate = true
}

// --- Variables de orientación ---
let rotationX = 0
let rotationY = 0
const rotationSpeed = 0.02
const maxVerticalAngle = Math.PI / 2.5

// --- Controles de teclado ---
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      rotationY += rotationSpeed
      break
    case "ArrowRight":
      rotationY -= rotationSpeed
      break
    case "ArrowUp":
      rotationX = Math.max(rotationX - rotationSpeed, -maxVerticalAngle)
      break
    case "ArrowDown":
      rotationX = Math.min(rotationX + rotationSpeed, maxVerticalAngle)
      break
    case "PageUp":
      toggleView()
      break
    case "PageDown":
      changeSphere(1)
      break
  }
})

// --- Alternar vista (fuera <-> dentro) ---
function toggleView() {
  inside = !inside
  const target = inside ? insidePos : outsidePos
  const start = camera.position.clone()
  let progress = 0
  const duration = 60

  // 🔄 Cambiar geometría según modo
  sphere.geometry.dispose()
  if (inside) {
    geometry = new THREE.SphereGeometry(
      1000,
      60,
      40,
      0,
      Math.PI * 2,
      Math.PI / 4,
      (Math.PI * 1) / 2
    )
  } else {
    geometry = new THREE.SphereGeometry(1000, 60, 40)
  }
  geometry.scale(-1, 1, 1)
  sphere.geometry = geometry

  // 🎞 Transición suave de cámara
  function animateTransition() {
    progress++
    const t = progress / duration
    camera.position.lerpVectors(start, target, t)
    camera.lookAt(0, 0, 0)
    if (t < 1) requestAnimationFrame(animateTransition)
  }

  animateTransition()
}

// --- Animación principal ---
function animate() {
  requestAnimationFrame(animate)
  sphere.rotation.set(rotationX, rotationY, 0)
  renderer.render(scene, camera)
}

animate()

// --- Ajuste automático ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
