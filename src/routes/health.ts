import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { emailService } from '../services/emailService';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Detailed service health check
router.get('/check-services', async (req: Request, res: Response) => {
  const services = {
    api: true,
    database: false,
    smtp: false,
  };

  // Check Supabase connection
  try {
    const { data, error } = await supabaseAdmin.from('campaigns').select('id').limit(1);
    services.database = !error;
    if (error) {
      console.log('Database check error:', error.message);
    }
  } catch (e) {
    console.log('Database check exception:', (e as Error).message);
    services.database = false;
  }

  // Check SMTP connection
  try {
    services.smtp = await emailService.verifyConnection();
  } catch (e) {
    services.smtp = false;
  }

  const allHealthy = Object.values(services).every(s => s);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  });
});

export default router;
