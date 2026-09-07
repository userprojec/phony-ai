import { Router } from 'express';
import { twilioService } from '../services/twilio_service.js';
import { ENV } from '../_core/env.js';

const router: Router = Router();

// Import Supabase client dynamically to avoid issues
let supabaseClient: any = null;
let supabaseServiceClient: any = null;

async function getSupabaseClient() {
  if (!supabaseClient) {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);
  }
  return supabaseClient;
}

// Service role client for webhooks (bypasses RLS)
async function getSupabaseServiceClient() {
  if (!supabaseServiceClient) {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseServiceClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey);
  }
  return supabaseServiceClient;
}

const CALLS_TABLE = 'calls_s_622aa944_0';
const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';
const CAMPAIGN_CUSTOMERS_TABLE = 'campaign_customers_s_622aa944_0';

// Twilio voice webhook - serves TwiML for outgoing calls
// OPTIMIZED: queries run in parallel to minimize Vercel cold start latency
router.post('/voice', async (req: any, res: any) => {
  try {
    console.log('Twilio voice webhook received:', {
      body: req.body,
      query: req.query,
      headers: req.headers['content-type']
    });
    
    const supabase = await getSupabaseServiceClient();
    
    const { CallSid } = req.body;
    const campaignId = parseInt(req.query.campaignId as string, 10);
    const customerId = parseInt(req.query.customerId as string, 10);
    
    console.log('Looking up campaign:', campaignId, 'customer:', customerId);
    
    if (isNaN(campaignId) || isNaN(customerId)) {
      console.error('Invalid campaignId or customerId:', req.query);
      return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We are sorry, but this call configuration is invalid. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }
    
    // Run campaign + customer queries in PARALLEL for speed
    const [campaignResult, customerResult] = await Promise.all([
      supabase.from(CAMPAIGNS_TABLE).select('voice_agent_id, name, corp_id').eq('id', campaignId).single(),
      supabase.from('customers_s_622aa944_0').select('name, order_id, order_status').eq('id', customerId).single()
    ]);
    
    const campaign = campaignResult.data;
    const campaignError = campaignResult.error;
    const customer = customerResult.data;
    const customerError = customerResult.error;

    if (campaignError) console.error('Campaign lookup error:', campaignError);
    if (customerError) console.error('Customer lookup error:', customerError);

    if (!campaign) {
      console.error('Campaign not found:', campaignId);
      return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We are sorry, but this campaign is not available. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }
    
    console.log('Campaign found:', campaign);

    // Get voice agent configuration
    const { data: voiceAgent, error: voiceError } = await supabase
      .from('voice_agents_s_622aa944_0')
      .select('greeting_script, voice_type, language, company_name')
      .eq('id', campaign.voice_agent_id)
      .single();
    
    if (voiceError) console.error('Voice agent lookup error:', voiceError);

    // Generate personalized greeting
    let greeting = voiceAgent?.greeting_script || 'Hello, this is an automated call from our company.';
    
    // Replace placeholders — supports both {{key}} and {key} formats
    if (customer) {
      greeting = greeting.replace(/\{\{customer_name\}\}/g, customer.name || 'there');
      greeting = greeting.replace(/\{\{name\}\}/g, customer.name || 'there');
      greeting = greeting.replace(/\{customer_name\}/g, customer.name || 'there');
      greeting = greeting.replace(/\{name\}/g, customer.name || 'there');
      greeting = greeting.replace(/\{\{order_id\}\}/g, customer.order_id || '');
      greeting = greeting.replace(/\{order_id\}/g, customer.order_id || '');
      greeting = greeting.replace(/\{\{order_status\}\}/g, customer.order_status || '');
      greeting = greeting.replace(/\{order_status\}/g, customer.order_status || '');
      greeting = greeting.replace(/\{\{company_name\}\}/g, voiceAgent?.company_name || 'our company');
      greeting = greeting.replace(/\{company_name\}/g, voiceAgent?.company_name || 'our company');
    } else {
      greeting = greeting.replace(/\{\{customer_name\}\}/g, 'there');
      greeting = greeting.replace(/\{\{name\}\}/g, 'there');
      greeting = greeting.replace(/\{customer_name\}/g, 'there');
      greeting = greeting.replace(/\{name\}/g, 'there');
      greeting = greeting.replace(/\{\{order_id\}\}/g, '');
      greeting = greeting.replace(/\{order_id\}/g, '');
      greeting = greeting.replace(/\{\{order_status\}\}/g, '');
      greeting = greeting.replace(/\{order_status\}/g, '');
      greeting = greeting.replace(/\{\{company_name\}\}/g, voiceAgent?.company_name || 'our company');
      greeting = greeting.replace(/\{company_name\}/g, voiceAgent?.company_name || 'our company');
    }

    console.log('Generated greeting:', greeting);

    // SAFETY NET
    if (!greeting || greeting.trim().length === 0) {
      const custName = customer?.name || 'there';
      const orderId = customer?.order_id || 'your order';
      const orderStatus = customer?.order_status || 'being processed';
      greeting = `Hello ${custName}, this is an automated call regarding your order ${orderId}. Your order is currently ${orderStatus}.`;
      console.log('[FALLBACK] Generated fallback greeting:', greeting);
    }

    const voice = voiceAgent?.voice_type === 'female' ? 'woman' : 'man';
    const language = voiceAgent?.language || 'en-US';

    const webhookBaseUrl = ENV.webhookBaseUrl || 'https://phoney.ai-app.pub';
    const gatherActionUrl = `${webhookBaseUrl}/api/webhooks/twilio/gather?campaignId=${campaignId}&customerId=${customerId}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(greeting)}</Say>
  <Pause length="1"/>
  <Gather action="${gatherActionUrl}" method="POST" numDigits="1" timeout="10">
    <Say voice="${voice}" language="${language}">Press 1 if you received your order, or press 2 if you have not received it.</Say>
  </Gather>
  <Say voice="${voice}" language="${language}">We didn't receive any input. Goodbye.</Say>
  <Hangup/>
</Response>`;

    console.log('Sending TwiML, length:', twiml.length);

    // Update call record (fire-and-forget — don't block the response)
    supabase.from(CALLS_TABLE).update({ 
      twilio_call_sid: CallSid,
      status: 'in-progress',
      updated_at: new Date().toISOString()
    }).eq('campaign_id', campaignId).eq('customer_id', customerId).then((result: any) => {
      if (result.error) console.error('Error updating call record:', result.error);
    });

    res.type('text/xml').send(twiml);
  } catch (error: any) {
    console.error('Voice webhook error:', error);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We are sorry, but we are experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`);
  }
});

// Twilio gather webhook - handles user input
router.post('/gather', async (req: any, res: any) => {
  try {
    const { Digits, CallSid } = req.body;
    const supabase = await getSupabaseServiceClient();
    
    const { data: call } = await supabase.from(CALLS_TABLE).select('id, campaign_id').eq('twilio_call_sid', CallSid).single();

    if (!call) {
      return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Thank you for your response. Goodbye.</Say><Hangup/></Response>`);
    }

    const { data: campaign } = await supabase.from(CAMPAIGNS_TABLE).select('voice_agent_id').eq('id', call.campaign_id).single();
    const { data: voiceAgent } = await supabase.from('voice_agents_s_622aa944_0').select('voice_type, language, faq_responses').eq('id', campaign?.voice_agent_id).single();

    const voice = voiceAgent?.voice_type === 'female' ? 'woman' : 'man';
    const language = voiceAgent?.language || 'en-US';

    let responseMessage = '';
    let outcome = '';

    switch (Digits) {
      case '1': responseMessage = 'Thank you for confirming. Have a great day!'; outcome = 'confirmed'; break;
      case '2': responseMessage = 'We apologize for the inconvenience. Our team will contact you shortly to resolve this issue.'; outcome = 'issue_reported'; break;
      default: responseMessage = 'Thank you for your response. Goodbye.'; outcome = 'no_response';
    }

    await supabase.from(CALLS_TABLE).update({ outcome, customer_response: Digits, updated_at: new Date().toISOString() }).eq('id', call.id);

    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="${voice}" language="${language}">${escapeXml(responseMessage)}</Say><Hangup/></Response>`);
  } catch (error: any) {
    console.error('Gather webhook error:', error);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

// Twilio status callback webhook
router.post('/status', async (req: any, res: any) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl, RecordingSid, From, To } = req.body;
    console.log('Twilio status callback:', { CallSid, CallStatus, From, To });

    const supabase = await getSupabaseServiceClient();
    const { data: call } = await supabase.from(CALLS_TABLE).select('id, campaign_id, customer_id').eq('twilio_call_sid', CallSid).single();

    if (!call) { console.warn('Call not found for SID:', CallSid); return res.sendStatus(200); }

    const statusMap: Record<string, string> = {
      'queued': 'pending', 'ringing': 'dialing', 'in-progress': 'in-progress',
      'completed': 'completed', 'busy': 'failed', 'no-answer': 'failed',
      'canceled': 'cancelled', 'failed': 'failed',
    };

    const newStatus = statusMap[CallStatus] || CallStatus;
    const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (CallDuration) updateData.duration = parseInt(CallDuration, 10);
    if (RecordingUrl) updateData.recording_url = RecordingUrl;
    if (CallStatus === 'completed') updateData.ended_at = new Date().toISOString();

    await supabase.from(CALLS_TABLE).update(updateData).eq('id', call.id);
    await supabase.from(CAMPAIGN_CUSTOMERS_TABLE).update({
      call_status: newStatus === 'completed' ? 'completed' : newStatus,
      updated_at: new Date().toISOString()
    }).eq('campaign_id', call.campaign_id).eq('customer_id', call.customer_id);

    res.sendStatus(200);
  } catch (error: any) {
    console.error('Status callback error:', error);
    res.sendStatus(200);
  }
});

// Twilio recording callback
router.post('/recording', async (req: any, res: any) => {
  try {
    const { RecordingSid, RecordingUrl, CallSid, RecordingDuration } = req.body;
    const supabase = await getSupabaseServiceClient();
    const { data: call } = await supabase.from(CALLS_TABLE).select('id').eq('twilio_call_sid', CallSid).single();

    if (call) {
      await supabase.from(CALLS_TABLE).update({
        recording_url: RecordingUrl, recording_sid: RecordingSid,
        recording_duration: RecordingDuration ? parseInt(RecordingDuration, 10) : null,
        updated_at: new Date().toISOString()
      }).eq('id', call.id);
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('Recording callback error:', error);
    res.sendStatus(200);
  }
});

// Simple test endpoint - returns basic TwiML without any database lookup
router.post('/test', async (req: any, res: any) => {
  console.log('[TEST WEBHOOK] Received test webhook call');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman" language="en-US">Hello! This is a test call from Phoney AI. If you can hear this message, the webhook is working correctly.</Say>
  <Pause length="2"/>
  <Say voice="woman" language="en-US">The webhook configuration is successful. Goodbye!</Say>
  <Hangup/>
</Response>`;
  res.type('text/xml').send(twiml);
});

// Helper function to escape XML
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Diagnostic endpoint
router.get('/diagnostic', async (req: any, res: any) => {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data: campaigns } = await supabase.from(CAMPAIGNS_TABLE).select('id, name, status, corp_id, is_deleted').limit(5);
    const { count: campaignCount } = await supabase.from(CAMPAIGNS_TABLE).select('*', { count: 'exact', head: true });
    const { data: calls } = await supabase.from(CALLS_TABLE).select('id, status, campaign_id, customer_id').limit(5);
    
    res.json({
      success: true,
      config: { supabaseUrlConfigured: !!ENV.supabaseUrl, supabaseServiceKeyConfigured: !!ENV.supabaseServiceKey },
      database: { campaignCount: campaignCount || 0, campaignsFound: campaigns?.length || 0, callsFound: calls?.length || 0 },
      sampleCampaigns: campaigns || [],
      sampleCalls: calls || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;