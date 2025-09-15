import { BackgroundTask } from '@capawesome/capacitor-background-task'

export async function registerBackgroundSync() {
  try {
    await BackgroundTask.beforeExit(async () => {
      try {
        // Example: ping an endpoint to resume uploads or sync
        await fetch('/api/sync/uploads', { method: 'POST' })
      } catch {}
      BackgroundTask.finish({ taskId: 'sync' })
    })
  } catch (e) {
    console.warn('Background tasks not available', e)
  }
}

