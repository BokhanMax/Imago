<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const emit = defineEmits(["close", "create"]);

const width = ref(1920);
const height = ref(1080);
const background = ref("white");

const INTERNET_PRESETS = [
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1200 × 630", w: 1200, h: 630 },
  { label: "1080 × 1080", w: 1080, h: 1080 },
  { label: "300 × 300", w: 300, h: 300 },
  { label: "1080 × 1920", w: 1080, h: 1920 },
];

const PRINT_PRESETS = [
  { label: "A4 — 2480 × 3508", w: 2480, h: 3508 },
  { label: "A5 — 1748 × 2480", w: 1748, h: 2480 },
  { label: "A6 — 1240 × 1748", w: 1240, h: 1748 },
  { label: "10×15 cm — 1181 × 1772", w: 1181, h: 1772 },
  { label: "9×5 cm — 1110 × 638", w: 1110, h: 638 },
  { label: "Euro Flyer — 1157 × 2480", w: 1157, h: 2480 },
];

function selectPreset(preset) {
  width.value = preset.w;
  height.value = preset.h;
}

function isActive(preset) {
  return width.value === preset.w && height.value === preset.h;
}

function doCreate() {
  const w = Math.max(1, Math.min(8000, parseInt(width.value) || 1920));
  const h = Math.max(1, Math.min(8000, parseInt(height.value) || 1080));
  emit("create", { width: w, height: h, background: background.value });
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) emit("close");
}
</script>

<template>
  <div class="modal-backdrop" @click="onBackdropClick">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="t('create.title')">
      <div class="modal-header">
        <h2 class="modal-title">{{ t("create.title") }}</h2>
        <button class="close-btn" @click="$emit('close')" :aria-label="t('create.cancel')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">

        <!-- Size inputs -->
        <div class="size-row">
          <div class="size-field">
            <label class="field-label">{{ t("create.width") }}</label>
            <div class="input-px">
              <input type="number" class="size-input" v-model.number="width" min="1" max="8000" />
              <span class="px-unit">{{ t("create.px") }}</span>
            </div>
          </div>
          <div class="size-sep">×</div>
          <div class="size-field">
            <label class="field-label">{{ t("create.height") }}</label>
            <div class="input-px">
              <input type="number" class="size-input" v-model.number="height" min="1" max="8000" />
              <span class="px-unit">{{ t("create.px") }}</span>
            </div>
          </div>
        </div>

        <!-- Background -->
        <div class="field-group">
          <div class="field-label">{{ t("create.background") }}</div>
          <div class="bg-row">
            <button
              class="bg-btn"
              :class="{ active: background === 'white' }"
              @click="background = 'white'"
            >
              <span class="bg-swatch white" />
              {{ t("create.bgWhite") }}
            </button>
            <button
              class="bg-btn"
              :class="{ active: background === 'transparent' }"
              @click="background = 'transparent'"
            >
              <span class="bg-swatch transparent" />
              {{ t("create.bgTransparent") }}
            </button>
          </div>
        </div>

        <!-- Internet presets -->
        <div class="field-group">
          <div class="field-label">{{ t("create.groupInternet") }}</div>
          <div class="preset-list">
            <button
              v-for="p in INTERNET_PRESETS"
              :key="p.label"
              class="preset-btn"
              :class="{ active: isActive(p) }"
              @click="selectPreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Print presets -->
        <div class="field-group">
          <div class="field-label">{{ t("create.groupPrint") }}</div>
          <div class="preset-list">
            <button
              v-for="p in PRINT_PRESETS"
              :key="p.label"
              class="preset-btn"
              :class="{ active: isActive(p) }"
              @click="selectPreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">{{ t("create.cancel") }}</button>
        <button class="btn-primary" @click="doCreate">{{ t("create.create") }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  width: 380px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  transition: background 0.12s, color 0.12s;
}
.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

/* ── Size row ── */
.size-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.size-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.size-sep {
  padding-bottom: 7px;
  font-size: 16px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.input-px {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  padding: 0 8px;
}
.size-input {
  flex: 1;
  width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  padding: 6px 0;
  text-align: right;
}
.size-input:focus {
  outline: none;
}
.px-unit {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* ── Field group ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

/* ── Background selector ── */
.bg-row {
  display: flex;
  gap: 8px;
}
.bg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.bg-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
.bg-btn.active {
  border-color: var(--accent);
  color: var(--text-primary);
}

.bg-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.bg-swatch.white {
  background: #ffffff;
}
.bg-swatch.transparent {
  background-image: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%);
  background-size: 8px 8px;
}

/* ── Presets ── */
.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.preset-btn {
  padding: 5px 10px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.preset-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
.preset-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* ── Action buttons ── */
.btn-primary {
  padding: 7px 18px;
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-xs);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.12s;
}
.btn-primary:hover {
  opacity: 0.85;
}
.btn-secondary {
  padding: 7px 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
</style>
