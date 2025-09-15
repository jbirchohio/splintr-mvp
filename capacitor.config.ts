import { CapacitorConfig } from '@capacitor/cli'

const isDev = process.env.NODE_ENV !== 'production'

const config: CapacitorConfig = {
  appId: 'co.splintr.app',
  appName: 'Splintr',
  webDir: '.next',
  bundledWebRuntime: false,
  server: isDev ? { url: 'http://localhost:3000', cleartext: true } : {},
}

export default config

