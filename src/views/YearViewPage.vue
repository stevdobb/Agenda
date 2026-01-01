
<script setup lang="ts">
import { ref, computed } from 'vue'
import YearView from '@/components/YearView.vue'
import EventEditor from '@/components/EventEditor.vue'
import PrintLegend from '@/components/PrintLegend.vue'
import EventList from '@/components/EventList.vue' // Import the new component
import ConfirmModal from '@/components/ConfirmModal.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendarStore } from '@/stores/calendar'

const store = useCalendarStore()
const importFile = ref<HTMLInputElement | null>(null)
const showConfirmModal = ref(false)

function printView() {
  window.print()
}

function exportData() {
  const data = {
    events: store.events,
    eventTypes: store.eventTypes,
  }
  const dataStr = JSON.stringify(data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'calendar-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
    importFile.value?.click()
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
        alert('Data geïmporteerd!')
      } else {
        alert('Ongeldig bestandsformaat.')
      }
    } catch (error) {
      alert('Fout bij het lezen van het bestand.')
      console.error(error)
    }
  }
  reader.readAsText(file)
}

function handleRestart() {
    store.clearData()
    showConfirmModal.value = false
}
</script>

<template>
  <div class="page-container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
    <ConfirmModal 
        v-if="showConfirmModal"
        title="Are you sure?"
        description="This will delete all your custom events and types. This action cannot be undone."
        @confirm="handleRestart"
        @cancel="showConfirmModal = false"
    />

    <header class="text-center my-8 relative no-print">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Natural Agenda</h1>
       <div class="flex justify-center space-x-2 mb-4 mt-5">
        <router-link to="/" class="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">Home</router-link>
      </div>
    </header>
    <div class="no-print grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <div class="lg:col-span-2 flex flex-col gap-8">
        <EventEditor />
        <EventList /> <!-- New EventList component -->
      </div>
      <div class="lg:col-span-1 flex flex-col gap-8">
        <PrintLegend />
        <Card>
          <CardHeader>
            <CardTitle>Leave Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex justify-between py-1">
              <span>Total:</span>
              <span class="font-semibold">{{ store.leaveDayStats.total }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Planned:</span>
              <span class="font-semibold">{{ store.leaveDayStats.planned }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Remaining:</span>
              <span class="font-semibold">{{ store.leaveDayStats.remaining }}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-4">
            <Button @click="exportData">Export</Button>
            <Button @click="triggerImport" variant="outline">Import</Button>
            <Button @click="showConfirmModal = true" variant="destructive">Restart</Button>
            <Button @click="printView">Print Year View</Button>
            <input type="file" ref="importFile" @change="importData" class="hidden" accept=".json">
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
  </div>
</template>

<style>
.print-only {
  display: none;
}

@media print {
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

  /* YearView specific print styles */
  .printable-area .grid {
    grid-template-columns: repeat(4, 1fr) !important; /* 4 months per row */
    gap: 0.25rem !important; /* Smaller gap */
  }
  .printable-area .card { /* Target the Card component in print */
    border: 1px solid #eee !important;
    box-shadow: none !important;
    padding: 0.2rem !important; /* Smaller padding for cards */
  }
  .printable-area .card-header {
    padding: 0.2rem !important;
  }
  .printable-area .card-title {
    font-size: 0.7rem !important; /* Smaller month titles */
  }
  .printable-area .card-content {
    padding: 0.2rem !important;
  }
  .printable-area .grid-cols-7 > div { /* Weekday headers and day cells */
    font-size: 0.55rem !important; /* Smaller text */
    width: 0.9rem !important; /* Smaller cell size */
    height: 0.9rem !important;
    line-height: 0.9rem !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .printable-area .rounded-full {
    border-radius: 0 !important; /* Remove rounded corners for days */
  }

  /* Print Legend specific styles */
  .printable-area .print-legend-container {
    margin-top: 0.5rem !important;
    border: 1px solid #eee !important;
    box-shadow: none !important;
    padding: 0.5rem !important;
  }
  .printable-area .print-legend-container .card-title {
    font-size: 0.8rem !important;
  }
  .printable-area .print-legend-container li {
    font-size: 0.65rem !important;
  }
  .printable-area .print-legend-container .w-5, .printable-area .print-legend-container .h-5 {
    width: 0.7rem !important;
    height: 0.7rem !important;
  }
}
</style>
