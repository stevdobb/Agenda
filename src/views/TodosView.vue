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
    <div class="page-container mx-auto max-w-7xl px-4 pb-4 pt-20 sm:px-6 sm:pb-6 sm:pt-24 lg:px-8 lg:pb-8 lg:pt-24">
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
          <div v-if="todoStore.pendingCompletion" class="mb-4 flex items-center justify-between rounded-md border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-card-foreground">
            <span>
              "{{ todoStore.pendingCompletion.content }}" afgewerkt. Ongedaan maken?
            </span>
            <button
              @click="todoStore.undoPendingCompletion(todoStore.pendingCompletion.id)"
              class="rounded-md border border-amber-400/60 px-2 py-1 text-xs font-semibold transition hover:bg-amber-500/15"
            >
              Undo (10s)
            </button>
          </div>

          <div v-if="visibleTodos.length > 0">
            <ul class="space-y-2">
              <li
                v-for="todo in visibleTodos"
                :key="todo.id"
                class="todo-row flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200"
              >
                <button
                  class="todo-checkbox-btn flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 todo-checkbox-unchecked"
                  @click="todoStore.toggleTodo(todo.id)"
                >
                </button>
                <span class="flex-1 text-sm font-medium text-card-foreground">{{ todo.content }}</span>
                <button @click="todoStore.removeTodo(todo.id)" class="todo-delete-btn flex-shrink-0 rounded-full p-1 transition">
                  <TrashIcon class="h-4 w-4" />
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
                  class="todo-row todo-row-completed flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200"
                >
                  <button
                    class="todo-checkbox-btn flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 todo-checkbox-checked"
                    @click="todoStore.toggleTodo(todo.id)"
                  >
                    <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <span class="flex-1 text-sm font-medium todo-text-done">{{ todo.content }}</span>
                  <button @click="todoStore.removeTodo(todo.id)" class="todo-delete-btn flex-shrink-0 rounded-full p-1 transition">
                    <TrashIcon class="h-4 w-4" />
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

<style scoped>
.agenda-shell-panel {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 30px hsl(218 72% 20% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.18);
}

.agenda-input {
  border-color: hsl(var(--input) / 0.85);
  background-color: hsl(var(--background) / 0.25);
  color: hsl(var(--card-foreground));
}

.agenda-input::placeholder {
  color: hsl(var(--muted-foreground));
}

.agenda-input:focus {
  border-color: hsl(var(--ring));
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3);
}

.agenda-create-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.agenda-create-button:hover {
  filter: brightness(0.95);
}

.todo-row {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--background) / 0.2);
}

.todo-row-completed {
  border-color: hsl(156 63% 42% / 0.5);
  background-color: hsl(156 63% 42% / 0.2);
  color: hsl(var(--muted-foreground));
}

.todo-checkbox-btn {
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid hsl(var(--border));
  background-color: transparent;
  flex-shrink: 0;
}

.todo-checkbox-unchecked {
  border-color: hsl(var(--border));
}

.todo-checkbox-unchecked:hover {
  border-color: hsl(var(--primary) / 0.7);
  background-color: hsl(var(--primary) / 0.08);
}

.todo-checkbox-checked {
  border-color: hsl(156 63% 42%);
  background-color: hsl(156 63% 42%);
  color: #ffffff;
}

.todo-text-done {
  color: hsl(var(--muted-foreground));
  text-decoration: line-through;
  text-decoration-color: hsl(var(--muted-foreground) / 0.5);
}

.todo-delete-btn {
  color: hsl(var(--muted-foreground) / 0.5);
}

.todo-delete-btn:hover {
  color: hsl(var(--destructive));
  background-color: hsl(var(--destructive) / 0.1);
}
</style>
