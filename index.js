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

// --- Parámetros ---
let sphereParams = {
  radius: 1000,
  widthScale: 2,
  depthScale: 2,
  heightScale: 1,
}

let inside = false
const activeVideos = []
const activeCanvasUpdaters = [] // <-- agregado para actualizar canvas de video/texto cada frame
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
    texts: {
      adelante: "",
      atras: "",
      izquierda: "",
      derecha: "",
      arriba: "",
      abajo: "",
    },
    textPositions: {
      // <-- agregado: posición del texto por cara ("arriba" | "abajo")
      adelante: "abajo",
      atras: "abajo",
      izquierda: "abajo",
      derecha: "abajo",
      arriba: "abajo",
      abajo: "abajo",
    },
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
inputContainer.id = "inputContainer"
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

    // --- Nuevo: input de texto para la cara ---
    const textLabel = document.createElement("div")
    textLabel.className = "text-label"
    textLabel.innerText = "Texto (opcional)"
    textLabel.style.marginTop = "6px"

    const textInput = document.createElement("input")
    textInput.type = "text"
    textInput.value = sceneObj.images.texts[key] || ""
    textInput.addEventListener("input", (e) => {
      sceneObj.images.texts[key] = e.target.value
      rebuildGeometry()
    })

    // --- Nuevo: selector para posición del texto (arriba/abajo) ---
    const posLabel = document.createElement("div")
    posLabel.innerText = "Posición texto"
    posLabel.style.marginTop = "6px"

    const posSelect = document.createElement("select")
    const optTop = document.createElement("option")
    optTop.value = "arriba"
    optTop.innerText = "Arriba"
    const optBottom = document.createElement("option")
    optBottom.value = "abajo"
    optBottom.innerText = "Abajo"
    posSelect.appendChild(optTop)
    posSelect.appendChild(optBottom)
    posSelect.value = sceneObj.images.textPositions[key] || "abajo"
    posSelect.style.width = "100%"
    posSelect.addEventListener("change", (e) => {
      sceneObj.images.textPositions[key] = e.target.value
      rebuildGeometry()
    })

    // Append
    inputGroup.appendChild(directionLabel)
    inputGroup.appendChild(input)
    inputGroup.appendChild(labelEl)
    inputGroup.appendChild(info)
    inputGroup.appendChild(textLabel)
    inputGroup.appendChild(textInput)
    inputGroup.appendChild(posLabel) // <-- agregado
    inputGroup.appendChild(posSelect) // <-- agregado
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

// --- Nueva función: crear textura desde archivo dibujando en canvas y superponiendo texto ---
function createCanvasTextureFromFile(file, text, position, callback) {
  const url = URL.createObjectURL(file)
  const lowerName = file.name.toLowerCase()
  const canvas = document.createElement("canvas")
  const size = 2048
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")

  function drawTextOnCtx() {
    if (!text) return
    const margin = 40
    const maxWidth = canvas.width - margin * 2
    const fontSize = Math.max(28, Math.floor(size / 30))
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = "center"
    // Baseline y posición según 'position'
    const isTop = position === "arriba"
    ctx.textBaseline = isTop ? "top" : "bottom"
    ctx.fillStyle = "black"

    // dividir en palabras y construir líneas que no excedan maxWidth
    const words = String(text).split(/\s+/)
    const lines = []
    let line = ""
    for (let n = 0; n < words.length; n++) {
      const testLine = line ? line + " " + words[n] : words[n]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line) {
        lines.push(line)
        line = words[n]
      } else {
        line = testLine
      }
    }
    if (line) lines.push(line)

    const lineHeight = Math.ceil(fontSize * 1.2)
    const x = canvas.width / 2
    // y dependiendo si arriba (margen desde arriba) o abajo (margen desde abajo)
    if (isTop) {
      let y = margin
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, y + i * lineHeight)
      }
    } else {
      // si es abajo, comenzamos desde abajo hacia arriba
      let yBase = canvas.height - margin
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, yBase - (lines.length - 1 - i) * lineHeight)
      }
    }
  }

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

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat

    function updateCanvasFromVideo() {
      if (video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        drawTextOnCtx()
        texture.needsUpdate = true
      }
    }

    video.addEventListener("canplay", () => {
      video.play()
      updateCanvasFromVideo()
      activeVideos.push(video)
      callback(texture, updateCanvasFromVideo)
    })
  } else {
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      drawTextOnCtx()
      const texture = new THREE.CanvasTexture(canvas)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat
      callback(texture)
    }
    img.src = url
  }
}

// --- Reconstruir geometría usando las imágenes de la escena activa ---
function rebuildGeometry() {
  if (cubeMesh.geometry) cubeMesh.geometry.dispose()

  // limpiar updaters y videos previos (para evitar acumulación)
  activeCanvasUpdaters.length = 0
  activeVideos.forEach((v) => {
    try {
      v.pause()
      URL.revokeObjectURL(v.src)
    } catch (e) {}
  })
  activeVideos.length = 0

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
      // obtener el texto y la posición asociados a esta cara
      let textForFace = ""
      let posForFace = "abajo"
      if (i === 2) {
        textForFace = sceneImages.texts.arriba
        posForFace = sceneImages.textPositions.arriba
      }
      if (i === 3) {
        textForFace = sceneImages.texts.abajo
        posForFace = sceneImages.textPositions.abajo
      }
      if (i === 4) {
        textForFace = sceneImages.texts.adelante
        posForFace = sceneImages.textPositions.adelante
      }
      if (i === 5) {
        textForFace = sceneImages.texts.atras
        posForFace = sceneImages.textPositions.atras
      }
      if (i === 0) {
        textForFace = sceneImages.texts.izquierda
        posForFace = sceneImages.textPositions.izquierda
      }
      if (i === 1) {
        textForFace = sceneImages.texts.derecha
        posForFace = sceneImages.textPositions.derecha
      }

      createCanvasTextureFromFile(
        fileSrc,
        textForFace,
        posForFace,
        (tex, updater) => {
          mat.map = tex
          mat.needsUpdate = true
          if (updater) activeCanvasUpdaters.push(updater)
        }
      )
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
  // actualizar canvas de video/texto cada frame
  if (activeCanvasUpdaters.length) {
    for (let u of activeCanvasUpdaters) {
      try {
        u()
      } catch (e) {}
    }
  }
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
