<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import YearView from '@/components/YearView.vue'
import EventEditor from '@/components/EventEditor.vue'
import PrintLegend from '@/components/PrintLegend.vue'
import EventList from '@/components/EventList.vue' // Import the new component
import ConfirmModal from '@/components/ConfirmModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TopMenu from '@/components/TopMenu.vue'
import { FilePlus, FileText, CalendarPlus, Calendar, RotateCcw, Printer } from 'lucide-vue-next'
// import { DatePickerRange } from '@/components/ui/datepickerrange' // Import DatePickerRange
import { useCalendarStore } from '@/stores/calendar'
import { useUiStore } from '@/stores/ui'
import { parseIcsContent, exportIcsContent, type ParsedIcsEvent } from '@/services/icsService' // New: Import ICS service

// import type { DateRange } from 'radix-vue' // Import DateRange type

const router = useRouter()
const store = useCalendarStore()
const uiStore = useUiStore()
const importFile = ref<HTMLInputElement | null>(null)
const importIcsFile = ref<HTMLInputElement | null>(null) // New: For ICS file import
const showConfirmModal = ref(false)
const showSettingsModal = ref(false)
const eventEditorRef = ref<HTMLElement | null>(null)

function printView() {
  window.print()
}

function exportData() {
  const now = new Date()
  const pad = (value: number) => value.toString().padStart(2, '0')
  const dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timeStamp = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const data = {
    events: store.events,
    eventTypes: store.eventTypes,
  }
  const dataStr = JSON.stringify(data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calendar-data-${dateStamp}-${timeStamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportIcs() {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStamp = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const icsString = exportIcsContent(store.events);
  const blob = new Blob([icsString], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calendar-export-${dateStamp}-${timeStamp}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport() {
    importFile.value?.click()
}

function triggerIcsImport() { // New: Trigger for ICS import
  importIcsFile.value?.click()
}

function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (data.events && data.eventTypes) {
        store.setData({ newEvents: data.events, newTypes: data.eventTypes })
        uiStore.showAlert('Data Import', 'Data geïmporteerd!')
      } else {
        uiStore.showAlert('Import Error', 'Ongeldig bestandsformaat.')
      }
    } catch (error) {
      uiStore.showAlert('Import Error', 'Fout bij het lezen van het bestand.')
      console.error(error)
    }
  }
  reader.readAsText(file)
}

async function importIcsData(event: Event) { // New: Handle ICS file import
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const icsContent = e.target?.result as string
      
      const parsedEvents = parseIcsContent(icsContent)

      // Ensure a default event type for ICS events exists
      const icsEventType = store.eventTypes.find(t => t.name === 'ICS Event')
      if (!icsEventType) {
        store.addEventType({ name: 'ICS Event', color: '#888888' }) // Add a default grey color
      }
      // Re-find to ensure it's available after potential addition
      const finalIcsEventType = store.eventTypes.find(t => t.name === 'ICS Event')

      if (finalIcsEventType) {
        parsedEvents.forEach((icsEvent: ParsedIcsEvent) => {
            store.addEvent({
                startDate: icsEvent.startDate,
                endDate: icsEvent.endDate,
                type: icsEvent.summary, // Use ICS summary as type for specific naming
                color: finalIcsEventType.color // Use the color of the generic ICS Event type
            })
        })
        uiStore.showAlert('ICS Import', `${parsedEvents.length} events from ICS imported!`)
      } else {
        uiStore.showAlert('ICS Import Error', 'Could not find or create "ICS Event" type.')
      }

      // Clear the file input value to allow re-importing the same file
      if (importIcsFile.value) {
        importIcsFile.value.value = '';
      }

    } catch (error) {
      uiStore.showAlert('ICS Import Error', 'Fout bij het lezen of parsen van het ICS-bestand.')
      console.error(error)
    }
  }
  reader.readAsText(file)
}

function handleRestart() {
    store.clearData()
    showConfirmModal.value = false
}

function handleViewSwitch(view: string) {
  if (view !== 'year') {
    router.push('/agenda')
  }
}

async function scrollToEventEditor() {
  await nextTick()
  eventEditorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="page-container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
    <ConfirmModal 
        v-if="showConfirmModal"
        title="Weet je het zeker?"
        description="Dit zal al je evenementen en types verwijderen. Deze actie kan niet ongedaan gemaakt worden."
        @confirm="handleRestart"
        @cancel="showConfirmModal = false"
    />
    <SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />

    <TopMenu 
      currentView="year" 
      :showSettings="true" 
      :showRefresh="false" 
      @update:view="handleViewSwitch" 
      @openSettings="showSettingsModal = true"
    />

    <div class="no-print grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <div class="lg:col-span-2 flex flex-col gap-8">
        <div ref="eventEditorRef">
          <EventEditor />
        </div>
        <PrintLegend />
      </div>
      <div class="lg:col-span-1 flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Verlofdagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex justify-between py-1">
              <span>Totaal:</span>
              <span class="font-semibold">{{ store.leaveDayStats.total }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Gepland:</span>
              <span class="font-semibold">{{ store.leaveDayStats.planned }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Resterend:</span>
              <span class="font-semibold">{{ store.leaveDayStats.remaining }}</span>
            </div>
            <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
              <p class="font-semibold">Inbegrepen als verlof:</p>
              <ul class="list-disc pl-4">
                <li v-for="type in store.includedLeaveTypes" :key="type.name">{{ type.name }}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gegevensbeheer</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-4">
              <Button @click="triggerImport"><FilePlus class="mr-2 h-4 w-4" /> Import JSON</Button>
              <Button @click="exportData"><FileText class="mr-2 h-4 w-4" /> Export JSON</Button>
            </div>
            <div class="flex flex-wrap gap-4">
              <Button @click="triggerIcsImport" class="bg-green-700 text-primary-foreground hover:bg-green-800"><CalendarPlus class="mr-2 h-4 w-4" /> Import ICS</Button>
              <Button @click="exportIcs" class="bg-green-700 text-primary-foreground hover:bg-green-800"><Calendar class="mr-2 h-4 w-4" /> Export ICS</Button>
            </div>
            <div class="flex flex-wrap gap-4">
              <Button @click="showConfirmModal = true" variant="destructive"><RotateCcw class="mr-2 h-4 w-4" /> Herstarten</Button>
              <Button @click="printView"><Printer class="mr-2 h-4 w-4" /> Afdrukken / PDF</Button>
            </div>
            <input type="file" ref="importFile" @change="importData" class="hidden" accept=".json">
            <input type="file" ref="importIcsFile" @change="importIcsData" class="hidden" accept=".ics">
          </CardContent>
        </Card>
      </div>
    </div>
    <div class="printable-area">
      <h2 class="text-2xl font-bold text-center mb-4 print-only">{{ new Date().getFullYear() }}</h2>
      <YearView />
      <div class="mt-8 print-only print-legend-container">
        <PrintLegend />
      </div>
    </div>
    <!-- New position for EventList -->
    <div class="mt-8 no-print">
      <EventList @editEvent="scrollToEventEditor" />
    </div>
  </div>
</template>


<style>
.print-only {
  display: none;
}

@media print {
  .print-only {
    display: block !important;
  }

  .no-print,
  .page-container > header { /* Hide header explicitly */
    display: none !important;
  }
  
  .printable-area {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    /* Remove position absolute to allow normal flow */
    position: static; 
  }

  body {
    margin: 0;
    padding: 0;
    background-color: #fff; /* Ensure white background */
  }

  /* Ensure background colors are printed */
  .printable-area {
    -webkit-print-color-adjust: exact !important; /* Force background printing for Webkit */
    print-color-adjust: exact !important; /* Force background printing */
  }
}
</style>
