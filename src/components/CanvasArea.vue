<script setup>
import { ref, inject, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

const { t } = useI18n();

const emit = defineEmits(["image-loaded", "action-complete", "processing"]);
const editor = inject("editor");

const scrollArea = ref(null);
const mainCanvas = ref(null);
const cropperImg = ref(null);
const isCropping = ref(false);
let cropper = null;
let isSpotPainting = ref(false);

// Reactive doc dimensions (updated by recomposite)
const docWidth = ref(0);
const docHeight = ref(0);

// Canvas display size in CSS pixels
const displayWidth = computed(() => docWidth.value * editor.zoom);
const displayHeight = computed(() => docHeight.value * editor.zoom);

// ── Active layer helpers ──────────────────────────────────────────────────────
function getActiveCtx() {
  const layer = editor.activeLayer;
  if (!layer || layer.locked) return null;
  return layer.canvas.getContext("2d", { willReadFrequently: true });
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function buildFontString(d) {
  const parts = [];
  if (d.italic) parts.push("italic");
  if (d.bold) parts.push("bold");
  parts.push(`${d.size}px`);
  parts.push(`"${d.font}", sans-serif`);
  return parts.join(" ");
}

// Draw text described by a data object onto ctx
function drawTextOnCtx(ctx, d) {
  if (!d.content) return;
  ctx.save();
  ctx.font = buildFontString(d);
  ctx.fillStyle = d.color;
  ctx.textBaseline = "top";
  const lines = d.content.split("\n");
  const lineHeight = d.size * 1.25;
  const lineThick = Math.max(1, Math.round(d.size / 15));
  lines.forEach((line, i) => {
    const ly = d.y + i * lineHeight;
    ctx.fillText(line, d.x, ly);
    if (line) {
      const w = ctx.measureText(line).width;
      if (d.underline) {
        ctx.fillRect(d.x, ly + d.size + 2, w, lineThick);
      }
      if (d.strikethrough) {
        ctx.fillRect(d.x, ly + d.size * 0.55, w, lineThick);
      }
    }
  });
  ctx.restore();
}

// Re-render a text layer's own canvas from its textData
function renderTextLayer(layer) {
  const { width, height } = layer.canvas;
  const ctx = layer.canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  if (layer.textData) drawTextOnCtx(ctx, layer.textData);
}

// Build text data from the current editor text-tool state
function editorTextData() {
  return {
    content: editor.textContent,
    x: editor.textPos.x,
    y: editor.textPos.y,
    size: editor.textSize,
    color: editor.textColor,
    font: editor.textFont,
    bold: editor.textBold,
    italic: editor.textItalic,
    underline: editor.textUnderline,
    strikethrough: editor.textStrikethrough,
  };
}

// ── Composite all visible layers → mainCanvas ─────────────────────────────────
function recomposite() {
  if (!mainCanvas.value || !editor.layers || !editor.layers.length) return;
  const w = editor.layers[0].canvas.width;
  const h = editor.layers[0].canvas.height;
  docWidth.value = w;
  docHeight.value = h;
  if (mainCanvas.value.width !== w) mainCanvas.value.width = w;
  if (mainCanvas.value.height !== h) mainCanvas.value.height = h;
  const tCtx = mainCanvas.value.getContext("2d");
  tCtx.clearRect(0, 0, w, h);
  // The text layer being actively edited is skipped — live preview replaces it
  const editingTextId =
    editor.currentTool === "text" && editor.textPos ? editor.activeId : null;
  for (const layer of editor.layers) {
    if (!layer.visible) continue;
    if (layer.type === "text") {
      if (layer.id === editingTextId) continue;
      // If this text layer is currently being moved, draw it at the offset position
      if (layerMoveActive && layer.id === editor.activeId && layer.textData) {
        const td = { ...layer.textData, x: layer.textData.x + layerMoveDx, y: layer.textData.y + layerMoveDy };
        drawTextOnCtx(tCtx, td);
        continue;
      }
      renderTextLayer(layer);
    }
    tCtx.drawImage(layer.canvas, 0, 0);
  }
  // Draw live text preview on top of composite (not baked into any layer)
  if (editor.currentTool === "text" && editor.textPos && editor.textContent) {
    drawTextOnCtx(tCtx, editorTextData());
  }
  nextTick(drawRulers);
}

// Re-composite when App.vue signals a structural change (visibility, reorder)
watch(
  () => editor.recompositeSignal,
  () => recomposite(),
);

// Re-composite whenever any text property changes (live preview)
watch(
  () => [
    editor.textContent,
    editor.textSize,
    editor.textColor,
    editor.textBold,
    editor.textItalic,
    editor.textUnderline,
    editor.textStrikethrough,
    editor.textFont,
    editor.textPos?.x,
    editor.textPos?.y,
  ],
  () => {
    if (editor.currentTool === "text") recomposite();
  },
);

// ── File loading ──────────────────────────────────────────────────────────────
function loadFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const name = file.name.replace(/\.[^.]+$/, "") || t("layers.background");
    editor.clearLayers();
    editor.addLayerFromImage(img, name);
    recomposite();
    URL.revokeObjectURL(url);
    emit("image-loaded", {
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };
  img.src = url;
}

function createBlank(width, height, background) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  if (background === "white") {
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  editor.clearLayers();
  editor.addLayerFromImage(c, t("layers.background"));
  recomposite();
  emit("image-loaded", { width, height });
}

function fitToWindow() {
  const area = scrollArea.value;
  if (!area || !docWidth.value || !docHeight.value) return;
  const scaleX = (area.clientWidth - 64) / docWidth.value;
  const scaleY = (area.clientHeight - 64) / docHeight.value;
  editor.setZoom(Math.min(1, Math.min(scaleX, scaleY)));
}

// ── Tool activation ──────────────────────────────────────────────────────────
function activateTool(tool) {
  if (tool === "crop") initCropper();
  if (tool === "color") {
    const layer = editor.activeLayer;
    if (!layer || layer.locked) return;
    const lctx = getActiveCtx();
    if (lctx) {
      colorOrigData = lctx.getImageData(
        0,
        0,
        layer.canvas.width,
        layer.canvas.height,
      );
    }
  }
  if (tool === "filter") initFilterPreview();
  if (tool === "text") {
    const layer = editor.activeLayer;
    if (layer?.type === "text" && layer.textData) {
      // Load existing text data into editor state for editing
      const td = layer.textData;
      editor.textContent = td.content;
      editor.textSize = td.size;
      editor.textColor = td.color;
      editor.textFont = td.font;
      editor.textBold = td.bold;
      editor.textItalic = td.italic;
      editor.textUnderline = td.underline;
      editor.textStrikethrough = td.strikethrough;
      editor.textPos = { x: td.x, y: td.y };
    } else {
      editor.textPos = null;
    }
  }
}

function cancelTool() {
  if (isCropping.value) destroyCropper();
  if (colorOrigData) {
    const lctx = getActiveCtx();
    if (lctx) {
      lctx.putImageData(colorOrigData, 0, 0);
      recomposite();
    }
    colorOrigData = null;
  }
  if (filterOrigData) {
    cancelFilterPreview();
  }
  if (editor.textPos !== null) {
    editor.textPos = null;
    recomposite();
  }
}

// ── Filter presets ───────────────────────────────────────────────────────────
const FILTER_PRESETS = {
  normal: {
    mode: "standard",
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    vignette: 0,
  },
  bw: {
    mode: "bw",
    brightness: 0,
    contrast: 8,
    saturation: 0,
    temperature: 0,
    vignette: 0,
  },
  sepia: {
    mode: "sepia",
    brightness: 0,
    contrast: 8,
    saturation: 0,
    temperature: 0,
    vignette: 0,
  },
  vivid: {
    mode: "standard",
    brightness: 3,
    contrast: 28,
    saturation: 55,
    temperature: 0,
    vignette: 0,
  },
  fade: {
    mode: "standard",
    brightness: 18,
    contrast: -22,
    saturation: -28,
    temperature: 0,
    vignette: 0,
  },
  cool: {
    mode: "standard",
    brightness: 0,
    contrast: 6,
    saturation: 8,
    temperature: -38,
    vignette: 0,
  },
  warm: {
    mode: "standard",
    brightness: 0,
    contrast: 5,
    saturation: 12,
    temperature: 38,
    vignette: 0,
  },
  drama: {
    mode: "standard",
    brightness: -8,
    contrast: 48,
    saturation: 18,
    temperature: 0,
    vignette: 35,
  },
  vintage: {
    mode: "sepia",
    brightness: -5,
    contrast: 12,
    saturation: -20,
    temperature: 15,
    vignette: 40,
  },
  chrome: {
    mode: "standard",
    brightness: 8,
    contrast: 38,
    saturation: -18,
    temperature: -12,
    vignette: 18,
  },
};

let filterOrigData = null;

function getFilterThumbnail() {
  if (!mainCanvas.value) return null;
  const maxSize = 72;
  const w = mainCanvas.value.width;
  const h = mainCanvas.value.height;
  const scale = Math.min(maxSize / w, maxSize / h, 1);
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const thumb = document.createElement("canvas");
  thumb.width = tw;
  thumb.height = th;
  thumb.getContext("2d").drawImage(mainCanvas.value, 0, 0, tw, th);
  return thumb.toDataURL("image/jpeg", 0.82);
}

function applyFilterData(data, preset) {
  const {
    mode = "standard",
    brightness = 0,
    contrast = 0,
    saturation = 0,
    temperature = 0,
  } = preset;
  const cFactor =
    contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));
  const bShift = (brightness / 100) * 128;
  const tR = temperature * 0.4;
  const tB = -temperature * 0.4;
  const sFactor = 1 + saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    if (mode === "bw") {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = l;
    } else if (mode === "sepia") {
      const nr = 0.393 * r + 0.769 * g + 0.189 * b;
      const ng = 0.349 * r + 0.686 * g + 0.168 * b;
      const nb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = nr;
      g = ng;
      b = nb;
    }

    r += bShift;
    g += bShift;
    b += bShift;
    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;
    r += tR;
    b += tB;

    if (mode !== "bw") {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * sFactor;
      g = lum + (g - lum) * sFactor;
      b = lum + (b - lum) * sFactor;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

function applyVignetteToCtx(ctx, w, h, strength) {
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    0,
    w / 2,
    h / 2,
    Math.sqrt(w * w + h * h) / 2,
  );
  const alpha = (strength / 100) * 0.88;
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.45, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function initFilterPreview() {
  const layer = editor.activeLayer;
  if (!layer || layer.locked) return;
  const lctx = getActiveCtx();
  if (lctx)
    filterOrigData = lctx.getImageData(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height,
    );
}

function applyFilterPreview(filterName) {
  if (!filterOrigData) return;
  const preset = FILTER_PRESETS[filterName];
  if (!preset) return;
  const copy = new Uint8ClampedArray(filterOrigData.data);
  applyFilterData(copy, preset);
  const lctx = getActiveCtx();
  if (!lctx) return;
  lctx.putImageData(
    new ImageData(copy, filterOrigData.width, filterOrigData.height),
    0,
    0,
  );
  if (preset.vignette > 0)
    applyVignetteToCtx(
      lctx,
      filterOrigData.width,
      filterOrigData.height,
      preset.vignette,
    );
  recomposite();
}

function commitFilter() {
  filterOrigData = null;
  if (editor.activeId != null) editor.bumpLayerVersion(editor.activeId);
  recomposite();
}

function cancelFilterPreview() {
  if (!filterOrigData) return;
  const lctx = getActiveCtx();
  if (lctx) {
    lctx.putImageData(filterOrigData, 0, 0);
    recomposite();
  }
  filterOrigData = null;
}

// ── Color Correction ─────────────────────────────────────────────────────────
let colorOrigData = null;

function applyColorFilter(data, brightness, contrast, temperature, saturation) {
  // Contrast factor (GDI+ formula)
  const cFactor =
    contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));
  // Brightness shift (−100…+100 → −128…+128)
  const bShift = (brightness / 100) * 128;
  // Temperature: warm shifts +R −B, cool is inverse
  const tR = temperature * 0.4;
  const tB = -temperature * 0.4;
  // Saturation factor
  const sFactor = 1 + saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    // 1. Brightness
    r += bShift;
    g += bShift;
    b += bShift;

    // 2. Contrast
    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;

    // 3. Temperature (white balance)
    r += tR;
    b += tB;

    // 4. Saturation via luminance mixing
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * sFactor;
    g = lum + (g - lum) * sFactor;
    b = lum + (b - lum) * sFactor;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
    // alpha [i+3] untouched
  }
}

function applyColorPreview(brightness, contrast, temperature, saturation) {
  if (!colorOrigData) return;
  const copy = new Uint8ClampedArray(colorOrigData.data);
  applyColorFilter(copy, brightness, contrast, temperature, saturation);
  const lctx = getActiveCtx();
  if (!lctx) return;
  lctx.putImageData(
    new ImageData(copy, colorOrigData.width, colorOrigData.height),
    0,
    0,
  );
  recomposite();
}

function commitColor() {
  colorOrigData = null;
  if (editor.activeId != null) editor.bumpLayerVersion(editor.activeId);
  recomposite();
}

// ── Text tool ─────────────────────────────────────────────────────────────────
function applyText() {
  if (!editor.textPos || !editor.textContent) return;
  const td = editorTextData();
  const active = editor.activeLayer;

  if (active?.type === "text") {
    // Update existing text layer
    if (active.locked) return;
    active.textData = td;
    renderTextLayer(active);
    active.version++;
    editor.textPos = null;
    recomposite();
    emit("action-complete", {
      width: active.canvas.width,
      height: active.canvas.height,
    });
  } else {
    // Create a new text layer
    const name = td.content.slice(0, 20).replace(/\n/g, " ") || "Text";
    editor.textPos = null;
    const layer = editor.addTextLayer(name);
    layer.textData = td;
    renderTextLayer(layer);
    layer.version++;
    recomposite();
    emit("action-complete", {
      width: layer.canvas.width,
      height: layer.canvas.height,
    });
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function getSnapshot() {
  return editor.getLayersSnapshot();
}

function restoreSnapshot(snap) {
  return editor.restoreLayersSnapshot(snap).then(() => recomposite());
}

// ── Crop tool ─────────────────────────────────────────────────────────────────
function initCropper() {
  const dataUrl = mainCanvas.value.toDataURL();
  cropperImg.value.src = dataUrl;
  isCropping.value = true;
  // Wait for img to be visible in DOM
  setTimeout(() => {
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropperImg.value, {
      aspectRatio: editor.cropAspect,
      viewMode: 1,
      dragMode: "crop",
      autoCropArea: 0.85,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  }, 50);
}

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  isCropping.value = false;
  cropperImg.value.src = "";
}

function applyCrop() {
  if (!cropper) return;
  // getData(true) rounds coords to integers — same rect applied to all layers
  const data = cropper.getData(true);
  for (const layer of editor.layers) {
    const tmp = document.createElement("canvas");
    tmp.width = data.width;
    tmp.height = data.height;
    tmp.getContext("2d").drawImage(layer.canvas, -data.x, -data.y);
    layer.canvas = tmp;
    layer.version++;
  }
  destroyCropper();
  recomposite();
  emit("action-complete", { width: data.width, height: data.height });
}

// Watch aspect ratio changes while crop is active
watch(
  () => editor.cropAspect,
  (val) => {
    if (cropper) cropper.setAspectRatio(val);
  },
);

// ── Background removal ────────────────────────────────────────────────────────
async function applyBgRemove() {
  emit("processing", true);
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const layer = editor.activeLayer;
    if (!layer) return;
    const blob = await new Promise((resolve) =>
      layer.canvas.toBlob(resolve, "image/png"),
    );
    const resultBlob = await removeBackground(blob);
    const url = URL.createObjectURL(resultBlob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const newCanvas = document.createElement("canvas");
    newCanvas.width = img.width;
    newCanvas.height = img.height;
    newCanvas.getContext("2d").drawImage(img, 0, 0);
    layer.canvas = newCanvas;
    layer.version++;
    URL.revokeObjectURL(url);
    recomposite();
    emit("action-complete", { width: img.width, height: img.height });
  } catch (err) {
    console.error("Background removal failed:", err);
    alert("Не вдалося прибрати фон. Перевірте з'єднання з мережею.");
  } finally {
    emit("processing", false);
  }
}

// ── Resize ────────────────────────────────────────────────────────────────────
function applyResize(newW, newH) {
  for (const layer of editor.layers) {
    const tmp = document.createElement("canvas");
    tmp.width = newW;
    tmp.height = newH;
    const tmpCtx = tmp.getContext("2d");
    tmpCtx.imageSmoothingEnabled = true;
    tmpCtx.imageSmoothingQuality = "high";
    tmpCtx.drawImage(layer.canvas, 0, 0, newW, newH);
    layer.canvas = tmp;
    layer.version++;
  }
  recomposite();
  emit("action-complete", { width: newW, height: newH });
}

// ── Spot / Heal brush ─────────────────────────────────────────────────────────
let lastHealX = null;
let lastHealY = null;
let healStarted = false;

function getCanvasCoords(e) {
  const rect = mainCanvas.value.getBoundingClientRect();
  const scaleX = docWidth.value / rect.width;
  const scaleY = docHeight.value / rect.height;
  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY),
  };
}

// ── Layer move with snap guides (Photoshop-style) ───────────────────────────
const guideCanvas = ref(null);
let layerMoveActive = false;
let layerMoveStartX = 0;
let layerMoveStartY = 0;
let layerMoveDx = 0;        // current snapped delta (used by recomposite for text layers)
let layerMoveDy = 0;
let layerOrigData = null;   // ImageData backup
let layerBBox = null;       // { l, t, r, b, w, h } bounding box of non-transparent content

const SNAP_THRESHOLD = 8;   // doc pixels

// Find bounding box of non-transparent pixels
function getContentBBox(imageData) {
  const { data, width, height } = imageData;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) return null; // fully transparent
  return { l: minX, t: minY, r: maxX, b: maxY };
}

// 9 anchor points of a rect
function anchors9(l, t, r, b) {
  const cx = (l + r) / 2, cy = (t + b) / 2;
  return [
    { x: l,  y: t  }, { x: cx, y: t  }, { x: r,  y: t  },
    { x: l,  y: cy }, { x: cx, y: cy }, { x: r,  y: cy },
    { x: l,  y: b  }, { x: cx, y: b  }, { x: r,  y: b  },
  ];
}

function computeSnap(dx, dy) {
  if (!layerBBox) return { dx, dy, guideXs: [], guideYs: [] };
  const docW = docWidth.value, docH = docHeight.value;

  // Current layer bbox after offset
  const ll = layerBBox.l + dx, lt = layerBBox.t + dy;
  const lr = layerBBox.r + dx, lb = layerBBox.b + dy;

  const layerPts  = anchors9(ll, lt, lr, lb);
  const docPts    = anchors9(0, 0, docW, docH);

  let bestDx = null, bestDy = null;
  let bestDistX = SNAP_THRESHOLD + 1, bestDistY = SNAP_THRESHOLD + 1;

  for (const lp of layerPts) {
    for (const dp of docPts) {
      const distX = Math.abs(lp.x - dp.x);
      const distY = Math.abs(lp.y - dp.y);
      if (distX < bestDistX) { bestDistX = distX; bestDx = dp.x - lp.x + dx; }
      if (distY < bestDistY) { bestDistY = distY; bestDy = dp.y - lp.y + dy; }
    }
  }

  const snapDx = bestDistX <= SNAP_THRESHOLD ? bestDx : dx;
  const snapDy = bestDistY <= SNAP_THRESHOLD ? bestDy : dy;

  // Collect guide lines at snapped position
  const guideXs = [], guideYs = [];
  if (bestDistX <= SNAP_THRESHOLD) {
    const sl = layerBBox.l + snapDx, sr = layerBBox.r + snapDx;
    const sc = (sl + sr) / 2;
    for (const dp of docPts) {
      if (Math.abs(sl - dp.x) < 0.5 || Math.abs(sr - dp.x) < 0.5 || Math.abs(sc - dp.x) < 0.5)
        guideXs.push(dp.x);
    }
  }
  if (bestDistY <= SNAP_THRESHOLD) {
    const st = layerBBox.t + snapDy, sb = layerBBox.b + snapDy;
    const sc = (st + sb) / 2;
    for (const dp of docPts) {
      if (Math.abs(st - dp.y) < 0.5 || Math.abs(sb - dp.y) < 0.5 || Math.abs(sc - dp.y) < 0.5)
        guideYs.push(dp.y);
    }
  }

  return { dx: snapDx, dy: snapDy, guideXs, guideYs };
}

function drawGuides(guideXs, guideYs) {
  const gc = guideCanvas.value;
  if (!gc) return;
  const zoom = editor.zoom;
  const dpr  = window.devicePixelRatio || 1;
  const W = gc.clientWidth, H = gc.clientHeight;
  gc.width  = W * dpr;
  gc.height = H * dpr;
  const ctx = gc.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!guideXs.length && !guideYs.length) return;
  ctx.strokeStyle = '#ff3cac';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (const gx of guideXs) {
    const sx = Math.round(gx * zoom) + 0.5;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
  }
  for (const gy of guideYs) {
    const sy = Math.round(gy * zoom) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
  }
}

function clearGuides() {
  const gc = guideCanvas.value;
  if (!gc) return;
  const ctx = gc.getContext('2d');
  ctx.clearRect(0, 0, gc.width, gc.height);
}

function onCanvasMouseDown(e) {
  if (isCropping.value) return;

  if (editor.currentTool === "move") {
    const layer = editor.activeLayer;
    if (!layer || layer.locked) return;
    e.preventDefault();
    layerMoveActive = true;
    const { x, y } = getCanvasCoords(e);
    layerMoveStartX = x;
    layerMoveStartY = y;
    const lctx = layer.canvas.getContext('2d', { willReadFrequently: true });
    layerOrigData = lctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    layerBBox = getContentBBox(layerOrigData);
    return;
  }

  if (editor.currentTool === "text") {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    editor.textPos = { x, y };
    return;
  }

  if (editor.currentTool !== "spot") return;
  e.preventDefault();
  healStarted = true;
  isSpotPainting.value = true;
  const { x, y } = getCanvasCoords(e);
  lastHealX = x;
  lastHealY = y;
  healAt(x, y);
}

function onCanvasMouseMove(e) {
  if (layerMoveActive && editor.currentTool === 'move') {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const rawDx = x - layerMoveStartX;
    const rawDy = y - layerMoveStartY;
    const { dx, dy, guideXs, guideYs } = computeSnap(rawDx, rawDy);
    const layer = editor.activeLayer;
    if (!layer || !layerOrigData) return;
    layerMoveDx = dx;
    layerMoveDy = dy;
    if (layer.type !== 'text') {
      // Pixel layers: physically shift pixels in canvas
      const { width, height } = layer.canvas;
      const lctx = layer.canvas.getContext('2d', { willReadFrequently: true });
      lctx.clearRect(0, 0, width, height);
      lctx.putImageData(layerOrigData, dx, dy);
    }
    recomposite();
    drawGuides(guideXs, guideYs);
    return;
  }

  if (!healStarted || editor.currentTool !== "spot") return;
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);
  if (lastHealX !== null) {
    const steps = Math.max(
      1,
      Math.ceil(
        Math.hypot(x - lastHealX, y - lastHealY) / (editor.spotSize * 0.4),
      ),
    );
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      healAt(
        Math.round(lastHealX + (x - lastHealX) * t),
        Math.round(lastHealY + (y - lastHealY) * t),
      );
    }
  }
  lastHealX = x;
  lastHealY = y;
}

function onCanvasMouseUp() {
  if (layerMoveActive) {
    layerMoveActive = false;
    const layer = editor.activeLayer;
    // For text layers: commit the offset into textData and re-render canvas
    if (layer?.type === 'text' && layer.textData) {
      layer.textData = { ...layer.textData, x: layer.textData.x + layerMoveDx, y: layer.textData.y + layerMoveDy };
      renderTextLayer(layer);
    }
    layerMoveDx = 0;
    layerMoveDy = 0;
    layerOrigData = null;
    layerBBox = null;
    clearGuides();
    if (editor.activeId != null) editor.bumpLayerVersion(editor.activeId);
    emit('action-complete', {
      width: editor.activeLayer?.canvas.width,
      height: editor.activeLayer?.canvas.height,
    });
    return;
  }

  if (!healStarted) return;
  healStarted = false;
  isSpotPainting.value = false;
  lastHealX = null;
  lastHealY = null;
  // Bump version so LayersPanel thumbnail updates after stroke ends
  if (editor.activeId != null) editor.bumpLayerVersion(editor.activeId);
}

function healAt(cx, cy) {
  const layer = editor.activeLayer;
  if (!layer || layer.locked) return;
  const lctx = getActiveCtx();
  if (!lctx) return;

  const r = Math.max(2, editor.spotSize);
  const strength = editor.spotStrength;
  const cw = layer.canvas.width;
  const ch = layer.canvas.height;

  const x0 = Math.max(0, cx - Math.ceil(r * 2));
  const y0 = Math.max(0, cy - Math.ceil(r * 2));
  const x1 = Math.min(cw, cx + Math.ceil(r * 2) + 1);
  const y1 = Math.min(ch, cy + Math.ceil(r * 2) + 1);
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;

  const imageData = lctx.getImageData(x0, y0, w, h);
  const src = imageData.data;

  // Compute average color of surrounding ring (innerR..outerR)
  const innerR = r;
  const outerR = r * 1.6;
  let rSum = 0,
    gSum = 0,
    bSum = 0,
    aSum = 0,
    count = 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dist = Math.hypot(x0 + px - cx, y0 + py - cy);
      if (dist >= innerR && dist <= outerR) {
        const i = (py * w + px) * 4;
        rSum += src[i];
        gSum += src[i + 1];
        bSum += src[i + 2];
        aSum += src[i + 3];
        count++;
      }
    }
  }
  if (count === 0) return;
  const avgR = rSum / count,
    avgG = gSum / count,
    avgB = bSum / count,
    avgA = aSum / count;

  // Blend inner brush area toward ring average
  const dst = new Uint8ClampedArray(src);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dist = Math.hypot(x0 + px - cx, y0 + py - cy);
      if (dist >= innerR) continue;
      const falloff = (1 - dist / innerR) ** 2;
      const f = falloff * strength;
      const i = (py * w + px) * 4;
      dst[i] = src[i] * (1 - f) + avgR * f;
      dst[i + 1] = src[i + 1] * (1 - f) + avgG * f;
      dst[i + 2] = src[i + 2] * (1 - f) + avgB * f;
      dst[i + 3] = src[i + 3] * (1 - f) + avgA * f;
    }
  }
  lctx.putImageData(new ImageData(dst, w, h), x0, y0);
  recomposite();
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportImage({ format, quality }) {
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const q = format === "jpg" ? quality / 100 : undefined;
  recomposite(); // ensure all visible layers are composited
  const dataUrl = mainCanvas.value.toDataURL(mime, q);
  const a = document.createElement("a");
  a.download = `imago-export.${format}`;
  a.href = dataUrl;
  a.click();
}

function onWheel(e) {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const steps = [
    0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8,
  ];
  const cur = editor.zoom;
  const idx = steps.findIndex((s) => s >= cur - 0.001);
  if (e.deltaY < 0) {
    const next = steps[Math.min(idx + 1, steps.length - 1)];
    if (next !== cur) editor.setZoom(next);
  } else {
    const prev = steps[Math.max(idx - 1, 0)];
    if (prev !== cur) editor.setZoom(prev);
  }
}

onMounted(() => {
  window.addEventListener("mouseup", onCanvasMouseUp);
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", drawRulers);
});
onUnmounted(() => {
  window.removeEventListener("mouseup", onCanvasMouseUp);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("resize", drawRulers);
  if (cropper) cropper.destroy();
});

const isDragging = ref(false);
function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("image/")) loadFile(file);
}

// ── Rulers ───────────────────────────────────────────────────────────────────
const rulerH = ref(null);
const rulerV = ref(null);
const RULER_PX = 20;

watch(() => editor.zoom, () => nextTick(drawRulers));

function rulerStep(zoom) {
  const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  for (const s of steps) if (s * zoom >= 60) return s;
  return 5000;
}

function drawRulers() {
  if (!editor.hasImage || !scrollArea.value || !mainCanvas.value) return;
  const area = scrollArea.value;
  const cvs  = mainCanvas.value;
  const zoom  = editor.zoom;
  const dpr   = window.devicePixelRatio || 1;
  const step  = rulerStep(zoom);

  // Read theme colors from CSS variables so rulers match any theme
  const cs = getComputedStyle(document.documentElement);
  const colors = {
    bg:        cs.getPropertyValue('--bg-elevated').trim()    || '#fafafa',
    tick:      cs.getPropertyValue('--border-strong').trim()  || 'rgba(0,0,0,.14)',
    tickMinor: cs.getPropertyValue('--border').trim()         || 'rgba(0,0,0,.08)',
    label:     cs.getPropertyValue('--text-secondary').trim() || '#6b6b80',
    accent:    cs.getPropertyValue('--accent').trim()         || '#4e7cf6',
  };

  const cRect = cvs.getBoundingClientRect();
  const aRect = area.getBoundingClientRect();
  // Canvas origin in the scroll-content coordinate system
  const ox = cRect.left - aRect.left + area.scrollLeft;
  const oy = cRect.top  - aRect.top  + area.scrollTop;

  // ── Horizontal ──
  const rh = rulerH.value;
  if (rh) {
    const W = area.clientWidth;
    rh.width  = W * dpr;  rh.height = RULER_PX * dpr;
    rh.style.width  = W + 'px'; rh.style.height = RULER_PX + 'px';
    const ctx = rh.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rulerDrawH(ctx, W, RULER_PX, ox - area.scrollLeft, zoom, step, docWidth.value, colors);
  }

  // ── Vertical ──
  const rv = rulerV.value;
  if (rv) {
    const H = area.clientHeight;
    rv.width  = RULER_PX * dpr; rv.height = H * dpr;
    rv.style.width  = RULER_PX + 'px'; rv.style.height = H + 'px';
    const ctx = rv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rulerDrawV(ctx, RULER_PX, H, oy - area.scrollTop, zoom, step, docHeight.value, colors);
  }
}

function rulerDrawH(ctx, W, H, startX, zoom, step, docPx, colors) {
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);

  // Highlight: canvas extent
  const l = Math.max(0, startX), r = Math.min(W, startX + docPx * zoom);
  if (r > l) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(l, H - 2, r - l, 2);
    ctx.globalAlpha = 1;
  }

  const minP = Math.floor(-startX / zoom / step) * step;
  const maxP = Math.ceil((W - startX) / zoom / step) * step + step;

  ctx.font = '9px system-ui,sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  for (let p = minP; p <= maxP; p += step) {
    const x = Math.round(startX + p * zoom) + 0.5;
    if (x < -1 || x > W + 1) continue;

    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H - 8);
    ctx.strokeStyle = colors.tick; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = colors.label; ctx.fillText(String(p), x, 2);

    // Minor ticks (/4)
    const ms = step / 4;
    if (ms * zoom >= 5) {
      for (let j = 1; j < 4; j++) {
        const mx = Math.round(startX + (p + j * ms) * zoom) + 0.5;
        if (mx < 0 || mx > W) continue;
        ctx.beginPath(); ctx.moveTo(mx, H); ctx.lineTo(mx, H - 4);
        ctx.strokeStyle = colors.tickMinor; ctx.stroke();
      }
    }
  }

  // Canvas edge lines
  for (const ex of [startX, startX + docPx * zoom]) {
    if (ex < 0 || ex > W) continue;
    const x = Math.round(ex) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function rulerDrawV(ctx, W, H, startY, zoom, step, docPx, colors) {
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);

  const t = Math.max(0, startY), b = Math.min(H, startY + docPx * zoom);
  if (b > t) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(W - 2, t, 2, b - t);
    ctx.globalAlpha = 1;
  }

  const minP = Math.floor(-startY / zoom / step) * step;
  const maxP = Math.ceil((H - startY) / zoom / step) * step + step;

  ctx.font = '9px system-ui,sans-serif';

  for (let p = minP; p <= maxP; p += step) {
    const y = Math.round(startY + p * zoom) + 0.5;
    if (y < -1 || y > H + 1) continue;

    ctx.beginPath(); ctx.moveTo(W, y); ctx.lineTo(W - 8, y);
    ctx.strokeStyle = colors.tick; ctx.lineWidth = 1; ctx.stroke();

    // Rotated label
    ctx.save();
    ctx.translate(W - 10, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = colors.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(p), 0, 0);
    ctx.restore();

    const ms = step / 4;
    if (ms * zoom >= 5) {
      for (let j = 1; j < 4; j++) {
        const my = Math.round(startY + (p + j * ms) * zoom) + 0.5;
        if (my < 0 || my > H) continue;
        ctx.beginPath(); ctx.moveTo(W, my); ctx.lineTo(W - 4, my);
        ctx.strokeStyle = colors.tickMinor; ctx.stroke();
      }
    }
  }

  for (const ey of [startY, startY + docPx * zoom]) {
    if (ey < 0 || ey > H) continue;
    const y = Math.round(ey) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── Fill tool ───────────────────────────────────────────────────────────────────────────────
function applyFill({ mode, color, color1, color2, angle }) {
  const layer = editor.activeLayer;
  if (!layer || layer.locked) return;
  const { width, height } = layer.canvas;
  const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (mode === 'solid') {
    ctx.fillStyle = color;
  } else {
    const rad = (angle * Math.PI) / 180;
    const cx = width / 2, cy = height / 2;
    const len = Math.sqrt(width * width + height * height) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len, cy + Math.sin(rad) * len,
    );
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  layer.version++;
  recomposite();
  emit('action-complete', { width, height });
}

defineExpose({
  loadFile,
  createBlank,
  fitToWindow,
  activateTool,
  cancelTool,
  applyCrop,
  applyBgRemove,
  applyResize,
  applyColorPreview,
  commitColor,
  applyText,
  applyFill,
  getSnapshot,
  restoreSnapshot,
  exportImage,
  getFilterThumbnail,
  applyFilterPreview,
  commitFilter,
  cancelFilterPreview,
});
</script>

<template>
  <div class="canvas-area">
    <!-- Ruler corner + rulers (visible only when image is loaded) -->
    <div v-show="editor.hasImage" class="ruler-corner" />
    <canvas v-show="editor.hasImage" ref="rulerH" class="ruler-h" />
    <canvas v-show="editor.hasImage" ref="rulerV" class="ruler-v" />

    <!-- Drop zone -->
    <div
      v-if="!editor.hasImage"
      class="drop-zone"
      :class="{ dragover: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div class="drop-inner">
        <div class="drop-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect
              x="6"
              y="10"
              width="36"
              height="28"
              rx="4"
              stroke="currentColor"
              stroke-width="2"
            />
            <circle
              cx="17"
              cy="19"
              r="3"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M6 32l9-9 6 6 6-8 15 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <p class="drop-title">{{ t("dropzone.title") }}</p>
        <p class="drop-subtitle">
          {{ t("dropzone.hint1") }} <strong>{{ t("topbar.open") }}</strong>
          {{ t("dropzone.hint2") }}
        </p>
        <p class="drop-formats">{{ t("dropzone.formats") }}</p>
      </div>
    </div>

    <!-- Canvas workspace -->
    <div v-show="editor.hasImage" class="scroll-area" ref="scrollArea" @scroll="drawRulers">
      <div class="canvas-padding">
        <!-- Cropper mode -->
        <div v-show="isCropping" class="cropper-wrap">
          <img ref="cropperImg" class="cropper-src" alt="" />
        </div>

        <!-- Normal canvas mode -->
        <div v-show="!isCropping" class="canvas-wrap"
          :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
        >
          <canvas
            ref="mainCanvas"
            class="main-canvas"
            :class="{
              'cursor-spot': editor.currentTool === 'spot',
              'cursor-text-tool': editor.currentTool === 'text',
              'cursor-grab': editor.currentTool === 'move' && !layerMoveActive,
              'cursor-grabbing': editor.currentTool === 'move' && layerMoveActive,
            }"
            :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
            @mousedown="onCanvasMouseDown"
            @mousemove="onCanvasMouseMove"
          />
          <!-- Snap guide overlay -->
          <canvas
            ref="guideCanvas"
            class="guide-canvas"
            :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
          />
        </div>
      </div>
    </div>

    <!-- Processing overlay -->
    <Transition name="fade">
      <div v-if="editor.isProcessing" class="processing-overlay">
        <div class="processing-card">
          <div class="spinner" />
          <span>{{ t("bg.removingBg") }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.canvas-area {
  flex: 1;
  display: grid;
  grid-template-columns: 20px 1fr;
  grid-template-rows: 20px 1fr;
  position: relative;
  overflow: hidden;
  background: var(--bg-app);
  min-width: 0;
  min-height: 0;
}

/* Rulers */
.ruler-corner {
  grid-column: 1;
  grid-row: 1;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-strong);
  border-bottom: 1px solid var(--border-strong);
  z-index: 2;
}
.ruler-h {
  grid-column: 2;
  grid-row: 1;
  display: block;
  border-bottom: 1px solid var(--border-strong);
  z-index: 2;
}
.ruler-v {
  grid-column: 1;
  grid-row: 2;
  display: block;
  border-right: 1px solid var(--border-strong);
  z-index: 2;
}

/* Drop zone */
.drop-zone {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 40px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-secondary);
  text-align: center;
  max-width: 340px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.drop-zone:hover .drop-inner,
.drop-zone.dragover .drop-inner {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}

.drop-icon {
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.drop-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.drop-subtitle {
  font-size: 12.5px;
}
.drop-formats {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Scroll area */
.scroll-area {
  grid-column: 2;
  grid-row: 2;
  overflow: auto;
  display: flex;
  min-width: 0;
  min-height: 0;
}

.canvas-padding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  min-height: 100%;
  min-width: 100%;
}

/* Main canvas */
.canvas-wrap {
  position: relative;
  flex-shrink: 0;
}

.main-canvas {
  display: block;
  position: relative;
  box-shadow: var(--shadow-lg);
  border-radius: 2px;
  /* Checkerboard for transparency */
  background-image:
    linear-gradient(45deg, #e0e0e8 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e8 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e8 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0px;
  background-color: #f8f8f8;
  image-rendering: auto;
}

.guide-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: block;
}

.cursor-spot {
  cursor: crosshair;
}

.cursor-text-tool {
  cursor: text;
}

.cursor-grab {
  cursor: grab;
}

.cursor-grabbing {
  cursor: grabbing;
}

/* Cropper wrap */
.cropper-wrap {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cropper-src {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - var(--topbar-h) - 80px);
}

/* Processing */
.processing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(240, 240, 245, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.processing-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
