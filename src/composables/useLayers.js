import { ref, computed } from "vue";

let _uid = 1;

function makeLayer(canvas, name, id, visible, locked) {
  return {
    id: id ?? _uid++,
    name,
    visible: visible ?? true,
    locked: locked ?? false,
    canvas,
    version: 0,
  };
}

export function useLayers() {
  const layers = ref([]);
  const activeId = ref(null);

  const activeLayer = computed(
    () => layers.value.find((l) => l.id === activeId.value) ?? null,
  );

  // Create a layer from an existing HTMLImageElement
  function addFromImage(img, name) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0);
    const layer = makeLayer(c, name);
    layers.value.push(layer);
    activeId.value = layer.id;
    return layer;
  }

  // Add a new transparent layer with the same dimensions as layer[0]
  function addEmpty(name) {
    const base = layers.value[0];
    const w = base?.canvas.width ?? 800;
    const h = base?.canvas.height ?? 600;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const layer = makeLayer(c, name);
    layers.value.push(layer);
    activeId.value = layer.id;
    return layer;
  }

  function removeLayer(id) {
    if (layers.value.length <= 1) return;
    const idx = layers.value.findIndex((l) => l.id === id);
    if (idx === -1) return;
    layers.value.splice(idx, 1);
    if (activeId.value === id) {
      activeId.value = layers.value[Math.min(idx, layers.value.length - 1)].id;
    }
  }

  // Move layer up in render stack (index + 1 = rendered on top)
  function moveUp(id) {
    const arr = [...layers.value];
    const idx = arr.findIndex((l) => l.id === id);
    if (idx >= arr.length - 1) return;
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    layers.value = arr;
  }

  // Move layer down in render stack
  function moveDown(id) {
    const arr = [...layers.value];
    const idx = arr.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
    layers.value = arr;
  }

  function setActive(id) {
    activeId.value = id;
  }

  function toggleVisible(id) {
    const l = layers.value.find((l) => l.id === id);
    if (l) l.visible = !l.visible;
  }

  function toggleLock(id) {
    const l = layers.value.find((l) => l.id === id);
    if (l) l.locked = !l.locked;
  }

  function renameLayer(id, name) {
    const l = layers.value.find((l) => l.id === id);
    if (l && name.trim()) l.name = name.trim();
  }

  // Increment version counter so LayersPanel thumbnails react to pixel changes
  function bumpVersion(id) {
    const l = layers.value.find((l) => l.id === id);
    if (l) l.version++;
  }

  function clearAll() {
    layers.value = [];
    activeId.value = null;
  }

  // Serialize all layers to Blobs for history
  async function getSnapshot() {
    const snaps = await Promise.all(
      layers.value.map(
        (l) =>
          new Promise((resolve) => {
            l.canvas.toBlob((blob) => {
              resolve({
                id: l.id,
                name: l.name,
                visible: l.visible,
                locked: l.locked,
                blob,
                w: l.canvas.width,
                h: l.canvas.height,
              });
            }, "image/png");
          }),
      ),
    );
    return { layerSnaps: snaps, activeId: activeId.value };
  }

  // Restore layers from a history snapshot
  async function restoreSnapshot(snap) {
    if (!snap?.layerSnaps) return;
    const restored = await Promise.all(
      snap.layerSnaps.map(
        (s) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(s.blob);
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas");
              c.width = s.w;
              c.height = s.h;
              c.getContext("2d", { willReadFrequently: true }).drawImage(
                img,
                0,
                0,
              );
              URL.revokeObjectURL(url);
              resolve(makeLayer(c, s.name, s.id, s.visible, s.locked));
            };
            img.src = url;
          }),
      ),
    );
    layers.value = restored;
    activeId.value = snap.activeId;
  }

  return {
    layers,
    activeId,
    activeLayer,
    addFromImage,
    addEmpty,
    removeLayer,
    moveUp,
    moveDown,
    setActive,
    toggleVisible,
    toggleLock,
    renameLayer,
    bumpVersion,
    clearAll,
    getSnapshot,
    restoreSnapshot,
  };
}
