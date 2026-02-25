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
    if (confirm('Weet je zeker dat je dit evenement wilt verwijderen?')) {
        store.removeEvent(id)
    }
}

function editEvent(event: CalendarEvent) {
    store.selectedEvent = event
    emit('editEvent')
}

function formatEventDates(event: CalendarEvent): string {
    const start = new Date(event.startDate).toLocaleDateString('nl-NL');
    const end = new Date(event.endDate).toLocaleDateString('nl-NL');
    if (start === end) {
        return start;
    }
    return `${start} - ${end}`;
}
</script>

<template>
  <Card class="event-list-card">
    <CardHeader>
      <CardTitle>Alle Evenementen</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="groupedEvents.length === 0" class="text-center text-muted-foreground">
        Nog geen evenementen toegevoegd.
      </div>
      <div class="space-y-4">
        <div v-for="group in groupedEvents" :key="group.key">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {{ group.label }}
          </p>
          <ul class="space-y-2">
            <li v-for="event in group.events" :key="event.id" class="event-row flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: event.color }"></span>
                <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                  {{ formatEventDates(event) }}
                </span>
                <p class="font-medium truncate">{{ event.customName || event.type }}</p>
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

<style scoped>
.event-list-card {
  border-color: hsl(var(--border) / 0.65);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 28px hsl(218 56% 20% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.14);
}

.event-row {
  border-color: hsl(var(--border) / 0.55);
  background-color: hsl(var(--background) / 0.24);
}

@media print {
  .event-list-card {
    border-color: hsl(20 5.9% 90%);
    background: #fff;
    box-shadow: none;
  }

  .event-row {
    border-color: hsl(20 5.9% 90%);
    background: #fff;
  }
}
</style>
