
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCalendarStore, type EventType, type CalendarEvent } from '@/stores/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const store = useCalendarStore()

const props = defineProps<{
  initialEvent?: CalendarEvent | null
}>()

const emit = defineEmits(['saveEvent', 'cancelEdit'])

const startDate = ref('')
const endDate = ref('')
const selectedType = ref('')
const customTypeName = ref('')
const customTypeColor = ref('#000000')
const isCreatingCustomType = ref(false)

// Watch initialEvent to populate form fields
watch(() => props.initialEvent, (newEvent) => {
  if (newEvent) {
    startDate.value = newEvent.startDate
    endDate.value = newEvent.endDate
    selectedType.value = newEvent.type
    // Reset custom type fields
    isCreatingCustomType.value = false
    customTypeName.value = ''
    customTypeColor.value = '#000000'
  } else {
    // Reset form for new event
    startDate.value = ''
    endDate.value = ''
    selectedType.value = store.eventTypes[0]?.name || ''
    isCreatingCustomType.value = false
    customTypeName.value = ''
    customTypeColor.value = '#000000'
  }
}, { immediate: true })

function saveEvent() {
  if (!startDate.value || !endDate.value || !selectedType.value) {
    alert('Please fill in all fields.')
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
      alert('Selected event type not found.')
      return
  }

  const eventData: Omit<CalendarEvent, 'id'> = {
    startDate: startDate.value,
    endDate: endDate.value,
    type: eventType.name,
    color: eventType.color,
  }

  if (props.initialEvent) {
    // Update existing event
    emit('saveEvent', { ...eventData, id: props.initialEvent.id })
  } else {
    // Create new event
    emit('saveEvent', eventData)
  }

  // Reset fields after save/update
  startDate.value = ''
  endDate.value = ''
  selectedType.value = store.eventTypes[0]?.name || ''
}



</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Add/Edit Event</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="start-date">Start Date</Label>
          <Input type="date" id="start-date" v-model="startDate" />
        </div>
        <div class="space-y-2">
          <Label for="end-date">End Date</Label>
          <Input type="date" id="end-date" v-model="endDate" />
        </div>
        <div class="md:col-span-2 space-y-2">
          <Label for="event-type">Event Type</Label>
          <select id="event-type" v-model="selectedType" @change="isCreatingCustomType = selectedType === 'custom'" class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option v-for="type in store.eventTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
            <option value="custom">-- Create Custom Type --</option>
          </select>
        </div>
         <div v-if="isCreatingCustomType" class="md:col-span-2 grid grid-cols-1 gap-4">
          <div class="space-y-2">
              <Label for="custom-type-name">Custom Type Name</Label>
              <Input type="text" id="custom-type-name" v-model="customTypeName" />
          </div>
          <div class="space-y-2">
              <Label for="custom-type-color">Custom Type Color</Label>
              <Input type="color" id="custom-type-color" v-model="customTypeColor" class="w-full h-10" />
          </div>
         </div>
      </div>
    </CardContent>
    <CardFooter class="flex justify-end gap-2">
        <Button v-if="props.initialEvent" variant="outline" @click="emit('cancelEdit')">Cancel</Button>
        <Button @click="saveEvent">{{ props.initialEvent ? 'Update Event' : 'Save Event' }}</Button>
    </CardFooter>
  </Card>
</template>

