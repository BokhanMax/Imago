<script setup>
import { ref, provide, reactive, nextTick, watch } from "vue";
import TopBar from "./components/TopBar.vue";
import Sidebar from "./components/Sidebar.vue";
import CanvasArea from "./components/CanvasArea.vue";
import RightPanel from "./components/RightPanel.vue";
import ExportModal from "./components/ExportModal.vue";
import { useHistory } from "./composables/useHistory.js";

const canvasAreaRef = ref(null);
const currentTool = ref("move");
const hasImage = ref(false);
const isProcessing = ref(false);
const zoom = ref(1);
const showExport = ref(false);

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

const { push, undo, redo, clear, canUndo, canRedo } = useHistory(24);

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
    resizeWidth.value = snap.width;
    resizeHeight.value = snap.height;
  }
}

async function performRedo() {
  const snap = redo();
  if (snap) {
    await canvasAreaRef.value?.restoreSnapshot(snap);
    resizeWidth.value = snap.width;
    resizeHeight.value = snap.height;
  }
}

function loadFile(file) {
  canvasAreaRef.value?.loadFile(file);
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
  currentTool.value = "move";
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
    setTool,
    performUndo,
    performRedo,
    loadFile,
    applyCrop,
    cancelCrop,
    applyBgRemove,
    applyResize,
    colorBrightness,
    colorContrast,
    colorTemperature,
    colorSaturation,
    applyColor,
    cancelColor,
    resetColorSliders,
    setZoom,
    openExport: () => {
      showExport.value = true;
    },
  }),
);
</script>

<template>
  <div class="app" @keydown="onKeyDown" tabindex="-1">
    <TopBar />
    <div class="app-body">
      <Sidebar />
      <CanvasArea
        ref="canvasAreaRef"
        @image-loaded="onImageLoaded"
        @action-complete="onActionComplete"
        @processing="isProcessing = $event"
      />
      <Transition name="slide-right">
        <RightPanel v-if="hasImage" />
      </Transition>
    </div>
    <footer class="statusbar">
      <span>© Max Bokhan, 2026</span>
    </footer>
    <Transition name="fade">
      <ExportModal
        v-if="showExport"
        @close="showExport = false"
        @export="exportImage"
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
