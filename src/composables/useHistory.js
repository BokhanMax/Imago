import { ref, computed } from 'vue'

export function useHistory(maxSteps = 20) {
  const stack = ref([])
  const index = ref(-1)

  function push(snapshot) {
    // Trim forward history
    stack.value = stack.value.slice(0, index.value + 1)
    stack.value.push(snapshot)
    if (stack.value.length > maxSteps) {
      stack.value.shift()
    } else {
      index.value++
    }
  }

  function undo() {
    if (index.value > 0) {
      index.value--
      return stack.value[index.value]
    }
    return null
  }

  function redo() {
    if (index.value < stack.value.length - 1) {
      index.value++
      return stack.value[index.value]
    }
    return null
  }

  function clear() {
    stack.value = []
    index.value = -1
  }

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < stack.value.length - 1)

  return { push, undo, redo, clear, canUndo, canRedo }
}
