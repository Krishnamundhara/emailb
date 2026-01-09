import nodemailer from 'nodemailer';
import { config } from '../config';
import { supabaseAdmin } from '../config/supabase';

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendBulkEmails(
    emails: string[],
    subject: string,
    body: string,
    campaignId: string,
    activeCampaigns: Map<string, { status: string; cancel: boolean }>
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];
    const { maxBatchSize, batchDelayMs, maxRetries } = config.email;

    for (let i = 0; i < emails.length; i += maxBatchSize) {
      // Check if campaign was cancelled
      const campaign = activeCampaigns.get(campaignId);
      if (campaign?.cancel) {
        console.log(`Campaign ${campaignId} was cancelled`);
        break;
      }

      const batch = emails.slice(i, i + maxBatchSize);
      
      const batchPromises = batch.map(async (email) => {
        let attempts = 0;
        let success = false;
        let lastError: string | undefined;

        while (attempts < maxRetries && !success) {
          try {
            // Personalize email
            const personalizedSubject = this.personalize(subject, email);
            const personalizedBody = this.personalize(body, email);
            
            await this.sendEmail(email, personalizedSubject, personalizedBody);
            success = true;

            // Update recipient status
            if (supabaseAdmin) {
              await supabaseAdmin
                .from('campaign_recipients')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('campaign_id', campaignId)
                .eq('email', email);
            }
          } catch (error) {
            attempts++;
            lastError = error instanceof Error ? error.message : 'Unknown error';
            
            if (attempts < maxRetries) {
              await this.delay(1000 * attempts); // Exponential backoff
            }
          }
        }

        if (!success && supabaseAdmin) {
          await supabaseAdmin
            .from('campaign_recipients')
            .update({ status: 'failed', error: lastError })
            .eq('campaign_id', campaignId)
            .eq('email', email);
        }

        return { email, success, error: lastError };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches
      if (i + maxBatchSize < emails.length) {
        await this.delay(batchDelayMs);
      }
    }

    return results;
  }

  private personalize(template: string, email: string): string {
    const name = email.split('@')[0].replace(/[._-]/g, ' ');
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    return template
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{name\}\}/g, capitalizedName)
      .replace(/\{\{company\}\}/g, '')
      .replace(/\{\{position\}\}/g, '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const emailService = new EmailService();
