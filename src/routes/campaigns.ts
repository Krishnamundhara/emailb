import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';
import { emailService } from '../services/emailService';
import { validateEmails } from '../utils/emailValidator';

const router = Router();

// In-memory storage for campaigns (works without database)
interface CampaignData {
  id: string;
  name: string;
  subject: string;
  body: string;
  emails: string[];
  totalEmails: number;
  validEmails: number;
  invalidEmails: number;
  sentCount: number;
  failedCount: number;
  status: string;
  cancel: boolean;
  createdAt: string;
  verification: Array<{ email: string; isValid: boolean; error?: string }>;
}

const campaignsStore = new Map<string, CampaignData>();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  emails: z.array(z.string().email()).min(1, 'At least one email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

// Create a new campaign
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createCampaignSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { name, emails, subject, body } = validation.data;
    const campaignId = uuidv4();

    // Validate emails
    const verification = await validateEmails(emails);
    const validEmailsList = verification.filter(v => v.isValid);
    const invalidEmailsList = verification.filter(v => !v.isValid);

    // Store campaign in memory (primary storage)
    const campaign: CampaignData = {
      id: campaignId,
      name,
      subject,
      body,
      emails,
      totalEmails: emails.length,
      validEmails: validEmailsList.length,
      invalidEmails: invalidEmailsList.length,
      sentCount: 0,
      failedCount: 0,
      status: 'draft',
      cancel: false,
      createdAt: new Date().toISOString(),
      verification,
    };

    campaignsStore.set(campaignId, campaign);
    console.log(`Campaign ${campaignId} created with ${emails.length} emails`);

    // Also save to Supabase database (fire and forget)
    if (supabaseAdmin) {
      (async () => {
        try {
          await supabaseAdmin
            .from('campaigns')
            .insert({
              id: campaignId,
              name,
              subject,
              body,
              from_email: 'krishnamundhara183@gmail.com',
              from_name: 'Email Verification',
              total_emails: emails.length,
              verified_emails: validEmailsList.length,
              sent_emails: 0,
              failed_emails: 0,
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          console.log('Campaign saved to Supabase');
        } catch (err) {
          console.log('Supabase save error:', (err as Error).message);
        }
      })();
    }

    res.status(201).json({
      campaignId,
      totalEmails: emails.length,
      validEmails: validEmailsList.length,
      invalidEmails: invalidEmailsList.length,
      verification,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get all campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const campaigns = Array.from(campaignsStore.values()).map(c => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      total_emails: c.totalEmails,
      valid_emails: c.validEmails,
      invalid_emails: c.invalidEmails,
      sent_count: c.sentCount,
      failed_count: c.failedCount,
      status: c.status,
      created_at: c.createdAt,
    }));

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaignsStore.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      body: campaign.body,
      total_emails: campaign.totalEmails,
      valid_emails: campaign.validEmails,
      invalid_emails: campaign.invalidEmails,
      sent_count: campaign.sentCount,
      failed_count: campaign.failedCount,
      status: campaign.status,
      created_at: campaign.createdAt,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Send campaign
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaignsStore.get(id);

    if (!campaign) {
      console.error(`Campaign ${id} not found in store`);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get valid emails from stored verification
    const validEmails = campaign.verification
      .filter(v => v.isValid)
      .map(v => v.email);

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    // Update campaign status
    campaign.status = 'sending';
    console.log(`Starting to send campaign ${id} to ${validEmails.length} recipients`);

    // Create a reference for cancellation
    const activeCampaigns = new Map<string, { status: string; cancel: boolean }>();
    activeCampaigns.set(id, { status: 'sending', cancel: false });

    // Send emails asynchronously
    emailService.sendBulkEmails(
      validEmails,
      campaign.subject,
      campaign.body,
      id,
      activeCampaigns
    ).then((results) => {
      const sent = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      campaign.sentCount = sent;
      campaign.failedCount = failed;
      campaign.status = 'completed';
      
      console.log(`Campaign ${id} completed: ${sent} sent, ${failed} failed`);
    }).catch((err) => {
      console.error('Bulk send error:', err);
      campaign.status = 'failed';
    });

    res.json({
      message: 'Campaign sending started',
      campaignId: id,
      totalRecipients: validEmails.length,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Stop campaign
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaignsStore.get(id);

    if (campaign) {
      campaign.cancel = true;
      campaign.status = 'stopped';
    }

    res.json({ message: 'Campaign stopped', campaignId: id });
  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({ error: 'Failed to stop campaign' });
  }
});

// Get campaign results
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = campaignsStore.get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      campaignId: id,
      status: campaign.status,
      totalEmails: campaign.totalEmails,
      validEmails: campaign.validEmails,
      invalidEmails: campaign.invalidEmails,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      verification: campaign.verification,
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

export default router;
