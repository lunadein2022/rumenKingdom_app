import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.rumenkingdom.app',
  appName: '루멘왕국 공주의 하루',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.netlify.app'],
  },
  android: { allowMixedContent: false },
}

export default config
