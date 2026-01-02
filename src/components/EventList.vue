<script setup lang="ts">
import { useCalendarStore, type CalendarEvent } from '@/stores/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrashIcon, PencilIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const store = useCalendarStore()

const emit = defineEmits(['editEvent'])

const groupedEvents = computed(() => {
    const sorted = [...store.events]
        .filter((event) => !store.isEventHidden(event))
        .sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return dateA - dateB;
        });

    const groups = new Map<string, { label: string; events: CalendarEvent[] }>();

    sorted.forEach((event) => {
        const start = new Date(event.startDate);
        const year = start.getFullYear();
        const month = start.getMonth();
        const key = `${year}-${month}`;
        const label = new Date(year, month, 1).toLocaleString('nl-NL', {
            month: 'long',
            year: 'numeric',
        });

        if (!groups.has(key)) {
            groups.set(key, { label, events: [] });
        }
        groups.get(key)?.events.push(event);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
        key,
        label: value.label,
        events: value.events,
    }));
});

function deleteEvent(id: string) {
    if (confirm('Are you sure you want to delete this event?')) {
        store.removeEvent(id)
    }
}

function editEvent(event: CalendarEvent) {
    store.selectedEvent = event
    emit('editEvent')
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
      <div v-if="groupedEvents.length === 0" class="text-center text-muted-foreground">
        No events added yet.
      </div>
      <div class="space-y-4">
        <div v-for="group in groupedEvents" :key="group.key">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {{ group.label }}
          </p>
          <ul class="divide-y">
            <li v-for="event in group.events" :key="event.id" class="flex items-center justify-between gap-3 py-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: event.color }"></span>
                <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                  {{ formatEventDates(event) }}
                </span>
                <p class="font-medium truncate">{{ event.type }}</p>
              </div>
              <div class="flex items-center gap-1">
                <Button variant="outline" size="icon" @click="editEvent(event)">
                  <PencilIcon class="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" @click="deleteEvent(event.id)">
                  <TrashIcon class="h-4 w-4" />
                </Button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
