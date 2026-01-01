
<script setup lang="ts">
import { useCalendarStore, type CalendarEvent } from '@/stores/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrashIcon, PencilIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const store = useCalendarStore()

const emit = defineEmits(['editEvent'])

const sortedEvents = computed(() => {
    return [...store.events].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateA - dateB;
    });
});

function deleteEvent(id: string) {
    if (confirm('Are you sure you want to delete this event?')) {
        store.removeEvent(id)
    }
}

function formatEventDates(event: CalendarEvent): string {
    const start = new Date(event.startDate).toLocaleDateString();
    const end = new Date(event.endDate).toLocaleDateString();
    if (start === end) {
        return start;
    }
    return `${start} - ${end}`;
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>All Events</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="sortedEvents.length === 0" class="text-center text-muted-foreground">
        No events added yet.
      </div>
      <ul class="space-y-3">
        <li v-for="event in sortedEvents" :key="event.id" class="flex items-center justify-between p-3 border rounded-md">
          <div class="flex items-center gap-3">
            <span class="w-4 h-4 rounded-full" :style="{ backgroundColor: event.color }"></span>
            <div>
              <p class="font-medium">{{ event.type }}</p>
              <p class="text-sm text-muted-foreground">{{ formatEventDates(event) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="icon" @click="emit('editEvent', event.id)">
              <PencilIcon class="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" @click="deleteEvent(event.id)">
              <TrashIcon class="h-4 w-4" />
            </Button>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
