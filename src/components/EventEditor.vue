
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCalendarStore, type EventType, type CalendarEvent } from '@/stores/calendar'
import { useUiStore } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Litepicker from '@/components/Litepicker.vue'

const store = useCalendarStore()
const uiStore = useUiStore()

// No longer need props.initialEvent, will directly use store.selectedEvent
// const props = defineProps<{
//   initialEvent?: CalendarEvent | null
// }>()

// No longer emitting events, interacting directly with the store
// const emit = defineEmits(['saveEvent', 'cancelEdit'])

const startDate = ref('')
const endDate = ref('')
const dateRange = ref('')
const selectedType = ref('')
const customTypeName = ref('')
const customName = ref('')
const customTypeColor = ref('#000000')
const isCreatingCustomType = ref(false)
const dateRangeDelimiter = ' - '
const litepickerOptions = {
  singleMode: false,
  autoApply: true,
  format: 'YYYY-MM-DD',
  delimiter: dateRangeDelimiter,
  lang: 'nl-NL',
}

const selectedTypeColor = computed<string>({
  get() {
    const type = store.eventTypes.find((eventType) => eventType.name === selectedType.value)
    return type?.color ?? '#000000'
  },
  set(newColor) {
    if (!selectedType.value || selectedType.value === 'custom') {
      return
    }
    store.updateEventTypeColor(selectedType.value, newColor)
  },
})

function formatDateRange(start: string, end: string) {
  if (!start && !end) return ''
  if (!end) return start
  if (!start) return end
  return `${start}${dateRangeDelimiter}${end}`
}

function parseDateRange(range: string) {
  const trimmed = range.trim()
  if (!trimmed) {
    return { start: '', end: '' }
  }

  if (!trimmed.includes(dateRangeDelimiter)) {
    return { start: trimmed, end: trimmed }
  }

  const [start, end] = trimmed.split(dateRangeDelimiter).map((part) => part.trim())
  return { start: start || '', end: end || start || '' }
}

// Watch store.selectedEvent to populate form fields
watch(() => store.selectedEvent, (newEvent) => {
  if (newEvent) {
    startDate.value = newEvent.startDate || '';
    endDate.value = newEvent.endDate || '';
    dateRange.value = formatDateRange(startDate.value, endDate.value)
    selectedType.value = newEvent.type
    customName.value = newEvent.customName || ''
    // Reset custom type fields
    isCreatingCustomType.value = false
    customTypeName.value = ''
    customTypeColor.value = '#000000'
  } else {
    // Reset form for new event
    startDate.value = ''
    endDate.value = ''
    dateRange.value = ''
    selectedType.value = store.eventTypes[0]?.name || '' // Select the first available type or empty
    customName.value = ''
    isCreatingCustomType.value = false
    customTypeName.value = ''
    customTypeColor.value = '#000000'
  }
}, { immediate: true })

watch(dateRange, (newRange) => {
  const { start, end } = parseDateRange(newRange)
  startDate.value = start
  endDate.value = end
})

function saveEvent() {
  if (!startDate.value || !endDate.value || !selectedType.value) {
    uiStore.showAlert('Validatiefout', 'Vul alstublieft alle velden in.')
    return
  }

  let eventType = store.eventTypes.find(t => t.name === selectedType.value)

  if (isCreatingCustomType.value && customTypeName.value) {
     const newType: EventType = {
      name: customTypeName.value,
      color: customTypeColor.value,
    }
    store.addEventType(newType)
    eventType = newType
    
    customTypeName.value = ''
    customTypeColor.value = '#000000'
    isCreatingCustomType.value = false
    selectedType.value = newType.name;
  }
  
  if (!eventType) {
    uiStore.showAlert('Fout', 'Geselecteerd evenemententype niet gevonden.')
    return
  }

  const eventData: Omit<CalendarEvent, 'id'> = {
    startDate: startDate.value,
    endDate: endDate.value,
    type: eventType.name,
    color: eventType.color,
    customName: customName.value
  }

  if (store.selectedEvent) {
    // Update existing event
    store.updateEvent({ ...eventData, id: store.selectedEvent.id })
  } else {
    // Create new event
    store.addEvent(eventData)
  }

  // Clear selected event after save/update
  store.selectedEvent = null
}



</script>

<template>
  <Card class="editor-card">
    <CardHeader>
      <CardTitle>Evenement Toevoegen/Bewerken</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2 space-y-2">
          <Label for="date-range">Datumbereik</Label>
          <Litepicker
            id="date-range"
            v-model="dateRange"
            :options="litepickerOptions"
            placeholder="Selecteer een datumbereik"
          />
        </div>
        <div class="md:col-span-2 space-y-2">
          <Label for="event-type">Type Evenement</Label>
          <select id="event-type" v-model="selectedType" @change="isCreatingCustomType = selectedType === 'custom'" class="editor-select flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option v-for="type in store.eventTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
            <option value="custom">-- Maak een Aangepast Type --</option>
          </select>
        </div>
        <div class="md:col-span-2 space-y-2">
          <Label for="custom-name">Naam van je agenda item</Label>
          <Input id="custom-name" type="text" v-model="customName" placeholder="Voer een aangepaste naam in (optioneel)" />
        </div>
        <div v-if="selectedType && selectedType !== 'custom'" class="md:col-span-2 space-y-2">
          <Label for="event-type-color">Kleur Evenemententype</Label>
          <Input type="color" id="event-type-color" v-model="selectedTypeColor" class="w-full h-10" />
        </div>
         <div v-if="isCreatingCustomType" class="md:col-span-2 grid grid-cols-1 gap-4">
          <div class="space-y-2">
              <Label for="custom-type-name">Naam Aangepast Type</Label>
              <Input type="text" id="custom-type-name" v-model="customTypeName" />
          </div>
          <div class="space-y-2">
              <Label for="custom-type-color">Kleur Aangepast Type</Label>
              <Input type="color" id="custom-type-color" v-model="customTypeColor" class="w-full h-10" />
          </div>
         </div>
      </div>
    </CardContent>
    <CardFooter class="flex justify-end gap-2">
        <Button v-if="store.selectedEvent" variant="outline" @click="store.selectedEvent = null">Annuleren</Button>
        <Button @click="saveEvent">{{ store.selectedEvent ? 'Evenement Bijwerken' : 'Evenement Opslaan' }}</Button>
    </CardFooter>
  </Card>
</template>

<style scoped>
.editor-card {
  background-color: hsl(var(--card) / 0.9);
  border-color: hsl(var(--border) / 0.65);
  box-shadow: 0 14px 28px hsl(218 56% 20% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.14);
}

.editor-select {
  color: hsl(var(--foreground));
}

@media print {
  .editor-card {
    background: #fff;
    border-color: hsl(20 5.9% 90%);
    box-shadow: none;
  }
}
</style>
