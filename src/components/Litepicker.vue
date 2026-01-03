<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Litepicker from 'litepicker'
import 'litepicker/dist/css/litepicker.css'
// Zorg dat je 'npm install litepicker' hebt uitgevoerd

const props = defineProps<{
  modelValue?: string
  options?: any
}>()

const emit = defineEmits(['update:modelValue'])

const inputRef = ref<HTMLInputElement | null>(null)
let picker: any = null

const defaultDelimiter = ' - '

function setPickerValue(value?: string) {
  if (!picker) return

  if (!value) {
    picker.clearSelection()
    return
  }

  const delimiter = props.options?.delimiter ?? defaultDelimiter
  const isRangeMode = props.options?.singleMode === false

  if (isRangeMode && value.includes(delimiter)) {
    const [start, end] = value.split(delimiter).map((part) => part.trim())
    if (start && end) {
      picker.setDateRange(start, end)
      return
    }
  }

  picker.setDate(value)
}

onMounted(() => {
  if (inputRef.value) {
    picker = new Litepicker({
      element: inputRef.value,
      ...props.options,
      setup: (picker: any) => {
        picker.on('show', () => {
          if (!picker.getStartDate() && !picker.getEndDate()) {
            picker.gotoDate(new Date())
          }
        })
        picker.on('selected', () => {
          emit('update:modelValue', inputRef.value?.value)
        })
      }
    })
    
    if (props.modelValue) {
      setPickerValue(props.modelValue)
    }
  }
})

watch(() => props.modelValue, (newVal) => {
  const currentValue = inputRef.value?.value ?? ''
  if (picker && newVal !== currentValue) {
    setPickerValue(newVal)
  }
})

onUnmounted(() => {
  if (picker) picker.destroy()
})
</script>

<template>
  <input ref="inputRef" type="text" :value="modelValue" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" autocomplete="off" />
</template>
