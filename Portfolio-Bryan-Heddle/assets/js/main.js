const header = document.getElementById('header')
const nav = document.querySelector('.nav')
const toggle = document.getElementById('nav-toggle')
const menu = document.getElementById('nav-menu')
const year = document.getElementById('footer-year')
const copyBtn = document.getElementById('contact-btn')
const email = document.getElementById('contact-email').textContent.trim()
const sections = document.querySelectorAll('section[id]')
const navLinks = document.querySelectorAll('.nav__link')

year.textContent = new Date().getFullYear()

const closeMenu = () => {
  nav.classList.remove('is-open')
  toggle.setAttribute('aria-expanded', 'false')
}

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open')
  toggle.setAttribute('aria-expanded', String(open))
})

menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu)
})

window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 8)
}, { passive: true })

const setActiveLink = () => {
  const y = window.scrollY + 120

  sections.forEach((section) => {
    const top = section.offsetTop
    const bottom = top + section.offsetHeight
    const id = section.id
    const link = document.querySelector(`.nav__link[href="#${id}"]`)

    if (!link) return
    link.classList.toggle('active-link', y >= top && y < bottom)
  })
}

window.addEventListener('scroll', setActiveLink, { passive: true })
setActiveLink()

const story = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]

const guide = document.getElementById('guide')
const guideKicker = document.getElementById('guide-kicker')
const guideTarget = document.getElementById('guide-target')
const guideIcon = guide.querySelector('i')

const updateGuide = () => {
  const y = window.scrollY + window.innerHeight * 0.42
  let next = story[0]

  for (let i = 0; i < story.length; i += 1) {
    const section = document.getElementById(story[i].id)
    if (!section) continue
    if (y >= section.offsetTop) next = story[i + 1] || null
  }

  if (!next) {
    guide.href = '#top'
    guideKicker.textContent = 'Back'
    guideTarget.textContent = 'Top'
    guideIcon.className = 'ri-arrow-up-line'
    return
  }

  guide.href = `#${next.id}`
  guideKicker.textContent = 'Next'
  guideTarget.textContent = next.label
  guideIcon.className = 'ri-arrow-down-line'
}

window.addEventListener('scroll', updateGuide, { passive: true })
updateGuide()

copyBtn.addEventListener('click', async () => {
  const original = 'Copy email <i class="ri-file-copy-line" aria-hidden="true"></i>'
  const copied = 'Email copied <i class="ri-check-line" aria-hidden="true"></i>'

  const reset = () => {
    setTimeout(() => {
      copyBtn.innerHTML = original
    }, 2000)
  }

  try {
    await navigator.clipboard.writeText(email)
    copyBtn.innerHTML = copied
    reset()
    return
  } catch {
    // Clipboard API can fail in some embedded browsers; fall back below.
  }

  const field = document.createElement('textarea')
  field.value = email
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.left = '-9999px'
  document.body.appendChild(field)
  field.select()

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  field.remove()
  copyBtn.innerHTML = ok ? copied : email
  reset()
})

const initOrbitViewer = ({ viewerId, imgId, cols, rows, frameBase, frameExt, col = 0, row = 0 }) => {
  const viewer = document.getElementById(viewerId)
  const img = document.getElementById(imgId)
  if (!viewer || !img) return

  const COLS = cols
  const ROWS = rows
  const pixelsPerCol = 16
  const pixelsPerRow = 32
  const PRELOAD_BATCH = 32

  let dragging = false
  let lastX = 0
  let lastY = 0
  let dragX = 0
  let dragY = 0
  let renderQueued = false
  let ready = false
  const frameCache = new Map()

  const framePath = (rowIndex, colIndex) => {
    const r = Math.min(Math.max(rowIndex, 0), ROWS - 1)
    const c = ((colIndex % COLS) + COLS) % COLS
    const frameNumber = r * COLS + c + 1
    return `${frameBase}${String(frameNumber).padStart(6, '0')}${frameExt}`
  }

  const loadFrame = (src) => {
    const cached = frameCache.get(src)
    if (cached instanceof HTMLImageElement) return Promise.resolve(cached)
    if (cached && cached.then) return cached

    const promise = new Promise((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        if (image.decode) {
          image.decode().then(() => resolve(image)).catch(() => resolve(image))
        } else {
          resolve(image)
        }
      }
      image.onerror = reject
      image.src = src
    }).then((image) => {
      if (image) frameCache.set(src, image)
      return image
    }).catch(() => null)

    frameCache.set(src, promise)
    return promise
  }

  const preloadFrames = async (paths) => {
    for (let i = 0; i < paths.length; i += PRELOAD_BATCH) {
      await Promise.all(paths.slice(i, i + PRELOAD_BATCH).map((path) => loadFrame(path)))
    }
  }

  const renderFrame = () => {
    renderQueued = false
    const src = framePath(row, col)
    const cached = frameCache.get(src)

    if (cached instanceof HTMLImageElement) {
      img.src = cached.src
      return
    }

    const pending = cached && cached.then ? cached : loadFrame(src)
    pending.then((image) => {
      if (image && framePath(row, col) === src) img.src = image.src
    })
  }

  const queueRender = () => {
    if (renderQueued) return
    renderQueued = true
    requestAnimationFrame(renderFrame)
  }

  const applyDragDelta = (deltaX, deltaY) => {
    dragX += deltaX
    dragY += deltaY
    let nextCol = col
    let nextRow = row

    while (Math.abs(dragX) >= pixelsPerCol) {
      nextCol += dragX > 0 ? 1 : -1
      dragX += dragX > 0 ? -pixelsPerCol : pixelsPerCol
    }

    while (Math.abs(dragY) >= pixelsPerRow) {
      const direction = dragY > 0 ? 1 : -1
      if ((direction > 0 && nextRow >= ROWS - 1) || (direction < 0 && nextRow <= 0)) {
        dragY = 0
        break
      }
      nextRow += direction
      dragY += direction > 0 ? -pixelsPerRow : pixelsPerRow
    }

    if (nextCol === col && nextRow === row) return
    col = ((nextCol % COLS) + COLS) % COLS
    row = Math.min(Math.max(nextRow, 0), ROWS - 1)
    queueRender()
  }

  const startDrag = (clientX, clientY) => {
    if (!ready) return
    dragging = true
    lastX = clientX
    lastY = clientY
    dragX = 0
    dragY = 0
    viewer.classList.add('is-dragging')
  }

  const endDrag = () => {
    dragging = false
    viewer.classList.remove('is-dragging')
  }

  const moveDrag = (clientX, clientY) => {
    if (!dragging) return
    const deltaX = clientX - lastX
    const deltaY = clientY - lastY
    lastX = clientX
    lastY = clientY
    applyDragDelta(deltaX, deltaY)
  }

  viewer.addEventListener('mousedown', (event) => {
    event.preventDefault()
    startDrag(event.clientX, event.clientY)
  })
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('mousemove', (event) => moveDrag(event.clientX, event.clientY))

  viewer.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return
    startDrag(event.touches[0].clientX, event.touches[0].clientY)
  }, { passive: true })
  viewer.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) return
    moveDrag(event.touches[0].clientX, event.touches[0].clientY)
  }, { passive: true })
  viewer.addEventListener('touchend', endDrag)
  viewer.addEventListener('touchcancel', endDrag)

  viewer.classList.add('is-loading')
  const currentRowPaths = Array.from({ length: COLS }, (_, c) => framePath(row, c))
  preloadFrames(currentRowPaths).then(() => {
    ready = true
    renderFrame()
    viewer.classList.remove('is-loading')
    const allPaths = []
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) allPaths.push(framePath(r, c))
    }
    preloadFrames(allPaths)
  })
}

initOrbitViewer({
  viewerId: 'ergos-viewer',
  imgId: 'ergos-orbit',
  cols: 30,
  rows: 10,
  frameBase: 'assets/img/ergos-orbit/Frame',
  frameExt: '.webp',
  col: 0,
  row: 0,
})

initOrbitViewer({
  viewerId: 'rover-viewer',
  imgId: 'rover-orbit',
  cols: 36,
  rows: 12,
  frameBase: 'assets/img/rover-orbit/Frame',
  frameExt: '.webp',
  col: 5,
  row: 0,
})
