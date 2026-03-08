<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CheckBadgeIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
import TopMenu from '@/components/TopMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import { requestAccessToken } from '@/services/gsiService'

const router = useRouter()
const authStore = useAuthStore()
const todoStore = useTodoStore()
const todoText = ref('')
const todoInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<'success' | 'error' | null>(null)
const showCompletedTodos = ref(false)

const visibleTodos = computed(() => todoStore.todos.filter((todo) => !todo.completed))
const completedTodos = computed(() => todoStore.todos.filter((todo) => todo.completed))
const completedCount = computed(() => completedTodos.value.length)

function setFeedbackSuccess(message: string) {
  feedbackMessage.value = message
  feedbackTone.value = 'success'
}

function setFeedbackError(message: string) {
  feedbackMessage.value = message
  feedbackTone.value = 'error'
}

async function createTodo() {
  if (!todoText.value.trim() || isSaving.value) {
    return
  }

  isSaving.value = true
  feedbackMessage.value = ''
  feedbackTone.value = null

  const added = await todoStore.addTodo(todoText.value)
  if (added) {
    setFeedbackSuccess('Todo opgeslagen.')
    todoText.value = ''
  } else {
    const details = todoStore.lastError ? ` ${todoStore.lastError}` : ''
    setFeedbackError(`Todo kon niet opgeslagen worden.${details}`)
  }

  isSaving.value = false
}

function handleLogin() {
  requestAccessToken().catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`)
  })
}

function handleViewSwitch(view: string) {
  if (view === 'year') {
    router.push('/year')
    return
  }
  if (view === 'todos') {
    return
  }

  router.push('/agenda')
}

function handleOpenSettings() {
  router.push('/settings')
}

async function focusTodoInput() {
  await nextTick()
  todoInput.value?.focus()
}

onMounted(() => {
  if (authStore.isLoggedIn && authStore.activeAccountId) {
    void todoStore.loadTodos()
  }
  void focusTodoInput()
})

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      void focusTodoInput()
    }
  },
)
</script>

<template>
  <div class="year-weather-theme">
    <div class="page-container mx-auto max-w-7xl px-4 pb-4 pt-28 sm:px-6 sm:pb-6 sm:pt-32 lg:px-8 lg:pb-8 lg:pt-32">
      <TopMenu
        currentView="todos"
        :showSettings="true"
        :showRefresh="false"
        @update:view="handleViewSwitch"
        @openSettings="handleOpenSettings"
      />

      <div class="agenda-shell-panel rounded-lg border p-6 sm:p-7">
        <div v-if="authStore.isLoggedIn">
          <h1 class="mb-4 flex items-center text-2xl font-semibold text-card-foreground">
            <CheckBadgeIcon class="mr-2 h-7 w-7 text-muted-foreground" />
            Todos
          </h1>

          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref="todoInput"
              autofocus
              v-model="todoText"
              @keyup.enter="createTodo"
              type="text"
              placeholder="Nieuwe todo..."
              class="agenda-input flex-grow rounded-md border p-3 transition"
            />
            <button
              @click="createTodo"
              :disabled="isSaving"
              class="agenda-create-button flex items-center justify-center rounded-md px-4 py-3 text-white transition"
              aria-label="Todo toevoegen"
            >
              <PlusIcon class="h-5 w-5" />
            </button>
          </div>

          <p v-if="feedbackMessage" :class="['mb-4 rounded-md border px-3 py-2 text-sm', feedbackTone === 'error' ? 'border-red-400/60 text-red-100' : 'border-emerald-400/60 text-emerald-100']">
            {{ feedbackMessage }}
          </p>

          <div v-if="visibleTodos.length > 0">
            <ul class="space-y-2">
              <li
                v-for="todo in visibleTodos"
                :key="todo.id"
                class="todo-row flex items-center justify-between space-x-3 rounded-md border p-3"
              >
                <div class="flex items-center space-x-3">
                  <input type="checkbox" :checked="todo.completed" @change="todoStore.toggleTodo(todo.id)" class="form-checkbox h-5 w-5 text-blue-600">
                  <span class="font-medium text-card-foreground">{{ todo.content }}</span>
                </div>
                <button @click="todoStore.removeTodo(todo.id)" class="rounded-full p-1 text-muted-foreground transition hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <TrashIcon class="h-5 w-5" />
                </button>
              </li>
            </ul>
          </div>
          <div v-else class="rounded-md border-2 border-dashed border-border/70 p-4 text-center text-muted-foreground">
            Geen open todo's.
          </div>

          <p v-if="completedCount > 0" class="mt-4 text-sm text-muted-foreground">
            {{ completedCount }} afgewerkte todo's.
          </p>

          <div v-if="completedCount > 0" class="mt-4 rounded-md border border-border/70">
            <button
              class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-card-foreground"
              @click="showCompletedTodos = !showCompletedTodos"
            >
              <span>Afgewerkte todo's</span>
              <span class="text-muted-foreground">{{ showCompletedTodos ? 'Verberg' : 'Toon' }}</span>
            </button>

            <div v-if="showCompletedTodos" class="border-t border-border/70 p-3">
              <ul class="space-y-2">
                <li
                  v-for="todo in completedTodos"
                  :key="todo.id"
                  class="todo-row todo-row-completed flex items-center justify-between space-x-3 rounded-md border p-3 line-through"
                >
                  <div class="flex items-center space-x-3">
                    <input type="checkbox" :checked="todo.completed" @change="todoStore.toggleTodo(todo.id)" class="form-checkbox h-5 w-5 text-blue-600">
                    <span class="font-medium text-card-foreground">{{ todo.content }}</span>
                  </div>
                  <button @click="todoStore.removeTodo(todo.id)" class="rounded-full p-1 text-muted-foreground transition hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center">
          <p class="mb-6 text-muted-foreground">
            Log in met je Google account om je todo's te beheren.
          </p>
          <button
            @click="handleLogin"
            class="agenda-create-button mx-auto flex items-center justify-center rounded-md px-6 py-3 text-white transition"
          >
            Login with Google
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
