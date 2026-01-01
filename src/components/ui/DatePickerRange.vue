<script setup lang="ts">
import { ref, watch } from 'vue'
// import { Calendar } from '@/components/ui/calendar'
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover'

interface DateRange {
  start: Date | undefined
  end: Date | undefined
}

interface DatePickerRangeProps {
  modelValue?: DateRange
  placeholder?: string
}

const props = defineProps<DatePickerRangeProps>()
const emits = defineEmits(['update:modelValue'])

const date = ref<DateRange>(props.modelValue || {
  start: undefined,
  end: undefined,
})

watch(date, (newVal) => {
  emits('update:modelValue', newVal)
}, { deep: true })

// If a modelValue is provided, update the internal date ref
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    date.value = newVal
  }
}, { deep: true })

// const isToday = (date: Date) => isTodayFn(date)
</script>

<!--
<template>
  <div :class="cn('grid gap-2', $attrs.class ?? '')">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          id="date"
          :variant="'outline'"
          :class="cn(
            'w-[300px] justify-start text-left font-normal',
            !date.start && 'text-muted-foreground',
          )"
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          <template v-if="date.start">
            <template v-if="date.end">
              {{ date.start.toLocaleDateString() }} - {{ date.end.toLocaleDateString() }}
            </template>
            <template v-else>
              {{ date.start.toLocaleDateString() }}
            </template>
          </template>
          <template v-else>
            {{ placeholder || 'Pick a date range' }}
          </template>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" :align="'start'">
        <Calendar
          v-model.range="date"
          :columns="2"
          :is-today="isToday"
        />
      </PopoverContent>
    </Popover>
  </div>
</template>
-->
