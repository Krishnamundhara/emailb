import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
    fromName: process.env.SMTP_FROM_NAME || 'Email Campaign Service',
  },
  
  email: {
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '50', 10),
    batchDelayMs: parseInt(process.env.BATCH_DELAY_MS || '500', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  },
};
