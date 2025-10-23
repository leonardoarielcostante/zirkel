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

// --- Panel de sliders ---
const controlPanel = document.createElement("div")
controlPanel.style.position = "absolute"
controlPanel.style.top = "300px"
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
  depthScale: 1,
  heightScale: 1,
}

let sphereImage = null
let cubeImages = { adelante: null, atras: null, izquierda: null, derecha: null }

let inside = false
let currentShape = "sphere" // "sphere" o "cube"

const textureLoader = new THREE.TextureLoader()

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

// --- Inputs de carga ---
// Contenedor visual para inputs
const inputContainer = document.createElement("div")
inputContainer.style.position = "absolute"
inputContainer.style.top = "20px"
inputContainer.style.left = "20px"
inputContainer.style.zIndex = "10"
inputContainer.style.background = "rgba(255,255,255,0.9)"
inputContainer.style.padding = "10px"
inputContainer.style.borderRadius = "8px"
inputContainer.style.width = "200px"
inputContainer.style.fontFamily = "sans-serif"
inputContainer.style.fontSize = "14px"
document.body.appendChild(inputContainer)

// Input esfera
const sphereLabel = document.createElement("label")
sphereLabel.innerText = "Imagen esfera"
sphereLabel.style.display = "block"
sphereLabel.style.marginTop = "6px"
const sphereInput = document.createElement("input")
sphereInput.type = "file"
sphereInput.accept = "image/*"
sphereInput.style.display = "block"
sphereInput.style.marginBottom = "6px"
sphereLabel.appendChild(sphereInput)
inputContainer.appendChild(sphereLabel)

// Inputs cubo
const cubeLabels = ["Adelante", "Atrás", "Izquierda", "Derecha"]
const cubeInputs = {}
cubeLabels.forEach((label) => {
  const lbl = document.createElement("label")
  lbl.innerText = label
  lbl.style.display = "block"
  lbl.style.marginTop = "6px"
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.style.display = "block"
  lbl.appendChild(input)
  inputContainer.appendChild(lbl)
  cubeInputs[label.toLowerCase()] = input
})

// --- Eventos de carga ---
sphereInput.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      sphereImage = ev.target.result
      rebuildGeometry()
    }
    reader.readAsDataURL(file)
  }
})

Object.entries(cubeInputs).forEach(([side, input]) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        cubeImages[side] = ev.target.result
        rebuildGeometry()
      }
      reader.readAsDataURL(file)
    }
  })
})

// --- Reconstruir geometría ---
function rebuildGeometry() {
  sphere.geometry.dispose()

  if (currentShape === "sphere") {
    geometry = new THREE.SphereGeometry(sphereParams.radius, 60, 40)
    inside ? geometry.scale(-1, 1, 1) : geometry.scale(1, 1, 1)
    sphere.geometry = geometry

    // Crear un nuevo material para la esfera
    const mat = new THREE.MeshBasicMaterial({
      side: inside ? THREE.FrontSide : THREE.BackSide,
    })

    if (sphereImage) {
      mat.map = textureLoader.load(sphereImage)
    } else {
      mat.color.set(0xffffff)
    }

    sphere.material = mat
    sphere.material.side = inside ? THREE.FrontSide : THREE.BackSide
  } else if (currentShape === "cube") {
    const size = sphereParams.radius
    const scaledX = size * sphereParams.widthScale
    const scaledY = size * sphereParams.heightScale
    const scaledZ = size * sphereParams.depthScale
    geometry = new THREE.BoxGeometry(scaledX, scaledY, scaledZ)

    const cubeMaterials = []
    for (let i = 0; i < 6; i++) {
      let mat
      if (i === 2 || i === 3) {
        mat = new THREE.MeshBasicMaterial({
          color: 0xcccccc,
          side: inside ? THREE.BackSide : THREE.FrontSide,
        })
      } else {
        let texSrc = null
        if (i === 4) texSrc = cubeImages.adelante
        if (i === 5) texSrc = cubeImages.atras
        if (i === 1) texSrc = cubeImages.izquierda
        if (i === 0) texSrc = cubeImages.derecha

        const texture = texSrc ? textureLoader.load(texSrc) : null
        mat = new THREE.MeshBasicMaterial({
          map: texture,
          color: texture ? 0xffffff : 0x999999,
          side: inside ? THREE.BackSide : THREE.FrontSide,
        })
      }
      cubeMaterials.push(mat)
    }

    sphere.material = cubeMaterials
    sphere.geometry = geometry
    scene.background = null

    if (inside) {
      const uvAttr = geometry.attributes.uv
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setX(i, 1 - uvAttr.getX(i))
      }
      uvAttr.needsUpdate = true
    }
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
createSlider("Ancho (X)", 0.5, 4, sphereParams.widthScale, 0.05, (val) => {
  sphereParams.widthScale = val
  sphereParams.depthScale = val
  rebuildGeometry()
})
createSlider("Alto (Y)", 0.5, 4, sphereParams.heightScale, 0.05, (val) => {
  sphereParams.heightScale = val
  rebuildGeometry()
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
