
const TASKS_API_URL = 'https://www.googleapis.com/tasks/v1';

export interface Task {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
}

export async function getTasks(accessToken: string): Promise<Task[]> {
  const response = await fetch(`${TASKS_API_URL}/lists/@default/tasks`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to fetch tasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.error.message}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createTask(accessToken: string, title: string): Promise<Task> {
  const response = await fetch(`${TASKS_API_URL}/lists/@default/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to create task:', error);
    throw new Error(`Failed to create task: ${error.error.message}`);
  }

  return await response.json();
}

export async function updateTask(accessToken: string, taskId: string, completed: boolean): Promise<Task> {
  const status = completed ? 'completed' : 'needsAction';
  const response = await fetch(`${TASKS_API_URL}/lists/@default/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, id: taskId }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to update task:', error);
    throw new Error(`Failed to update task: ${error.error.message}`);
  }

  return await response.json();
}

export async function deleteTask(accessToken: string, taskId: string): Promise<void> {
  const response = await fetch(`${TASKS_API_URL}/lists/@default/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to delete task:', error);
    throw new Error(`Failed to delete task: ${error.error.message}`);
  }
}
