import { ModerationConfig } from '@/types/moderation.types'

export const moderationConfig: ModerationConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    enabled: process.env.OPENAI_MODERATION_ENABLED === 'true'
  },
  awsRekognition: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    enabled: process.env.AWS_REKOGNITION_ENABLED === 'true'
  },
  hive: {
    apiKey: process.env.HIVE_API_KEY || '',
    enabled: process.env.HIVE_MODERATION_ENABLED === 'true'
  },
  thresholds: {
    textConfidence: parseFloat(process.env.TEXT_MODERATION_THRESHOLD || '0.7'),
    videoConfidence: parseFloat(process.env.VIDEO_MODERATION_THRESHOLD || '0.8'),
    autoRejectThreshold: parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.9')
  }
}

export const moderationCategories = {
  openai: [
    'hate',
    'hate/threatening',
    'harassment',
    'harassment/threatening',
    'self-harm',
    'self-harm/intent',
    'self-harm/instructions',
    'sexual',
    'sexual/minors',
    'violence',
    'violence/graphic'
  ],
  aws: [
    'Explicit Nudity',
    'Suggestive',
    'Violence',
    'Visually Disturbing',
    'Rude Gestures',
    'Drugs',
    'Tobacco',
    'Alcohol',
    'Gambling',
    'Hate Symbols'
  ]
} as const