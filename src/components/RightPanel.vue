<script setup>
import { inject, watch, computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const editor = inject("editor");

const tool = computed(() => editor.currentTool);

const aspectOptions = computed(() => [
  { label: t("crop.free"), value: NaN },
  { label: "1 : 1", value: 1 },
  { label: "4 : 3", value: 4 / 3 },
  { label: "3 : 2", value: 3 / 2 },
  { label: "16 : 9", value: 16 / 9 },
]);

function setAspect(val) {
  editor.cropAspect = val;
}

function isActiveAspect(val) {
  const cur = editor.cropAspect;
  if (isNaN(val) && isNaN(cur)) return true;
  return cur === val;
}

// Resize: watch constrain toggle to auto-calc
let origW = 0,
  origH = 0;
watch(tool, (t) => {
  if (t === "resize") {
    origW = editor.resizeWidth;
    origH = editor.resizeHeight;
  }
});

function onWidthChange(e) {
  const w = Math.round(Number(e.target.value));
  if (!w || w < 1) return;
  editor.resizeWidth = w;
  if (editor.resizeConstrain && origW && origH) {
    editor.resizeHeight = Math.round(w * (origH / origW));
  }
}

function onHeightChange(e) {
  const h = Math.round(Number(e.target.value));
  if (!h || h < 1) return;
  editor.resizeHeight = h;
  if (editor.resizeConstrain && origW && origH) {
    editor.resizeWidth = Math.round(h * (origW / origH));
  }
}
</script>

<template>
  <aside class="right-panel">
    <!-- Crop Panel -->
    <template v-if="tool === 'crop'">
      <div class="panel-section">
        <div class="section-title">{{ t("crop.title") }}</div>
        <div class="aspect-grid">
          <button
            v-for="opt in aspectOptions"
            :key="opt.label"
            class="aspect-btn"
            :class="{ active: isActiveAspect(opt.value) }"
            @click="setAspect(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="panel-section">
        <p class="hint-text">{{ t("crop.hint") }}</p>
      </div>
      <div class="panel-actions">
        <button class="btn-secondary" @click="editor.cancelCrop">
          {{ t("crop.cancel") }}
        </button>
        <button class="btn-primary" @click="editor.applyCrop">
          {{ t("crop.apply") }}
        </button>
      </div>
    </template>

    <!-- BG Remove Panel -->
    <template v-else-if="tool === 'bg'">
      <div class="panel-section">
        <div class="section-title">{{ t("bg.title") }}</div>
        <p class="hint-text">{{ t("bg.hint") }}</p>
      </div>
      <div class="panel-actions">
        <button
          class="btn-primary btn-full"
          :disabled="editor.isProcessing"
          @click="editor.applyBgRemove"
        >
          <svg
            v-if="!editor.isProcessing"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"
              stroke="currentColor"
              stroke-width="1.3"
            />
            <path
              d="M4.5 7l1.8 1.8 3.2-3.6"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div v-else class="spinner-sm" />
          {{ editor.isProcessing ? t("bg.processing") : t("bg.remove") }}
        </button>
      </div>
    </template>

    <!-- Resize Panel -->
    <template v-else-if="tool === 'resize'">
      <div class="panel-section">
        <div class="section-title">{{ t("resize.title") }}</div>
        <div class="field-row">
          <label class="field-label">{{ t("resize.width") }}</label>
          <div class="field-input-wrap">
            <input
              type="number"
              class="field-input"
              :value="editor.resizeWidth"
              min="1"
              max="16000"
              @change="onWidthChange"
            />
            <span class="field-unit">px</span>
          </div>
        </div>
        <div class="constrain-row">
          <label class="toggle-label">
            <input
              type="checkbox"
              v-model="editor.resizeConstrain"
              class="toggle-check"
            />
            <span class="toggle-box" />
            <span>{{ t("resize.constrain") }}</span>
          </label>
        </div>
        <div class="field-row">
          <label class="field-label">{{ t("resize.height") }}</label>
          <div class="field-input-wrap">
            <input
              type="number"
              class="field-input"
              :value="editor.resizeHeight"
              min="1"
              max="16000"
              @change="onHeightChange"
            />
            <span class="field-unit">px</span>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn-primary btn-full" @click="editor.applyResize">
          {{ t("resize.apply") }}
        </button>
      </div>
    </template>

    <!-- Spot Panel -->
    <template v-else-if="tool === 'spot'">
      <div class="panel-section">
        <div class="section-title">{{ t("spot.title") }}</div>
        <div class="slider-row">
          <label class="slider-label">{{ t("spot.size") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="4"
              max="80"
              v-model.number="editor.spotSize"
            />
            <span class="slider-value">{{ editor.spotSize }}</span>
          </div>
        </div>
        <div class="slider-row">
          <label class="slider-label">{{ t("spot.strength") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="0.05"
              max="1"
              step="0.05"
              v-model.number="editor.spotStrength"
            />
            <span class="slider-value"
              >{{ Math.round(editor.spotStrength * 100) }}%</span
            >
          </div>
        </div>
        <p class="hint-text" style="margin-top: 4px">
          {{ t("spot.hint") }}
        </p>
      </div>
    </template>

    <!-- Color Panel -->
    <template v-else-if="tool === 'color'">
      <div class="panel-section">
        <div class="section-title">{{ t("color.title") }}</div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.brightness") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorBrightness !== 0 }"
            >
              {{ editor.colorBrightness > 0 ? "+" : ""
              }}{{ editor.colorBrightness }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorBrightness"
          />
          <div class="slider-ends">
            <span>{{ t("color.darker") }}</span
            ><span>{{ t("color.lighter") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.contrast") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorContrast !== 0 }"
            >
              {{ editor.colorContrast > 0 ? "+" : ""
              }}{{ editor.colorContrast }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorContrast"
          />
          <div class="slider-ends">
            <span>{{ t("color.softer") }}</span
            ><span>{{ t("color.sharper") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.whiteBalance") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorTemperature !== 0 }"
            >
              {{ editor.colorTemperature > 0 ? "+" : ""
              }}{{ editor.colorTemperature }}
            </span>
          </div>
          <input
            type="range"
            class="slider slider-temp"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorTemperature"
          />
          <div class="slider-ends">
            <span>{{ t("color.cool") }}</span
            ><span>{{ t("color.warm") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.saturation") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorSaturation !== 0 }"
            >
              {{ editor.colorSaturation > 0 ? "+" : ""
              }}{{ editor.colorSaturation }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorSaturation"
          />
          <div class="slider-ends">
            <span>{{ t("color.grey") }}</span
            ><span>{{ t("color.saturated") }}</span>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn-ghost btn-sm" @click="editor.resetColorSliders">
          {{ t("color.reset") }}
        </button>
        <button class="btn-secondary" @click="editor.cancelColor">
          {{ t("color.cancel") }}
        </button>
        <button class="btn-primary" @click="editor.applyColor">
          {{ t("color.apply") }}
        </button>
      </div>
    </template>

    <!-- Move / default panel -->
    <template v-else>
      <div class="panel-section empty-panel">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="3 2"
            />
            <path
              d="M16 10v6l3.5 3.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <p>{{ t("move.hint") }}</p>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.right-panel {
  width: var(--panel-w);
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Aspect ratio grid */
.aspect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.aspect-btn {
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.12s;
}
.aspect-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
.aspect-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

/* Resize fields */
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.field-label {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 4px 8px;
}
.field-input {
  width: 64px;
  border: none;
  background: transparent;
  text-align: right;
  color: var(--text-primary);
  font-weight: 500;
}
.field-unit {
  font-size: 11px;
  color: var(--text-tertiary);
}

.constrain-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  margin-bottom: 4px;
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-secondary);
  user-select: none;
}
.toggle-check {
  display: none;
}
.toggle-box {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--border-strong);
  position: relative;
  transition: background 0.15s;
  flex-shrink: 0;
}
.toggle-box::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-check:checked ~ .toggle-box {
  background: var(--accent);
}
.toggle-check:checked ~ .toggle-box::after {
  transform: translateX(14px);
}

/* Sliders */
.slider-row {
  margin-bottom: 14px;
}
.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.slider-label {
  display: block;
  font-size: 12.5px;
  color: var(--text-secondary);
}
.slider-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 10.5px;
  color: var(--text-tertiary);
}
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slider {
  flex: 1;
  width: 100%;
  height: 4px;
  appearance: none;
  background: var(--bg-input);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 1px 4px rgba(78, 124, 246, 0.4);
  cursor: pointer;
  transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.slider-temp {
  background: linear-gradient(to right, #a8c8f8, #e0e0e0 50%, #f8c8a0);
}
.slider-value {
  min-width: 32px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  transition: color 0.15s;
}
.slider-value.active {
  color: var(--accent);
  font-weight: 600;
}

/* Actions */
.panel-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  margin-top: auto;
}
.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-weight: 500;
  font-size: 13px;
  transition:
    background 0.12s,
    opacity 0.12s;
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn-full {
  width: 100%;
}

.btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-strong);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
  transition:
    background 0.12s,
    color 0.12s;
}
.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s;
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}

/* Empty state */
.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12.5px;
  padding: 40px 20px;
  border-bottom: none;
}
.empty-icon {
  color: var(--text-tertiary);
}

/* Spinner */
.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
