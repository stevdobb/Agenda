
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { Bars3Icon, XMarkIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/stores/calendar'
import { parseIcsContent } from '@/services/icsService'


const router = useRouter()
const calendarStore = useCalendarStore()

const mobileMenuOpen = ref(false)
const showSettingsModal = ref(false)

const importFile = ref<HTMLInputElement | null>(null)
const importIcsFile = ref<HTMLInputElement | null>(null)

// State for HomeView specific elements that might be moved here
const currentView = ref<'list' | 'week' | 'month'>('list') // Should probably be managed by HomeView

// Props/Emits for actions
const emit = defineEmits(['viewChanged', 'refreshEvents', 'showSettings'])

function navigateAndClose(route: string) {
  router.push(route)
  mobileMenuOpen.value = false
}

// Data Management Functions (moved from YearViewPage.vue and HomeView.vue)
function exportData() {
  const data = {
    events: calendarStore.events,
    eventTypes: calendarStore.eventTypes,
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

function triggerIcsImport() {
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
        calendarStore.setData({ newEvents: data.events, newTypes: data.eventTypes })
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

async function importIcsData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const icsContent = e.target?.result as string
      
      const parsedEvents = parseIcsContent(icsContent)

      const icsEventType = calendarStore.eventTypes.find(t => t.name === 'ICS Event')
      if (!icsEventType) {
        calendarStore.addEventType({ name: 'ICS Event', color: '#888888' })
      }
      const finalIcsEventType = calendarStore.eventTypes.find(t => t.name === 'ICS Event')

      if (finalIcsEventType) {
        parsedEvents.forEach((icsEvent) => {
            calendarStore.addEvent({
                startDate: icsEvent.startDate,
                endDate: icsEvent.endDate,
                type: icsEvent.summary,
                color: finalIcsEventType.color
            })
        })
        alert(`${parsedEvents.length} events from ICS imported!`)
      } else {
          alert('Could not find or create "ICS Event" type.')
      }

      if (importIcsFile.value) {
        importIcsFile.value.value = '';
      }

    } catch (error) {
      alert('Fout bij het lezen of parsen van het ICS-bestand.')
      console.error(error)
    }
  }
  reader.readAsText(file)
}

function printYearView() {
  window.print()
}

function handleRestart() {
  calendarStore.clearData()
  // No need for confirm modal state here, as it's handled by the page where this component is used
}

function manualFetchEvents() {
  emit('refreshEvents') // Emit to parent, as HomeView handles its own fetching
}

function toggleSettingsModal() {
  showSettingsModal.value = !showSettingsModal.value
  emit('showSettings', showSettingsModal.value) // Emit so parent can react
}
</script>

<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm no-print">
    <nav class="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
      <div class="flex lg:flex-1">
        <router-link to="/" class="-m-1.5 p-1.5">
          <span class="sr-only">Natural Agenda</span>
          <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Natural Agenda</h1>
        </router-link>
      </div>
      <div class="flex lg:hidden">
        <button type="button" class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-200" @click="mobileMenuOpen = true">
          <span class="sr-only">Open main menu</span>
          <Bars3Icon class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div class="hidden lg:flex lg:gap-x-12 items-center">
        <router-link to="/" class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Home</router-link>
        <router-link to="/year" class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Year View</router-link>
        
        <!-- View Switcher (Desktop) -->
        <div class="flex space-x-2">
          <Button size="sm" :variant="currentView === 'list' ? 'default' : 'outline'" @click="emit('viewChanged', 'list')">List</Button>
          <Button size="sm" :variant="currentView === 'week' ? 'default' : 'outline'" @click="emit('viewChanged', 'week')">Week</Button>
          <Button size="sm" :variant="currentView === 'month' ? 'default' : 'outline'" @click="emit('viewChanged', 'month')">Month</Button>
        </div>

        <!-- Action Buttons (Desktop) -->
        <div class="flex space-x-2 items-center">
          <Button size="sm" variant="outline" @click="manualFetchEvents">Refresh</Button>
          <Button size="sm" variant="outline" @click="exportData">Export</Button>
          <Button size="sm" variant="outline" @click="triggerImport">Import JSON</Button>
          <Button size="sm" variant="outline" @click="triggerIcsImport">Import ICS</Button>
          <Button size="sm" variant="destructive" @click="handleRestart">Restart</Button>
          <Button size="sm" variant="outline" @click="printYearView">Print Year</Button>
          <button @click="toggleSettingsModal" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <Cog6ToothIcon class="h-6 w-6" />
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile menu, show/hide based on menu open state. -->
    <TransitionRoot as="template" :show="mobileMenuOpen">
      <Dialog as="div" class="lg:hidden" @close="mobileMenuOpen = false">
        <TransitionChild as="template" enter="duration-150 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 z-10 bg-black bg-opacity-25" />
        </TransitionChild>

        <div class="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white dark:bg-gray-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div class="flex items-center justify-between">
            <router-link to="/" class="-m-1.5 p-1.5" @click="mobileMenuOpen = false">
              <span class="sr-only">Natural Agenda</span>
              <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Natural Agenda</h1>
            </router-link>
            <button type="button" class="-m-2.5 rounded-md p-2.5 text-gray-700 dark:text-gray-200" @click="mobileMenuOpen = false">
              <span class="sr-only">Close menu</span>
              <XMarkIcon class="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div class="mt-6 flow-root">
            <div class="-my-6 divide-y divide-gray-500/10">
              <div class="space-y-2 py-6">
                <router-link to="/" class="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800" @click="navigateAndClose('/')">Home</router-link>
                <router-link to="/year" class="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800" @click="navigateAndClose('/year')">Year View</router-link>
                
                <!-- View Switcher (Mobile) -->
                <div class="flex flex-col space-y-2 px-3 py-2">
                  <span class="text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">Views</span>
                  <Button size="sm" :variant="currentView === 'list' ? 'default' : 'outline'" @click="emit('viewChanged', 'list'); mobileMenuOpen = false">List</Button>
                  <Button size="sm" :variant="currentView === 'week' ? 'default' : 'outline'" @click="emit('viewChanged', 'week'); mobileMenuOpen = false">Week</Button>
                  <Button size="sm" :variant="currentView === 'month' ? 'default' : 'outline'" @click="emit('viewChanged', 'month'); mobileMenuOpen = false">Month</Button>
                </div>

                <!-- Action Buttons (Mobile) -->
                <div class="flex flex-col space-y-2 px-3 py-2">
                  <span class="text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">Actions</span>
                  <Button size="sm" variant="outline" @click="manualFetchEvents(); mobileMenuOpen = false">Refresh Events</Button>
                  <Button size="sm" variant="outline" @click="exportData(); mobileMenuOpen = false">Export</Button>
                  <Button size="sm" variant="outline" @click="triggerImport(); mobileMenuOpen = false">Import JSON</Button>
                  <Button size="sm" variant="outline" @click="triggerIcsImport(); mobileMenuOpen = false">Import ICS</Button>
                  <Button size="sm" variant="destructive" @click="handleRestart(); mobileMenuOpen = false">Restart</Button>
                  <Button size="sm" variant="outline" @click="printYearView(); mobileMenuOpen = false">Print Year</Button>
                  <Button size="sm" variant="outline" @click="toggleSettingsModal(); mobileMenuOpen = false">Settings</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Hidden file inputs for data management -->
    <input type="file" ref="importFile" @change="importData" class="hidden" accept=".json">
    <input type="file" ref="importIcsFile" @change="importIcsData" class="hidden" accept=".ics">
  </header>
</template>
