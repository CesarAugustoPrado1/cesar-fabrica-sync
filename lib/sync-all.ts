import { runFullSync } from './sync/runner';
import { syncTasks } from './sync/tasks';

export async function syncAll() {
  return runFullSync(syncTasks);
}
