import { Router } from 'express';
import { twilioService } from '../services/twilio_service.js';
import { ENV } from '../_core/env.js';

const router: Router = Router();

/**
 * Normalize phone number to E.164 format (no spaces, starts with +)
 * Removes all non-digit characters and ensures + prefix
 */
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters (including spaces, dashes, etc.)
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Ensure it starts with +
  return `+${digitsOnly}`;
}

const TABLE_NAME = 'campaigns_s_622aa944_0';
const CAMPAIGN_CUSTOMERS_TABLE = 'campaign_customers_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';
const CALLS_TABLE = 'calls_s_622aa944_0';
const SETTINGS_TABLE = 'settings_s_622aa944_0';

router.get('/', async (req: any, res: any) => {
  try {
    const { status, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let query = req.supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const campaignsWithStats = await Promise.all(
      (data || []).map(async (campaign: any) => {
        const { count: customerCount } = await req.supabase
          .from(CAMPAIGN_CUSTOMERS_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('is_deleted', 'n');

        const { count: completedCalls } = await req.supabase
          .from(CALLS_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'completed')
          .eq('is_deleted', 'n');

        const { count: totalCalls } = await req.supabase
          .from(CALLS_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('is_deleted', 'n');

        const successRate = totalCalls && totalCalls > 0
          ? Math.round(((completedCalls || 0) / totalCalls) * 100)
          : 0;

        return {
          ...campaign,
          customerCount: customerCount || 0,
          completedCalls: completedCalls || 0,
          successRate
        };
      })
    );

    res.json({
      success: true,
      data: {
        list: campaignsWithStats,
        total: count || 0,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: any, res: any) => {
  try {
    const { data: campaign, error } = await req.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .single();

    if (error) throw error;
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    // Get campaign customers without nested query
    const { data: campaignCustomers } = await req.supabase
      .from(CAMPAIGN_CUSTOMERS_TABLE)
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_deleted', 'n');

    // Get calls without nested query
    const { data: calls } = await req.supabase
      .from(CALLS_TABLE)
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false });

    // Fetch customer details for calls separately
    let callsWithCustomers = calls || [];
    if (calls && calls.length > 0) {
      const customerIds = calls.map((c: any) => c.customer_id).filter(Boolean);
      if (customerIds.length > 0) {
        const { data: customersData } = await req.supabase
          .from(CUSTOMERS_TABLE)
          .select('id, name, phone, order_id, order_status')
          .in('id', customerIds)
          .eq('is_deleted', 'n');
        
        const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));
        callsWithCustomers = calls.map((call: any) => ({
          ...call,
          customer: customersMap.get(call.customer_id) || null
        }));
      }
    }

    // Fetch customer details for campaign customers separately
    let customersWithDetails = campaignCustomers || [];
    if (campaignCustomers && campaignCustomers.length > 0) {
      const customerIds = campaignCustomers.map((cc: any) => cc.customer_id).filter(Boolean);
      if (customerIds.length > 0) {
        const { data: customersData } = await req.supabase
          .from(CUSTOMERS_TABLE)
          .select('id, name, phone, order_id, order_status')
          .in('id', customerIds)
          .eq('is_deleted', 'n');
        
        const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));
        customersWithDetails = campaignCustomers.map((cc: any) => ({
          ...cc,
          customer: customersMap.get(cc.customer_id) || null
        }));
      }
    }

    // Calculate stats
    const totalCustomers = campaignCustomers?.length || 0;
    const calledCount = calls?.length || 0;
    const completedCalls = calls?.filter((c: any) => c.status === 'completed').length || 0;
    const failedCount = calls?.filter((c: any) => c.status === 'failed').length || 0;
    const successRate = calledCount > 0 ? Math.round((completedCalls / calledCount) * 100) : 0;

    const campaignWithStats = {
      ...campaign,
      total_customers: totalCustomers,
      called_count: calledCount,
      failed_count: failedCount,
      success_rate: successRate
    };

    // Extract customer details from the joined data
    const customerDetails = customersWithDetails.map((cc: any) => cc.customer || cc).filter(Boolean);

    res.json({
      success: true,
      data: {
        campaign: campaignWithStats,
        customers: customerDetails,
        calls: callsWithCustomers
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const {
      name,
      description,
      voice_agent_id,
      language,
      time_window_start,
      time_window_end,
      max_retry_attempts,
      calls_per_minute,
      caller_id,
      customer_ids
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Campaign name is required' });
    }

    const { data: campaign, error } = await req.supabase
      .from(TABLE_NAME)
      .insert({
        name,
        description,
        voice_agent_id,
        language,
        time_window_start,
        time_window_end,
        max_retry_attempts,
        calls_per_minute,
        caller_id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    if (customer_ids && customer_ids.length > 0) {
      const campaignCustomers = customer_ids.map((customerId: number) => ({
        corp_id: req.userInfo?.corpId,
        emp_id: req.userInfo?.userId,
        campaign_id: campaign.id,
        customer_id: customerId,
        call_status: 'pending'
      }));

      await req.supabase
        .from(CAMPAIGN_CUSTOMERS_TABLE)
        .insert(campaignCustomers);
    }

    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update(req.body)
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { error } = await req.supabase
      .from(TABLE_NAME)
      .update({ is_deleted: 'y' })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/start', async (req: any, res: any) => {
  console.log('[DEBUG] ============================================');
  console.log('[DEBUG] Entered POST /:id/start endpoint');
  console.log('[DEBUG] Campaign ID:', req.params.id);
  console.log('[DEBUG] User info:', { corpId: req.userInfo?.corpId, userId: req.userInfo?.userId });
  
  try {
    // Get campaign details (without nested query to avoid FK constraint issues)
    console.log('[DEBUG] Step 1: Loading campaign from database...');
    const { data: campaign, error: campaignError } = await req.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .single();
    
    console.log('[DEBUG] Campaign loaded:', campaign ? 'SUCCESS' : 'FAILED');
    console.log('[DEBUG] Campaign data:', JSON.stringify(campaign, null, 2));

    if (campaignError) {
      console.log('[DEBUG] Campaign load error:', campaignError);
      throw campaignError;
    }
    if (!campaign) {
      console.log('[DEBUG] Campaign not found');
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    console.log('[DEBUG] Step 1 COMPLETE: Campaign loaded successfully');

    // Get voice agent details separately if voice_agent_id exists
    console.log('[DEBUG] Step 2: Loading voice agent...');
    let voiceAgent = null;
    if (campaign.voice_agent_id) {
      const { data: va } = await req.supabase
        .from('voice_agents_s_622aa944_0')
        .select('*')
        .eq('id', campaign.voice_agent_id)
        .eq('is_deleted', 'n')
        .single();
      voiceAgent = va;
      console.log('[DEBUG] Voice agent loaded:', voiceAgent ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('[DEBUG] No voice_agent_id configured for this campaign');
    }
    console.log('[DEBUG] Step 2 COMPLETE');

    // Get Twilio settings
    console.log('[DEBUG] Step 3: Loading Twilio settings...');
    const { data: settingsData } = await req.supabase
      .from(SETTINGS_TABLE)
      .select('settings')
      .eq('category', 'telephony')
      .eq('is_deleted', 'n')
      .single();

    const settings = settingsData?.settings || {};
    console.log('[DEBUG] Settings loaded:', JSON.stringify(settings, null, 2));

    if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
      console.log('[DEBUG] ERROR: Twilio settings not configured');
      return res.status(400).json({ 
        success: false, 
        error: 'Twilio settings not configured. Please configure Twilio in Settings page.' 
      });
    }
    console.log('[DEBUG] Step 3 COMPLETE: Settings loaded');

    // Initialize Twilio service
    console.log('[DEBUG] Step 4: Initializing Twilio service...');
    console.log('[DEBUG] Twilio Account SID:', settings.twilioAccountSid.substring(0, 10) + '...');
    console.log('[DEBUG] From number:', campaign.caller_id || settings.twilioPhoneNumber);
    twilioService.initialize({
      accountSid: settings.twilioAccountSid,
      authToken: settings.twilioAuthToken,
      fromNumber: campaign.caller_id || settings.twilioPhoneNumber
    });
    console.log('[DEBUG] Step 4 COMPLETE: Twilio service initialized');

    // Get campaign customers (without nested query to avoid FK constraint issues)
    console.log('[DEBUG] Step 5: Loading campaign customers...');
    console.log('[DEBUG] Query params:', { campaign_id: campaign.id, call_status: 'pending' });
    const { data: campaignCustomers, error: customersError } = await req.supabase
      .from(CAMPAIGN_CUSTOMERS_TABLE)
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_deleted', 'n')
      .eq('call_status', 'pending');

    console.log('[DEBUG] Campaign customers query result:', { 
      count: campaignCustomers?.length || 0, 
      error: customersError?.message || 'none' 
    });

    if (customersError) {
      console.log('[DEBUG] Campaign customers error:', customersError);
      throw customersError;
    }

    // If no pending customers, check if there are any customers at all
    // This handles the case where a campaign was previously started and failed
    let customersToProcess = campaignCustomers || [];
    
    if (customersToProcess.length === 0) {
      console.log('[DEBUG] No pending customers found, checking for any customers in campaign...');
      
      // Get all customers in this campaign (regardless of status)
      const { data: allCampaignCustomers } = await req.supabase
        .from(CAMPAIGN_CUSTOMERS_TABLE)
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('is_deleted', 'n');
      
      console.log('[DEBUG] Total customers in campaign:', allCampaignCustomers?.length || 0);
      
      if (allCampaignCustomers && allCampaignCustomers.length > 0) {
        // Reset all customers to pending status
        console.log('[DEBUG] Resetting', allCampaignCustomers.length, 'customers to pending status...');
        
        for (const cc of allCampaignCustomers) {
          await req.supabase
            .from(CAMPAIGN_CUSTOMERS_TABLE)
            .update({ call_status: 'pending', call_id: null, updated_at: new Date().toISOString() })
            .eq('id', cc.id);
        }
        
        // Also reset any existing call records to pending
        const { data: existingCalls } = await req.supabase
          .from(CALLS_TABLE)
          .select('id')
          .eq('campaign_id', campaign.id)
          .in('status', ['failed', 'cancelled']);
          
        if (existingCalls && existingCalls.length > 0) {
          console.log('[DEBUG] Deleting', existingCalls.length, 'failed/cancelled call records...');
          for (const call of existingCalls) {
            await req.supabase
              .from(CALLS_TABLE)
              .update({ is_deleted: 'y', updated_at: new Date().toISOString() })
              .eq('id', call.id);
          }
        }
        
        // Reload customers with pending status
        const { data: resetCustomers } = await req.supabase
          .from(CAMPAIGN_CUSTOMERS_TABLE)
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('is_deleted', 'n')
          .eq('call_status', 'pending');
          
        customersToProcess = resetCustomers || [];
        console.log('[DEBUG] After reset, pending customers:', customersToProcess.length);
      }
    }

    if (customersToProcess.length === 0) {
      console.log('[DEBUG] ERROR: No customers found for this campaign');
      return res.status(400).json({ 
        success: false, 
        error: 'No customers found for this campaign. Please add customers to the campaign first.' 
      });
    }
    console.log('[DEBUG] Step 5 COMPLETE: Found', campaignCustomers.length, 'pending customers');

    // Fetch customer details separately
    console.log('[DEBUG] Step 6: Fetching customer details...');
    const customerIds = campaignCustomers.map((cc: any) => cc.customer_id);
    console.log('[DEBUG] Customer IDs to fetch:', customerIds);
    
    const { data: customersData } = await req.supabase
      .from(CUSTOMERS_TABLE)
      .select('id, name, phone, order_id, order_status')
      .in('id', customerIds)
      .eq('is_deleted', 'n');

    console.log('[DEBUG] Customers data loaded:', customersData?.length || 0, 'records');
    console.log('[DEBUG] First customer sample:', JSON.stringify(customersData?.[0], null, 2));

    const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));

    // Attach customer data to campaign customers
    const campaignCustomersWithDetails = campaignCustomers.map((cc: any) => ({
      ...cc,
      customer: customersMap.get(cc.customer_id)
    }));
    console.log('[DEBUG] Step 6 COMPLETE: Mapped', campaignCustomersWithDetails.length, 'customers');

    // Update campaign status to running
    console.log('[DEBUG] Step 7: Updating campaign status to running...');
    await req.supabase
      .from(TABLE_NAME)
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', campaign.id);
    console.log('[DEBUG] Step 7 COMPLETE');

    // Get the webhook base URL
    // Must be a publicly accessible URL that Twilio can reach
    // Priority: 1) Settings webhook_base_url, 2) ENV, 3) Request headers, 4) Default
    const webhookBaseUrl = settings.webhook_base_url || 
      ENV.webhookBaseUrl || 
      req.headers.origin || 
      'https://phoney.ai-app.pub';
    console.log('[DEBUG] Webhook base URL:', webhookBaseUrl);

    // Initiate calls for each customer
    console.log('[DEBUG] Step 8: Beginning customer loop...');
    const callResults = [];
    const errors = [];

    for (let i = 0; i < campaignCustomersWithDetails.length; i++) {
      const cc = campaignCustomersWithDetails[i];
      console.log(`[DEBUG] Processing customer ${i+1}/${campaignCustomersWithDetails.length}, ID:`, cc.customer_id);
      
      const customer = cc.customer;
      console.log('[DEBUG] Current customer object:', JSON.stringify(customer, null, 2));
      
      if (!customer || !customer.phone) {
        console.log('[DEBUG] ERROR: Customer has no phone number');
        errors.push({ customerId: customer?.id, error: 'Customer has no phone number' });
        continue;
      }

      // Normalize phone number to E.164 format
      const normalizedPhone = normalizePhone(customer.phone);
      console.log('[DEBUG] Original phone:', customer.phone, '-> Normalized:', normalizedPhone);
      
      // Validate phone number format
      if (!normalizedPhone || normalizedPhone.length < 8) {
        console.log('[DEBUG] ERROR: Phone number not valid after normalization:', normalizedPhone);
        errors.push({ 
          customerId: customer.id, 
          phone: customer.phone,
          error: 'Phone number must be valid (e.g., +9779704011561)' 
        });
        continue;
      }
      console.log('[DEBUG] Phone number validated:', normalizedPhone);

      // Create call record first (store normalized phone)
      console.log('[DEBUG] Step 9: Creating call record in database...');
      const { data: callRecord, error: callError } = await req.supabase
        .from(CALLS_TABLE)
        .insert({
          corp_id: req.userInfo?.corpId,
          emp_id: req.userInfo?.userId,
          campaign_id: campaign.id,
          customer_id: customer.id,
          phone: normalizedPhone,  // Use normalized phone
          status: 'pending',
          retry_count: 0
        })
        .select()
        .single();

      if (callError) {
        console.log('[DEBUG] ERROR: Failed to create call record:', callError);
        errors.push({ customerId: customer.id, error: 'Failed to create call record' });
        continue;
      }
      console.log('[DEBUG] Step 9 COMPLETE: Call record created, ID:', callRecord?.id);

      // Build the TwiML URL with campaign and customer IDs
      const twimlUrl = `${webhookBaseUrl}/api/webhooks/twilio/voice?campaignId=${campaign.id}&customerId=${customer.id}`;
      console.log('[DEBUG] TwiML URL:', twimlUrl);

      // Initiate the call via Twilio (use normalized phone)
      console.log('[DEBUG] Step 10: About to call twilioService.makeCall()...');
      console.log('[DEBUG] Call params:', { 
        to: normalizedPhone, 
        from: campaign.caller_id || settings.twilioPhoneNumber,
        url: twimlUrl 
      });
      
      const result = await twilioService.makeCall({
        to: normalizedPhone,  // Use normalized phone
        from: campaign.caller_id || settings.twilioPhoneNumber,
        url: twimlUrl,
        statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });
      
      console.log('[DEBUG] Step 10 COMPLETE: twilioService.makeCall() returned:', JSON.stringify(result, null, 2));

      if (result.success) {
        // Update call record with Twilio SID
        await req.supabase
          .from(CALLS_TABLE)
          .update({
            twilio_call_sid: result.callSid,
            status: 'initiated',
            updated_at: new Date().toISOString()
          })
          .eq('id', callRecord.id);

        // Update campaign customer status
        await req.supabase
          .from(CAMPAIGN_CUSTOMERS_TABLE)
          .update({
            call_status: 'initiated',
            call_id: callRecord.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', cc.id);

        callResults.push({
          customerId: customer.id,
          phone: customer.phone,
          callSid: result.callSid,
          status: 'initiated'
        });
      } else {
        // Update call record with error
        await req.supabase
          .from(CALLS_TABLE)
          .update({
            status: 'failed',
            outcome: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', callRecord.id);

        // Update campaign customer status
        await req.supabase
          .from(CAMPAIGN_CUSTOMERS_TABLE)
          .update({
            call_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', cc.id);

        errors.push({
          customerId: customer.id,
          phone: customer.phone,
          error: result.error
        });
      }
    }

    res.json({
      success: true,
      data: {
        campaign: { ...campaign, status: 'running' },
        initiated: callResults.length,
        failed: errors.length,
        callResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error: any) {
    console.error('Campaign start error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/stop', async (req: any, res: any) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update({ status: 'paused' })
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add customers to an existing campaign
router.post('/:id/customers', async (req: any, res: any) => {
  try {
    const { customer_ids } = req.body;
    const campaignId = req.params.id;

    if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customer_ids is required and must be a non-empty array'
      });
    }

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await req.supabase
      .from(TABLE_NAME)
      .select('id, status')
      .eq('id', campaignId)
      .eq('is_deleted', 'n')
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if campaign is already running
    if (campaign.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add customers to a running campaign. Please pause the campaign first.'
      });
    }

    // Get existing customer associations to avoid duplicates
    const { data: existingAssociations } = await req.supabase
      .from(CAMPAIGN_CUSTOMERS_TABLE)
      .select('customer_id')
      .eq('campaign_id', campaignId)
      .eq('is_deleted', 'n');

    const existingCustomerIds = new Set((existingAssociations || []).map((a: any) => a.customer_id));

    // Filter out already associated customers
    const newCustomerIds = customer_ids.filter((id: number) => !existingCustomerIds.has(id));

    if (newCustomerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All selected customers are already associated with this campaign'
      });
    }

    // Create campaign customer associations
    const campaignCustomers = newCustomerIds.map((customerId: number) => ({
      corp_id: req.userInfo?.corpId,
      emp_id: req.userInfo?.userId,
      campaign_id: campaignId,
      customer_id: customerId,
      call_status: 'pending'
    }));

    const { error: insertError } = await req.supabase
      .from(CAMPAIGN_CUSTOMERS_TABLE)
      .insert(campaignCustomers);

    if (insertError) throw insertError;

    res.json({
      success: true,
      data: {
        added: newCustomerIds.length,
        skipped: customer_ids.length - newCustomerIds.length
      }
    });
  } catch (error: any) {
    console.error('Add customers to campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign customers
router.get('/:id/customers', async (req: any, res: any) => {
  try {
    const campaignId = req.params.id;
    const { status } = req.query;

    // Get campaign customer associations
    let query = req.supabase
      .from(CAMPAIGN_CUSTOMERS_TABLE)
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_deleted', 'n');

    if (status) {
      query = query.eq('call_status', status);
    }

    const { data: campaignCustomers, error: ccError } = await query;

    if (ccError) throw ccError;

    if (!campaignCustomers || campaignCustomers.length === 0) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    // Get customer details
    const customerIds = campaignCustomers.map((cc: any) => cc.customer_id);
    const { data: customersData, error: customersError } = await req.supabase
      .from(CUSTOMERS_TABLE)
      .select('id, name, phone, order_id, order_status, city, language')
      .in('id', customerIds)
      .eq('is_deleted', 'n');

    if (customersError) throw customersError;

    const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));

    // Merge data
    const result = campaignCustomers.map((cc: any) => ({
      ...cc,
      customer: customersMap.get(cc.customer_id) || null
    }));

    res.json({
      success: true,
      data: {
        list: result,
        total: result.length
      }
    });
  } catch (error: any) {
    console.error('Get campaign customers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
