import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';
import { getTasks, createTask, deleteTask, updateTask, type Task } from '@/services/googleTasks';
import { requestAccessToken } from '@/services/gsiService';

interface Todo {
  id: string;
  content: string;
  completed: boolean;
}

interface PendingTodoCompletion {
  id: string;
  content: string;
  expiresAt: number;
}

interface GoogleAccount {
  id: string;
  accessToken: string;
  expiresAt: number;
  user?: {
    email?: string;
  };
}

const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
const AUTH_ERROR_PATTERNS = [
  'insufficient authentication scopes',
  'insufficientpermissions',
  'invalid credentials',
  'unauthenticated',
  'unauthorized',
  'login required',
];

function convertTaskToTodo(task: Task): Todo {
  return {
    id: task.id,
    content: task.title,
    completed: task.status === 'completed',
  };
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([]);
  const lastError = ref('');
  const pendingCompletion = ref<PendingTodoCompletion | null>(null);
  const authStore = useAuthStore();
  let pendingCompletionTimer: ReturnType<typeof setTimeout> | null = null;

  function getActiveAccount(): GoogleAccount | null {
    if (!authStore.activeAccountId) {
      return null;
    }

    return (authStore.accounts as GoogleAccount[]).find((account) => account.id === authStore.activeAccountId) ?? null;
  }

  async function getActiveAccessToken(): Promise<string | null> {
    const activeAccount = getActiveAccount();
    if (!activeAccount) {
      return null;
    }

    if (activeAccount.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
      return activeAccount.accessToken;
    }

    await requestAccessToken({
      prompt: '',
      hint: activeAccount.user?.email,
    });

    const refreshedById = (authStore.accounts as GoogleAccount[]).find(
      (account) => account.id === activeAccount.id && account.expiresAt > Date.now() + 5000,
    );
    if (refreshedById) {
      return refreshedById.accessToken;
    }

    const refreshedByEmail = (authStore.accounts as GoogleAccount[]).find(
      (account) => account.user?.email && account.user.email === activeAccount.user?.email && account.expiresAt > Date.now() + 5000,
    );
    return refreshedByEmail?.accessToken ?? null;
  }

  function isAuthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
  }

  async function withTaskAuthRetry<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    const firstToken = await getActiveAccessToken();
    if (!firstToken) {
      throw new Error('No active Google account/token available.');
    }

    try {
      return await operation(firstToken);
    } catch (error) {
      if (!isAuthError(error)) {
        throw error;
      }

      const activeAccount = getActiveAccount();
      await requestAccessToken({
        prompt: 'consent',
        hint: activeAccount?.user?.email,
      });

      const refreshedToken = await getActiveAccessToken();
      if (!refreshedToken) {
        throw error;
      }

      return operation(refreshedToken);
    }
  }

  async function loadTodos() {
    if (!authStore.isLoggedIn) {
      clearPendingCompletionState();
      todos.value = [];
      return;
    }

    try {
      lastError.value = '';
      const tasks = await withTaskAuthRetry((accessToken) => getTasks(accessToken));
      todos.value = tasks.map(convertTaskToTodo);
    } catch (error) {
      console.error('Failed to load todos:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  }

  async function addTodo(content: string): Promise<boolean> {
    if (!authStore.isLoggedIn) {
      return false;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return false;
    }

    try {
      lastError.value = '';
      const newTask = await withTaskAuthRetry((accessToken) => createTask(accessToken, trimmedContent));
      todos.value.push(convertTaskToTodo(newTask));
      return true;
    } catch (error) {
      console.error('Failed to add todo:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  async function removeTodo(id: string): Promise<boolean> {
    if (!authStore.isLoggedIn) {
      return false;
    }

    try {
      if (pendingCompletion.value?.id === id) {
        clearPendingCompletionState();
      }
      lastError.value = '';
      await withTaskAuthRetry((accessToken) => deleteTask(accessToken, id));
      todos.value = todos.value.filter(todo => todo.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to remove todo:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  function clearPendingCompletionTimer() {
    if (pendingCompletionTimer) {
      clearTimeout(pendingCompletionTimer);
      pendingCompletionTimer = null;
    }
  }

  function clearPendingCompletionState() {
    clearPendingCompletionTimer();
    pendingCompletion.value = null;
  }

  async function finalizePendingCompletion(todoId: string): Promise<boolean> {
    if (!pendingCompletion.value || pendingCompletion.value.id !== todoId) {
      return false;
    }

    const todo = todos.value.find((item) => item.id === todoId);
    if (!todo) {
      clearPendingCompletionState();
      return false;
    }

    try {
      lastError.value = '';
      const updatedTask = await withTaskAuthRetry((accessToken) => updateTask(accessToken, todoId, true));
      todo.completed = updatedTask.status === 'completed';
      clearPendingCompletionState();
      return true;
    } catch (error) {
      console.error('Failed to finalize todo completion:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      todo.completed = false;
      clearPendingCompletionState();
      return false;
    }
  }

  async function queueTodoCompletion(id: string): Promise<boolean> {
    const todo = todos.value.find((item) => item.id === id);
    if (!todo || todo.completed) {
      return false;
    }

    if (pendingCompletion.value && pendingCompletion.value.id !== id) {
      await finalizePendingCompletion(pendingCompletion.value.id);
    }

    todo.completed = true;
    const expiresAt = Date.now() + 10_000;
    pendingCompletion.value = {
      id: todo.id,
      content: todo.content,
      expiresAt,
    };

    clearPendingCompletionTimer();
    pendingCompletionTimer = setTimeout(() => {
      void finalizePendingCompletion(id);
    }, 10_000);

    return true;
  }

  function undoPendingCompletion(todoId?: string): boolean {
    if (!pendingCompletion.value) {
      return false;
    }

    if (todoId && pendingCompletion.value.id !== todoId) {
      return false;
    }

    const todo = todos.value.find((item) => item.id === pendingCompletion.value?.id);
    if (todo) {
      todo.completed = false;
    }

    clearPendingCompletionState();
    return true;
  }

  async function toggleTodo(id: string): Promise<boolean> {
    if (!authStore.isLoggedIn) {
      return false;
    }

    const todo = todos.value.find(todo => todo.id === id);
    if (!todo) {
      return false;
    }

    if (!todo.completed) {
      return queueTodoCompletion(id);
    }

    if (pendingCompletion.value?.id === id) {
      return undoPendingCompletion(id);
    }

    try {
      lastError.value = '';
      const updatedTask = await withTaskAuthRetry((accessToken) => updateTask(accessToken, id, !todo.completed));
      todo.completed = updatedTask.status === 'completed';
      return true;
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      lastError.value = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  authStore.$subscribe((_mutation, state) => {
    const hasAccounts = Array.isArray((state as any).accounts) && (state as any).accounts.length > 0;
    const hasActiveAccount = Boolean((state as any).activeAccountId);

    if (hasAccounts && hasActiveAccount) {
      void loadTodos();
    } else {
      clearPendingCompletionState();
      todos.value = [];
    }
  });

  if (authStore.isLoggedIn && authStore.activeAccountId) {
    void loadTodos();
  } else {
    todos.value = [];
  }

  return {
    todos,
    lastError,
    pendingCompletion,
    loadTodos,
    addTodo,
    removeTodo,
    toggleTodo,
    undoPendingCompletion,
  };
});
