
<script setup lang="ts">
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = defineProps<{
  startDate: string
  endDate: string
}>()

const emit = defineEmits(['update:startDate', 'update:endDate'])

const dateRange = ref<{ start: Date | undefined, end: Date | undefined }>({
  start: props.startDate ? new Date(props.startDate) : undefined,
  end: props.endDate ? new Date(props.endDate) : undefined,
})

watch(() => props.startDate, (newVal) => {
  dateRange.value.start = newVal ? new Date(newVal) : undefined
})
watch(() => props.endDate, (newVal) => {
  dateRange.value.end = newVal ? new Date(newVal) : undefined
})

const formattedDateRange = computed(() => {
  if (dateRange.value.start && dateRange.value.end) {
    const start = dateRange.value.start.toLocaleDateString('nl-BE')
    const end = dateRange.value.end.toLocaleDateString('nl-BE')
    return `${start} - ${end}`
  }
  if (dateRange.value.start) {
    return dateRange.value.start.toLocaleDateString('nl-BE')
  }
  return ''
})

function updateDates(newDateRange: { start: Date, end: Date }) {
  if (newDateRange.start) {
    emit('update:startDate', newDateRange.start.toISOString().split('T')[0])
  } else {
    emit('update:startDate', '')
  }
  if (newDateRange.end) {
    emit('update:endDate', newDateRange.end.toISOString().split('T')[0])
  } else {
    emit('update:endDate', '')
  }
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !dateRange.start && 'text-muted-foreground',
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ formattedDateRange || 'Selecteer datum' }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar
        v-model.range="dateRange"
        @update:model-value="updateDates"
        :number-of-months="2"
      />
    </PopoverContent>
  </Popover>
</template>