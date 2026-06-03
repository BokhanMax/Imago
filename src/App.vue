<script setup>
import { ref, provide, reactive, nextTick, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import TopBar from "./components/TopBar.vue";
import Sidebar from "./components/Sidebar.vue";
import CanvasArea from "./components/CanvasArea.vue";
import RightPanel from "./components/RightPanel.vue";
import LayersPanel from "./components/LayersPanel.vue";
import ExportModal from "./components/ExportModal.vue";
import CreateModal from "./components/CreateModal.vue";
import { useHistory } from "./composables/useHistory.js";
import { useLayers } from "./composables/useLayers.js";

const { locale, t } = useI18n();

const appVersion = __APP_VERSION__;

onMounted(() => {
  document.documentElement.lang = locale.value;
});

const canvasAreaRef = ref(null);
const currentTool = ref("move");
const hasImage = ref(false);
const isProcessing = ref(false);
const zoom = ref(1);
const showExport = ref(false);
const showCreate = ref(false);

const cropAspect = ref(NaN);
const spotSize = ref(20);
const spotStrength = ref(0.65);
const resizeWidth = ref(0);
const resizeHeight = ref(0);
const resizeConstrain = ref(true);

const colorBrightness = ref(0);
const colorContrast = ref(0);
const colorTemperature = ref(0);
const colorSaturation = ref(0);

// Filter tool state
const activeFilter = ref("normal");
const filterThumbnail = ref(null);

// Fill tool state
const fillMode = ref("solid"); // 'solid' | 'gradient'
const fillColor = ref("#4e7cf6");
const fillColor1 = ref("#4e7cf6");
const fillColor2 = ref("#ffffff");
const fillAngle = ref(90);

// Eraser tool state
const eraserSize = ref(30);
const eraserHardness = ref(80);

// Text tool state
const textContent = ref("");
const textSize = ref(48);
const textColor = ref("#000000");
const textBold = ref(false);
const textItalic = ref(false);
const textUnderline = ref(false);
const textStrikethrough = ref(false);
const textFont = ref("Arial");
const textPos = ref(null); // { x, y } in canvas pixel space, set by click

const { push, undo, redo, clear, canUndo, canRedo } = useHistory(24);

// ── Layers ────────────────────────────────────────────────────────────────────
const {
  layers,
  activeId,
  activeLayer,
  addFromImage,
  addEmpty,
  addTextLayer,
  removeLayer,
  moveUp,
  moveDown,
  setActive,
  toggleVisible,
  toggleLock,
  renameLayer,
  bumpVersion,
  clearAll: clearLayers,
  getSnapshot: getLayersSnapshot,
  restoreSnapshot: restoreLayersSnapshot,
} = useLayers();

// Signal CanvasArea to re-composite (after visibility/order changes)
const recompositeSignal = ref(0);

function addLayer() {
  const name = t("layers.layerName", { n: layers.value.length + 1 });
  addEmpty(name);
  // New layer is transparent — no recomposite needed visually
}

function removeActiveLayer() {
  removeLayer(activeId.value);
  recompositeSignal.value++;
}

function moveActiveLayerUp() {
  moveUp(activeId.value);
  recompositeSignal.value++;
}

function moveActiveLayerDown() {
  moveDown(activeId.value);
  recompositeSignal.value++;
}

function toggleLayerVisible(id) {
  toggleVisible(id);
  recompositeSignal.value++;
}

function toggleLayerLock(id) {
  toggleLock(id);
}

function setTool(tool) {
  if (!hasImage.value) return;
  if (currentTool.value === tool) {
    currentTool.value = "move";
    canvasAreaRef.value?.cancelTool();
    return;
  }
  canvasAreaRef.value?.cancelTool();
  currentTool.value = tool;
  canvasAreaRef.value?.activateTool(tool);
}

async function saveSnapshot() {
  const snap = await canvasAreaRef.value?.getSnapshot();
  if (snap) push(snap);
}

async function performUndo() {
  const snap = undo();
  if (snap) {
    await canvasAreaRef.value?.restoreSnapshot(snap);
    const active =
      snap.layerSnaps?.find((s) => s.id === snap.activeId) ??
      snap.layerSnaps?.[0];
    if (active) {
      resizeWidth.value = active.w;
      resizeHeight.value = active.h;
    }
  }
}

async function performRedo() {
  const snap = redo();
  if (snap) {
    await canvasAreaRef.value?.restoreSnapshot(snap);
    const active =
      snap.layerSnaps?.find((s) => s.id === snap.activeId) ??
      snap.layerSnaps?.[0];
    if (active) {
      resizeWidth.value = active.w;
      resizeHeight.value = active.h;
    }
  }
}

function loadFile(file) {
  canvasAreaRef.value?.loadFile(file);
}

async function createNew({ width, height, background }) {
  showCreate.value = false;
  canvasAreaRef.value?.createBlank(width, height, background);
}

async function onImageLoaded(dims) {
  hasImage.value = true;
  resizeWidth.value = dims.width;
  resizeHeight.value = dims.height;
  currentTool.value = "move";
  clear();
  await nextTick();
  canvasAreaRef.value?.fitToWindow();
  await saveSnapshot();
}

async function onActionComplete(dims) {
  if (dims) {
    resizeWidth.value = dims.width;
    resizeHeight.value = dims.height;
  }
  // Brush-style tools stay active between strokes
  const persistentTools = ["eraser", "spot"];
  if (!persistentTools.includes(currentTool.value)) {
    currentTool.value = "move";
  }
  await saveSnapshot();
}

function applyCrop() {
  canvasAreaRef.value?.applyCrop();
}
function cancelCrop() {
  currentTool.value = "move";
  canvasAreaRef.value?.cancelTool();
}
function applyBgRemove() {
  canvasAreaRef.value?.applyBgRemove();
}
function applyResize() {
  canvasAreaRef.value?.applyResize(resizeWidth.value, resizeHeight.value);
}
function exportImage(opts) {
  canvasAreaRef.value?.exportImage(opts);
  showExport.value = false;
}

function resetColorSliders() {
  colorBrightness.value = 0;
  colorContrast.value = 0;
  colorTemperature.value = 0;
  colorSaturation.value = 0;
}
async function applyColor() {
  canvasAreaRef.value?.commitColor();
  currentTool.value = "move";
  await saveSnapshot();
}
function cancelColor() {
  canvasAreaRef.value?.cancelTool();
  resetColorSliders();
  currentTool.value = "move";
}

function applyText() {
  canvasAreaRef.value?.applyText();
}
function cancelText() {
  canvasAreaRef.value?.cancelTool();
  currentTool.value = "move";
}

watch(
  [colorBrightness, colorContrast, colorTemperature, colorSaturation],
  () => {
    if (currentTool.value === "color") {
      canvasAreaRef.value?.applyColorPreview(
        colorBrightness.value,
        colorContrast.value,
        colorTemperature.value,
        colorSaturation.value,
      );
    }
  },
);

// Capture thumbnail + init preview when filter tool activates
watch(currentTool, async (tool) => {
  if (tool === "filter") {
    await nextTick();
    filterThumbnail.value = canvasAreaRef.value?.getFilterThumbnail() ?? null;
    activeFilter.value = "normal";
  }
});

function applyFilterPreview(name) {
  activeFilter.value = name;
  canvasAreaRef.value?.applyFilterPreview(name);
}
async function applyFilter() {
  canvasAreaRef.value?.commitFilter();
  currentTool.value = "move";
  await saveSnapshot();
}
function cancelFilter() {
  canvasAreaRef.value?.cancelFilterPreview();
  currentTool.value = "move";
}

async function applyFill() {
  canvasAreaRef.value?.applyFill({
    mode: fillMode.value,
    color: fillColor.value,
    color1: fillColor1.value,
    color2: fillColor2.value,
    angle: fillAngle.value,
  });
  currentTool.value = "move";
  await saveSnapshot();
}
function setZoom(v) {
  zoom.value = Math.min(8, Math.max(0.1, v));
}

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    performUndo();
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "y" || (e.key === "z" && e.shiftKey))
  ) {
    e.preventDefault();
    performRedo();
  }
}

provide(
  "editor",
  reactive({
    // UI state
    currentTool,
    hasImage,
    isProcessing,
    zoom,
    canUndo,
    canRedo,
    cropAspect,
    spotSize,
    spotStrength,
    resizeWidth,
    resizeHeight,
    resizeConstrain,
    colorBrightness,
    colorContrast,
    colorTemperature,
    colorSaturation,
    // Text tool state
    textContent,
    textSize,
    textColor,
    textBold,
    textItalic,
    textUnderline,
    textStrikethrough,
    textFont,
    textPos,
    // Filter tool state
    activeFilter,
    filterThumbnail,
    // Fill tool state
    fillMode,
    fillColor,
    fillColor1,
    fillColor2,
    fillAngle,
    // Eraser tool state
    eraserSize,
    eraserHardness,
    // Layers state (refs/computed auto-unwrap inside reactive)
    layers,
    activeId,
    activeLayer,
    recompositeSignal,
    // UI actions
    setTool,
    performUndo,
    performRedo,
    loadFile,
    openCreate: () => {
      showCreate.value = true;
    },
    applyCrop,
    cancelCrop,
    applyBgRemove,
    applyResize,
    applyColor,
    cancelColor,
    resetColorSliders,
    applyText,
    cancelText,
    applyFilterPreview,
    applyFilter,
    cancelFilter,
    applyFill,
    setZoom,
    openExport: () => {
      showExport.value = true;
    },
    // Layers actions
    clearLayers,
    addLayerFromImage: addFromImage,
    addLayer,
    addTextLayer,
    removeActiveLayer,
    moveActiveLayerUp,
    moveActiveLayerDown,
    setActiveLayer: setActive,
    toggleLayerVisible,
    toggleLayerLock,
    renameLayer,
    bumpLayerVersion: bumpVersion,
    getLayersSnapshot,
    restoreLayersSnapshot,
  }),
);
</script>

<template>
  <div class="app" @keydown="onKeyDown" tabindex="-1">
    <TopBar />
    <main class="app-body">
      <Sidebar />
      <CanvasArea
        ref="canvasAreaRef"
        @image-loaded="onImageLoaded"
        @action-complete="onActionComplete"
        @processing="isProcessing = $event"
      />
      <Transition name="slide-right">
        <div v-if="hasImage" class="right-col">
          <RightPanel />
          <LayersPanel />
        </div>
      </Transition>
    </main>
    <footer class="statusbar">
      <span> © Max Bokhan, 2026 | ver. {{ appVersion }} </span>
    </footer>
    <Transition name="fade">
      <ExportModal
        v-if="showExport"
        @close="showExport = false"
        @export="exportImage"
      />
    </Transition>
    <Transition name="fade">
      <CreateModal
        v-if="showCreate"
        @close="showCreate = false"
        @create="createNew"
      />
    </Transition>
  </div>
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-app);
  overflow: hidden;
  outline: none;
}
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}
.right-col {
  width: var(--panel-w);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--border);
  flex-shrink: 0;
}
.statusbar {
  height: 22px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
}
.statusbar span {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
  user-select: none;
}
</style>
