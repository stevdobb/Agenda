import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid'; // For unique IDs

interface Todo {
  id: string;
  content: string;
  completed: boolean;
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([]);

  // Load todos from localStorage on store initialization
  const loadTodos = () => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      todos.value = JSON.parse(savedTodos);
    }
  };

  // Save todos to localStorage whenever they change
  watch(todos, (newTodos) => {
    localStorage.setItem('todos', JSON.stringify(newTodos));
  }, { deep: true });

  // Call loadTodos immediately
  loadTodos();

  function addTodo(content: string) {
    if (content.trim()) {
      todos.value.push({
        id: uuidv4(),
        content: content.trim(),
        completed: false,
      });
    }
  }

  function removeTodo(id: string) {
    todos.value = todos.value.filter(todo => todo.id !== id);
  }

  function toggleTodo(id: string) {
    const todo = todos.value.find(todo => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  return {
    todos,
    addTodo,
    removeTodo,
    toggleTodo,
  };
});
