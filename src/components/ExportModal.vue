<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'export'])

const format = ref('png')
const quality = ref(90)

function doExport() {
  emit('export', { format: format.value, quality: quality.value })
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click="onBackdropClick">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Экспорт изображения">
      <div class="modal-header">
        <h2 class="modal-title">Экспорт изображения</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <div class="field-label">Формат</div>
          <div class="format-btns">
            <button
              class="format-btn"
              :class="{ active: format === 'png' }"
              @click="format = 'png'"
            >
              <span class="format-icon">🖼</span>
              <span class="format-name">PNG</span>
              <span class="format-desc">Без потерь, поддержка прозрачности</span>
            </button>
            <button
              class="format-btn"
              :class="{ active: format === 'jpg' }"
              @click="format = 'jpg'"
            >
              <span class="format-icon">📷</span>
              <span class="format-name">JPG</span>
              <span class="format-desc">Меньше размер, для фото</span>
            </button>
          </div>
        </div>

        <Transition name="fade">
          <div v-if="format === 'jpg'" class="field-group">
            <div class="field-label">
              Качество
              <span class="quality-val">{{ quality }}%</span>
            </div>
            <input
              type="range"
              class="slider"
              min="10"
              max="100"
              step="5"
              v-model.number="quality"
            />
            <div class="quality-hints">
              <span>Низкое</span>
              <span>Высокое</span>
            </div>
          </div>
        </Transition>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Отмена</button>
        <button class="btn-primary" @click="doExport">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Скачать {{ format.toUpperCase() }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 30, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 360px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-xs);
  color: var(--text-tertiary);
  transition: background 0.12s, color 0.12s;
}
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {}
.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}
.quality-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: none;
  letter-spacing: 0;
}

/* Format buttons */
.format-btns {
  display: flex;
  gap: 8px;
}
.format-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--bg-elevated);
  text-align: left;
  transition: all 0.12s;
}
.format-btn:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.format-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
.format-icon { font-size: 20px; line-height: 1; margin-bottom: 2px; }
.format-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.format-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }

/* Slider */
.slider {
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
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 1px 4px rgba(78,124,246,0.45);
  cursor: pointer;
  transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.15); }

.quality-hints {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}
.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-weight: 600;
  font-size: 13px;
  transition: background 0.12s;
}
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-strong);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
  transition: background 0.12s;
}
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>
