<script setup>
import { ref, inject, computed, watch, onMounted, onUnmounted } from "vue";
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
let ctx = null;
let isSpotPainting = ref(false);

// Canvas display size (CSS pixels = canvas pixels * zoom)
const displayWidth = computed(
  () => (mainCanvas.value?.width ?? 0) * editor.zoom,
);
const displayHeight = computed(
  () => (mainCanvas.value?.height ?? 0) * editor.zoom,
);

onMounted(() => {
  ctx = mainCanvas.value.getContext("2d", { willReadFrequently: true });
});

// ── File loading ──────────────────────────────────────────────────────────────
function loadFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    mainCanvas.value.width = img.width;
    mainCanvas.value.height = img.height;
    ctx.clearRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    emit("image-loaded", { width: img.width, height: img.height });
  };
  img.src = url;
}

function fitToWindow() {
  const area = scrollArea.value;
  if (!area || !mainCanvas.value) return;
  const scaleX = (area.clientWidth - 64) / mainCanvas.value.width;
  const scaleY = (area.clientHeight - 64) / mainCanvas.value.height;
  editor.setZoom(Math.min(1, Math.min(scaleX, scaleY)));
}

// ── Tool activation ──────────────────────────────────────────────────────────
function activateTool(tool) {
  if (tool === "crop") initCropper();
  if (tool === "color") {
    // Store original pixels for live preview / cancel
    const c = mainCanvas.value;
    colorOrigData = ctx.getImageData(0, 0, c.width, c.height);
  }
}

function cancelTool() {
  if (isCropping.value) destroyCropper();
  if (colorOrigData) {
    ctx.putImageData(colorOrigData, 0, 0);
    colorOrigData = null;
  }
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
  ctx.putImageData(
    new ImageData(copy, colorOrigData.width, colorOrigData.height),
    0,
    0,
  );
}

function commitColor() {
  // Canvas already shows the filtered result — just discard saved original
  colorOrigData = null;
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function getSnapshot() {
  return new Promise((resolve) => {
    const c = mainCanvas.value;
    c.toBlob(
      (blob) => resolve({ blob, width: c.width, height: c.height }),
      "image/png",
    );
  });
}

function restoreSnapshot(snap) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(snap.blob);
    const img = new Image();
    img.onload = () => {
      mainCanvas.value.width = snap.width;
      mainCanvas.value.height = snap.height;
      ctx.clearRect(0, 0, snap.width, snap.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
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
  const cropped = cropper.getCroppedCanvas();
  mainCanvas.value.width = cropped.width;
  mainCanvas.value.height = cropped.height;
  ctx.clearRect(0, 0, cropped.width, cropped.height);
  ctx.drawImage(cropped, 0, 0);
  destroyCropper();
  emit("action-complete", { width: cropped.width, height: cropped.height });
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
    const blob = await new Promise((resolve) =>
      mainCanvas.value.toBlob(resolve, "image/png"),
    );
    const resultBlob = await removeBackground(blob);
    const url = URL.createObjectURL(resultBlob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    mainCanvas.value.width = img.width;
    mainCanvas.value.height = img.height;
    ctx.clearRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    emit("action-complete", { width: img.width, height: img.height });
  } catch (err) {
    console.error("Background removal failed:", err);
    alert("Не удалось убрать фон. Проверьте подключение к сети.");
  } finally {
    emit("processing", false);
  }
}

// ── Resize ────────────────────────────────────────────────────────────────────
function applyResize(newW, newH) {
  const c = mainCanvas.value;
  const tmp = document.createElement("canvas");
  tmp.width = newW;
  tmp.height = newH;
  const tmpCtx = tmp.getContext("2d");
  tmpCtx.imageSmoothingEnabled = true;
  tmpCtx.imageSmoothingQuality = "high";
  tmpCtx.drawImage(c, 0, 0, newW, newH);
  c.width = newW;
  c.height = newH;
  ctx.drawImage(tmp, 0, 0);
  emit("action-complete", { width: newW, height: newH });
}

// ── Spot / Heal brush ─────────────────────────────────────────────────────────
let lastHealX = null;
let lastHealY = null;
let healStarted = false;

function getCanvasCoords(e) {
  const rect = mainCanvas.value.getBoundingClientRect();
  const scaleX = mainCanvas.value.width / rect.width;
  const scaleY = mainCanvas.value.height / rect.height;
  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY),
  };
}

function onCanvasMouseDown(e) {
  if (editor.currentTool !== "spot" || isCropping.value) return;
  e.preventDefault();
  healStarted = true;
  isSpotPainting.value = true;
  const { x, y } = getCanvasCoords(e);
  lastHealX = x;
  lastHealY = y;
  healAt(x, y);
}

function onCanvasMouseMove(e) {
  if (!healStarted || editor.currentTool !== "spot") return;
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);
  // Interpolate between last and current point for smooth strokes
  if (lastHealX !== null) {
    const steps = Math.max(
      1,
      Math.ceil(
        Math.hypot(x - lastHealX, y - lastHealY) /
          (editor.spotSize.value * 0.4),
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
  if (!healStarted) return;
  healStarted = false;
  isSpotPainting.value = false;
  lastHealX = null;
  lastHealY = null;
}

function healAt(cx, cy) {
  const r = Math.max(2, editor.spotSize);
  const strength = editor.spotStrength;
  const cw = mainCanvas.value.width;
  const ch = mainCanvas.value.height;

  const x0 = Math.max(0, cx - Math.ceil(r * 2));
  const y0 = Math.max(0, cy - Math.ceil(r * 2));
  const x1 = Math.min(cw, cx + Math.ceil(r * 2) + 1);
  const y1 = Math.min(ch, cy + Math.ceil(r * 2) + 1);
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;

  const imageData = ctx.getImageData(x0, y0, w, h);
  const src = imageData.data;

  // Compute average color of surrounding ring (r..r*1.6)
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

  // Blend inner brush area toward average
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
  ctx.putImageData(new ImageData(dst, w, h), x0, y0);
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportImage({ format, quality }) {
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const q = format === "jpg" ? quality / 100 : undefined;
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
});
onUnmounted(() => {
  window.removeEventListener("mouseup", onCanvasMouseUp);
  window.removeEventListener("wheel", onWheel);
  if (cropper) cropper.destroy();
});

const isDragging = ref(false);
function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("image/")) loadFile(file);
}

defineExpose({
  loadFile,
  fitToWindow,
  activateTool,
  cancelTool,
  applyCrop,
  applyBgRemove,
  applyResize,
  applyColorPreview,
  commitColor,
  getSnapshot,
  restoreSnapshot,
  exportImage,
});
</script>

<template>
  <div class="canvas-area">
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
    <div v-show="editor.hasImage" class="scroll-area" ref="scrollArea">
      <div class="canvas-padding">
        <!-- Cropper mode -->
        <div v-show="isCropping" class="cropper-wrap">
          <img ref="cropperImg" class="cropper-src" alt="" />
        </div>

        <!-- Normal canvas mode -->
        <canvas
          v-show="!isCropping"
          ref="mainCanvas"
          class="main-canvas"
          :class="{ 'cursor-spot': editor.currentTool === 'spot' }"
          :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
          @mousedown="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
        />
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
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  background: var(--bg-app);
}

/* Drop zone */
.drop-zone {
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
  flex: 1;
  overflow: auto;
  display: flex;
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
.main-canvas {
  display: block;
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

.cursor-spot {
  cursor: crosshair;
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
