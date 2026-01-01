
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCalendarStore } from '@/stores/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'

const store = useCalendarStore()
const currentYear = ref(new Date().getFullYear())

const months = computed(() => {
  const year = currentYear.value
  const monthNames = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ]
  
  return monthNames.map((name, index) => {
    const monthIndex = index
    const date = new Date(year, monthIndex, 1)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const firstDayOfWeek = (date.getDay() + 6) % 7 // 0=Monday, 6=Sunday

          const days = Array.from({ length: daysInMonth }, (_, i) => {
            const dayDate = new Date(year, monthIndex, i + 1)
            const events = store.getEventsForDate(dayDate)
            // Use the color of the first event for simplicity
            const bgColor = events.length > 0 ? events[0].color : 'transparent'
            return {
              day: i + 1,
              date: dayDate,
              bgColor,
              events // Include the events array
            }
          })
    return {
      name,
      days,
      firstDayOfWeek
    }
  })
})

const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function prevYear() {
  currentYear.value--
}

function nextYear() {
  currentYear.value++
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <Button variant="outline" size="icon" @click="prevYear">
        <ChevronLeftIcon class="h-4 w-4" />
      </Button>
      <h2 class="text-2xl font-bold">{{ currentYear }}</h2>
      <Button variant="outline" size="icon" @click="nextYear">
        <ChevronRightIcon class="h-4 w-4" />
      </Button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <div v-for="type in store.eventTypes" :key="type.name" class="flex items-center space-x-2">
        <input
          type="checkbox"
          :id="`checkbox-${type.name}`"
          :checked="!store.hiddenEventTypes.has(type.name)"
          @change="store.toggleEventTypeVisibility(type.name)"
          class="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
        />
        <label :for="`checkbox-${type.name}`" class="text-sm font-medium text-gray-700">{{ type.name }}</label>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card v-for="month in months" :key="month.name">
        <CardHeader>
          <CardTitle class="text-center text-lg">{{ month.name }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-7 gap-2 text-center text-sm">
            <div v-for="day in weekDays" :key="day" class="font-semibold text-muted-foreground">{{ day }}</div>
            <div v-for="blank in month.firstDayOfWeek" :key="'blank-' + blank"></div>
                                                                                  <div
                                                                                    v-for="day in month.days"
                                                                                    :key="day.day"
                                                                                    class="w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer"
                                                                                    :style="{ backgroundColor: day.bgColor, color: day.bgColor !== 'transparent' ? 'white' : 'inherit' }"
                                                                                    @click="() => {
                                                                                      if (day.events && day.events.length > 0) {
                                                                                        store.selectedEvent = day.events[0];
                                                                                      }
                                                                                    }"
                                                                                  >              {{ day.day }}
                                                                  </div>          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
