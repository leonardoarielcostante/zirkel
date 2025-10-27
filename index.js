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

const overlayText = document.createElement("div")
overlayText.innerText = "Hola Mundo"
overlayText.style.position = "absolute"
overlayText.style.top = "20px"
overlayText.style.left = "50%"
overlayText.style.transform = "translateX(-50%)"
overlayText.style.fontSize = "32px"
overlayText.style.fontWeight = "bold"
overlayText.style.color = "#000"
overlayText.style.zIndex = "20"
document.body.appendChild(overlayText)

// --- Parámetros ---
let sphereParams = {
  radius: 1000,
  widthScale: 2,
  depthScale: 2,
  heightScale: 1,
}

let inside = false
const activeVideos = []
const textureLoader = new THREE.TextureLoader()

// --- Soporte para múltiples escenas ---
const cubeLabels = [
  "Adelante",
  "Atras",
  "Izquierda",
  "Derecha",
  "Arriba",
  "Abajo",
]

// scenesData: array de escenas; cada escena tiene un nombre y un objeto images con 6 entradas
const scenesData = []
let currentSceneIndex = 0

function makeEmptyImages() {
  return {
    adelante: null,
    atras: null,
    izquierda: null,
    derecha: null,
    arriba: null,
    abajo: null,
  }
}

function createNewScene(name) {
  return {
    name: name || `Escena ${scenesData.length + 1}`,
    images: makeEmptyImages(),
  }
}

// Inicializar con una escena por defecto
scenesData.push(createNewScene("Escena 1"))

// --- Posiciones de cámara ---
const insidePos = new THREE.Vector3(0, 0, 0)
const outsidePos = new THREE.Vector3(0, 0, 1800)
camera.position.copy(outsidePos)
camera.lookAt(0, 0, 0)

// --- Crear objeto base (solo cubo) ---
let geometry = new THREE.BoxGeometry(
  sphereParams.radius * sphereParams.widthScale,
  sphereParams.radius * sphereParams.heightScale,
  sphereParams.radius * sphereParams.depthScale
)
const defaultMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
let cubeMesh = new THREE.Mesh(geometry, defaultMat)
scene.add(cubeMesh)
scene.background = null

// --- Barra de escenas (selector + botones) ---
const scenesBar = document.createElement("div")
scenesBar.style.position = "absolute"
scenesBar.style.top = "15px"
scenesBar.style.left = "15px"
scenesBar.style.zIndex = "12"
scenesBar.style.background = "rgba(255,255,255,0.9)"
scenesBar.style.padding = "8px"
scenesBar.style.borderRadius = "8px"
scenesBar.style.fontFamily = "sans-serif"
scenesBar.style.fontSize = "14px"
document.body.appendChild(scenesBar)

const sceneSelect = document.createElement("select")
sceneSelect.style.marginRight = "6px"
scenesBar.appendChild(sceneSelect)

const addSceneBtn = document.createElement("button")
addSceneBtn.innerText = "Nueva escena"
addSceneBtn.style.marginRight = "6px"
scenesBar.appendChild(addSceneBtn)

const deleteSceneBtn = document.createElement("button")
deleteSceneBtn.innerText = "Eliminar"
scenesBar.appendChild(deleteSceneBtn)

function updateSceneSelect() {
  sceneSelect.innerHTML = ""
  scenesData.forEach((s, idx) => {
    const opt = document.createElement("option")
    opt.value = String(idx)
    opt.innerText = s.name
    sceneSelect.appendChild(opt)
  })
  sceneSelect.value = String(currentSceneIndex)
}
updateSceneSelect()

addSceneBtn.addEventListener("click", () => {
  scenesData.push(createNewScene())
  currentSceneIndex = scenesData.length - 1
  updateSceneSelect()
  rebuildInputsForCurrentScene()
  rebuildGeometry()
})

deleteSceneBtn.addEventListener("click", () => {
  if (scenesData.length <= 1) return // mantener al menos una escena
  scenesData.splice(currentSceneIndex, 1)
  currentSceneIndex = Math.max(0, currentSceneIndex - 1)
  updateSceneSelect()
  rebuildInputsForCurrentScene()
  rebuildGeometry()
})

sceneSelect.addEventListener("change", () => {
  currentSceneIndex = parseInt(sceneSelect.value, 10)
  rebuildInputsForCurrentScene()
  rebuildGeometry()
})

// --- Inputs de carga (container) ---
const inputContainer = document.createElement("div")
inputContainer.style.position = "absolute"
inputContainer.style.top = "80px"
inputContainer.style.left = "20px"
inputContainer.style.zIndex = "10"
inputContainer.style.background = "rgba(255,255,255,0.95)"
inputContainer.style.padding = "10px"
inputContainer.style.borderRadius = "8px"
inputContainer.style.width = "200px"
inputContainer.style.fontFamily = "sans-serif"
inputContainer.style.fontSize = "14px"
document.body.appendChild(inputContainer)

// Botón para ocultar/mostrar la barra de inputs
const toggleInputBtn = document.createElement("button")
toggleInputBtn.innerText = "Ocultar inputs"
toggleInputBtn.style.position = "absolute"
toggleInputBtn.style.bottom = "20px"
toggleInputBtn.style.left = "20px"
toggleInputBtn.style.zIndex = "11"
toggleInputBtn.style.padding = "6px 8px"
toggleInputBtn.style.borderRadius = "6px"
toggleInputBtn.style.cursor = "pointer"
document.body.appendChild(toggleInputBtn)

let inputsVisible = true
function setInputVisibility(visible) {
  inputContainer.style.display = visible ? "block" : "none"
  scenesBar.style.display = visible ? "block" : "none"
  toggleInputBtn.innerText = visible ? "Ocultar inputs" : "Mostrar inputs"
  inputsVisible = visible
}

toggleInputBtn.addEventListener("click", () =>
  setInputVisibility(!inputsVisible)
)

// --- Crear inputs dinámicamente según la escena actual ---
let currentInputs = {} // mapping lado -> input element

function clearInputContainer() {
  inputContainer.innerHTML = ""
  currentInputs = {}
}

function rebuildInputsForCurrentScene() {
  clearInputContainer()
  const sceneObj = scenesData[currentSceneIndex]
  const title = document.createElement("div")
  title.className = "scene-title"
  title.innerText = sceneObj.name
  inputContainer.appendChild(title)

  cubeLabels.forEach((label) => {
    const key = label.toLowerCase()

    // Crear grupo contenedor
    const inputGroup = document.createElement("div")
    inputGroup.className = "input-group"

    // Etiqueta de dirección
    const directionLabel = document.createElement("span")
    directionLabel.className = "direction-label"
    directionLabel.innerText = label

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*,video/*"
    input.id = `input-${key}`

    const labelEl = document.createElement("label")
    labelEl.setAttribute("for", `input-${key}`)
    labelEl.innerText = "Seleccionar archivo"

    const info = document.createElement("div")
    info.className = "file-info"

    const existingFile = sceneObj.images[key]
    info.innerText = existingFile
      ? existingFile.name
      : "No hay archivo seleccionado"

    input.addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        sceneObj.images[key] = file
        info.innerText = file.name || ""
        rebuildGeometry()
      }
    })

    inputGroup.appendChild(directionLabel)
    inputGroup.appendChild(input)
    inputGroup.appendChild(labelEl)
    inputGroup.appendChild(info)
    inputContainer.appendChild(inputGroup)
    currentInputs[key] = input
  })
}

// Inicializar UI de inputs con la escena por defecto
rebuildInputsForCurrentScene()

// --- Función para crear textura desde imagen o video ---
function createTextureFromFile(file, callback) {
  const url = URL.createObjectURL(file)
  const lowerName = file.name.toLowerCase()

  if (
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".webm") ||
    lowerName.endsWith(".ogg")
  ) {
    const video = document.createElement("video")
    video.src = url
    video.loop = true
    video.muted = true
    video.autoplay = true
    video.playsInline = true

    video.addEventListener("canplay", () => {
      video.play()
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat
      activeVideos.push(video)
      callback(texture)
    })
  } else {
    textureLoader.load(url, (tex) => callback(tex))
  }
}

// --- Reconstruir geometría usando las imágenes de la escena activa ---
function rebuildGeometry() {
  if (cubeMesh.geometry) cubeMesh.geometry.dispose()

  const size = sphereParams.radius
  const scaledX = size * sphereParams.widthScale
  const scaledY = size * sphereParams.heightScale
  const scaledZ = size * sphereParams.depthScale
  geometry = new THREE.BoxGeometry(scaledX, scaledY, scaledZ)

  const sceneImages = scenesData[currentSceneIndex].images

  const cubeMaterials = []
  for (let i = 0; i < 6; i++) {
    let mat
    let fileSrc = null
    if (i === 2) fileSrc = sceneImages.arriba
    if (i === 3) fileSrc = sceneImages.abajo
    if (i === 4) fileSrc = sceneImages.adelante
    if (i === 5) fileSrc = sceneImages.atras
    if (i === 0) fileSrc = sceneImages.izquierda
    if (i === 1) fileSrc = sceneImages.derecha

    mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: inside ? THREE.BackSide : THREE.FrontSide,
    })

    if (fileSrc) {
      createTextureFromFile(fileSrc, (tex) => {
        mat.map = tex
        mat.needsUpdate = true
      })
    }
    cubeMaterials.push(mat)
  }

  cubeMesh.material = cubeMaterials
  cubeMesh.geometry = geometry

  if (inside) {
    const uvAttr = geometry.attributes.uv
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, 1 - uvAttr.getX(i))
    }
    uvAttr.needsUpdate = true
  }

  if (Array.isArray(cubeMesh.material)) {
    cubeMesh.material.forEach((m) => (m.needsUpdate = true))
  } else {
    cubeMesh.material.needsUpdate = true
  }
}

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

// --- Teclado ---
let videosPaused = false
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (!inside) toggleView(true)
      break
    case "ArrowDown":
      if (inside) toggleView(false)
      break
    case "ArrowLeft":
      // Cambiar a escena anterior
      if (currentSceneIndex > 0) {
        currentSceneIndex--
        sceneSelect.value = String(currentSceneIndex)
        rebuildInputsForCurrentScene()
        rebuildGeometry()
      }
      break
    case "ArrowRight":
      // Cambiar a siguiente escena
      if (currentSceneIndex < scenesData.length - 1) {
        currentSceneIndex++
        sceneSelect.value = String(currentSceneIndex)
        rebuildInputsForCurrentScene()
        rebuildGeometry()
      }
      break
    case "o":
    case "O":
      videosPaused = !videosPaused
      activeVideos.forEach((v) => (videosPaused ? v.pause() : v.play()))
      break
  }
})

// --- Animación principal ---
function animate() {
  requestAnimationFrame(animate)
  cubeMesh.rotation.set(0, rotationY, 0)
  renderer.render(scene, camera)
}
animate()

// --- Ajuste ventana ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
