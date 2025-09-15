import { PushNotifications } from '@capacitor/push-notifications'
import { Device } from '@capacitor/device'

export async function registerNativePush() {
  try {
    const info = await Device.getInfo()
    await PushNotifications.requestPermissions()
    await PushNotifications.register()
    PushNotifications.addListener('registration', async (token) => {
      try {
        const res = await fetch('/api/notifications/native/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token.value, platform: info.platform === 'ios' ? 'ios' : 'android' }) })
        if (!res.ok) console.warn('Failed to register native push token')
      } catch {}
    })
    PushNotifications.addListener('registrationError', (err) => console.error('Push registration error', err))
  } catch (e) {
    console.warn('Native push not available', e)
  }
}

