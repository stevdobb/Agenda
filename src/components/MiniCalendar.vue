<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  selectedDate: Date
  events?: any[]
}>()

const emit = defineEmits<{
  (e: 'select', date: Date): void
}>()

const viewDate = ref(new Date(props.selectedDate))

watch(() => props.selectedDate, (d) => {
  viewDate.value = new Date(d)
})

const currentMonthYear = computed(() =>
  viewDate.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
)

function navigateMonth(dir: 'prev' | 'next') {
  const d = new Date(viewDate.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1))
  viewDate.value = d
}

const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
  return days
})

function isToday(d: Date) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function isSelected(d: Date) {
  const s = props.selectedDate
  return d.getFullYear() === s.getFullYear() && d.getMonth() === s.getMonth() && d.getDate() === s.getDate()
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const eventDateKeys = computed(() => {
  if (!props.events?.length) return new Set<string>()
  const keys = new Set<string>()
  for (const e of props.events) {
    const key = e.start.date || (e.start.dateTime ? e.start.dateTime.split('T')[0] : null)
    if (key) keys.add(key)
  }
  return keys
})

function hasEvents(d: Date) {
  return eventDateKeys.value.has(toDateKey(d))
}
</script>

<template>
  <div class="mini-calendar inline-block rounded-md border p-2">
    <div class="mb-1.5 flex items-center justify-between gap-2">
      <button @click="navigateMonth('prev')" class="mini-nav-btn rounded p-0.5 transition">
        <ChevronLeftIcon class="h-3.5 w-3.5" />
      </button>
      <span class="text-xs font-semibold text-card-foreground">{{ currentMonthYear }}</span>
      <button @click="navigateMonth('next')" class="mini-nav-btn rounded p-0.5 transition">
        <ChevronRightIcon class="h-3.5 w-3.5" />
      </button>
    </div>
    <div class="grid grid-cols-7">
      <div
        v-for="(h, hi) in ['Z','M','D','W','D','V','Z']"
        :key="hi"
        class="flex h-6 w-6 items-center justify-center text-[10px] font-bold text-muted-foreground"
      >{{ h }}</div>
      <template v-for="(day, i) in calendarDays" :key="i">
        <div
          v-if="day"
          :class="[
            'mini-cal-day relative flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[11px] transition',
            isToday(day) && !isSelected(day) ? 'mini-cal-today' : '',
            isSelected(day) ? 'mini-cal-selected' : 'hover:bg-secondary/50',
          ]"
          @click="emit('select', day)"
        >
          {{ day.getDate() }}
          <span
            v-if="hasEvents(day) && !isSelected(day)"
            class="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-primary/70"
          ></span>
        </div>
        <div v-else class="h-6 w-6"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mini-calendar {
  border-color: hsl(var(--border) / 0.7);
  background-color: hsl(220 25% 14%);
  color: hsl(210 20% 88%);
}

.mini-nav-btn {
  color: hsl(210 20% 65%);
}

.mini-nav-btn:hover {
  background-color: hsl(var(--secondary) / 0.5);
  color: hsl(210 20% 95%);
}

.mini-cal-today {
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
  font-weight: 700;
}

.mini-cal-selected {
  background-color: hsl(var(--primary));
  color: #ffffff;
  font-weight: 700;
}

.mini-calendar .text-muted-foreground {
  color: hsl(210 15% 55%);
}

.mini-cal-day {
  color: hsl(210 20% 88%);
}
</style>
