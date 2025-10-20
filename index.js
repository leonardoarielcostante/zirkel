// --- Configuración inicial ---
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  95,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// --- Input de carga de imágenes ---
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

// --- Panel de sliders ---
const controlPanel = document.createElement("div")
controlPanel.style.position = "absolute"
controlPanel.style.top = "70px"
controlPanel.style.left = "20px"
controlPanel.style.zIndex = "10"
controlPanel.style.background = "rgba(255,255,255,0.9)"
controlPanel.style.padding = "10px"
controlPanel.style.borderRadius = "8px"
controlPanel.style.width = "220px"
controlPanel.style.fontFamily = "sans-serif"
controlPanel.style.fontSize = "14px"
document.body.appendChild(controlPanel)

// --- Helper para sliders ---
function createSlider(labelText, min, max, value, step, callback) {
  const container = document.createElement("div")
  container.style.marginBottom = "8px"
  const label = document.createElement("label")
  label.innerText = `${labelText}: ${value}`
  label.style.display = "block"
  label.style.marginBottom = "4px"
  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = min
  slider.max = max
  slider.value = value
  slider.step = step
  slider.style.width = "100%"
  slider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value)
    label.innerText = `${labelText}: ${val}`
    callback(val)
  })
  container.appendChild(label)
  container.appendChild(slider)
  controlPanel.appendChild(container)
  return slider
}

// --- Parámetros ---
let sphereParams = {
  radius: 1000,
  widthScale: 1,
  heightScale: 1,
}

let spheres = []
let currentSphere = 0
const textureLoader = new THREE.TextureLoader()
let inside = false
let currentShape = "sphere" // "sphere" o "cube"

// --- Posiciones de cámara ---
const insidePos = new THREE.Vector3(0, 0, 0)
const outsidePos = new THREE.Vector3(0, 0, 1800)
camera.position.copy(outsidePos)
camera.lookAt(0, 0, 0)

// --- Crear objeto base ---
let geometry = new THREE.SphereGeometry(sphereParams.radius, 60, 40)
geometry.scale(-1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

// --- Cargar imágenes ---
fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files)
  spheres = []
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      spheres.push(e.target.result)
      if (spheres.length === 1) rebuildGeometry()
    }
    reader.readAsDataURL(file)
  })
})

// --- Rotación con mouse ---
let rotationY = 0
let isMouseDown = false
let lastMouseX = 0
const rotationSpeed = 0.005

renderer.domElement.addEventListener("mousedown", (e) => {
  isMouseDown = true
  lastMouseX = e.clientX
})
renderer.domElement.addEventListener("mouseup", () => (isMouseDown = false))
renderer.domElement.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    const deltaX = e.clientX - lastMouseX
    rotationY -= deltaX * rotationSpeed
    lastMouseX = e.clientX
  }
})

// --- Zoom con rueda ---
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault()
  camera.fov += e.deltaY * 0.05
  camera.fov = Math.max(30, Math.min(120, camera.fov))
  camera.updateProjectionMatrix()
})

// --- Alternar vista ---
function toggleView(goInside) {
  inside = goInside
  const target = inside ? insidePos : outsidePos
  const start = camera.position.clone()
  let progress = 0
  const duration = 60
  rebuildGeometry()
  function animateTransition() {
    progress++
    const t = progress / duration
    camera.position.lerpVectors(start, target, t)
    camera.lookAt(0, 0, 0)
    if (t < 1) requestAnimationFrame(animateTransition)
  }
  animateTransition()
}

// --- Cambiar geometría ---
function changeShape() {
  currentShape = currentShape === "sphere" ? "cube" : "sphere"
  rebuildGeometry()
}

// --- Reconstruir geometría según tipo ---
function rebuildGeometry() {
  sphere.geometry.dispose()
  if (currentShape === "sphere") {
    if (inside) {
      geometry = new THREE.SphereGeometry(
        sphereParams.radius * 1.3,
        60,
        40,
        0,
        Math.PI * 2,
        Math.PI / 4,
        Math.PI / 2
      )
      scene.background = new THREE.Color(0xffffff)
      sphere.material.side = inside ? THREE.FrontSide : THREE.BackSide
    } else {
      geometry = new THREE.SphereGeometry(sphereParams.radius, 60, 40)
      scene.background = null
    }
    geometry.scale(-sphereParams.widthScale, sphereParams.heightScale, 1)
  } else if (currentShape === "cube") {
    const size = sphereParams.radius
    geometry = new THREE.BoxGeometry(size, size, size)
    geometry.scale(sphereParams.widthScale, sphereParams.heightScale, 1)
    scene.background = null

    if (inside) {
      const uvAttr = geometry.attributes.uv
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setX(i, 1 - uvAttr.getX(i))
      }
      uvAttr.needsUpdate = true
    }

    sphere.material.side = inside ? THREE.BackSide : THREE.FrontSide
  }
  sphere.geometry = geometry
  if (spheres.length > 0) {
    const tex = textureLoader.load(spheres[currentSphere])
    sphere.material.map = tex
  }
  sphere.material.needsUpdate = true
}

// --- Sliders ---
createSlider("Radio", 500, 2000, sphereParams.radius, 50, (val) => {
  sphereParams.radius = val
  rebuildGeometry()
  if (inside) {
    const ratio = val / 1000
    camera.fov = 95 * ratio
    camera.fov = Math.max(60, Math.min(130, camera.fov))
    camera.updateProjectionMatrix()
  }
})
createSlider("Ancho (X)", 0.5, 2, sphereParams.widthScale, 0.05, (val) => {
  sphereParams.widthScale = val
  rebuildGeometry()
})
createSlider("Alto (Y)", 0.5, 2, sphereParams.heightScale, 0.05, (val) => {
  sphereParams.heightScale = val
  rebuildGeometry()
})

// --- Teclado ---
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (!inside) toggleView(true)
      break
    case "ArrowDown":
      if (inside) toggleView(false)
      break
    case "ArrowLeft":
    case "ArrowRight":
      changeShape()
      break
  }
})

// --- Animación principal ---
function animate() {
  requestAnimationFrame(animate)
  if (!inside) rotationY += 0.003
  sphere.rotation.set(0, rotationY, 0)
  renderer.render(scene, camera)
}
animate()

// --- Ajuste ventana ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
