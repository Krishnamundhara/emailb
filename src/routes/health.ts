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
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('campaigns').select('id').limit(1);
      services.database = !error;
      if (error) {
        console.log('Database check error:', error.message);
      }
    } else {
      console.log('Database check skipped: Supabase not configured');
      services.database = false;
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

  // Return 200 even if some services are degraded (so Render doesn't restart the service)
  res.status(200).json({
    status: services.database && services.smtp ? 'healthy' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  });
});

export default router;
