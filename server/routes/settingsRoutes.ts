import { Router } from 'express';
import { twilioService } from '../services/twilio_service.js';

const router: Router = Router();
const SETTINGS_TABLE = 'settings_s_622aa944_0';

// Get settings by category
router.get('/:category', async (req: any, res: any) => {
  try {
    const { category } = req.params;
    const { data, error } = await req.supabase
      .from(SETTINGS_TABLE)
      .select('settings')
      .eq('category', category)
      .eq('is_deleted', 'n')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: data?.settings || {}
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save settings for a category
router.post('/:category', async (req: any, res: any) => {
  try {
    const { category } = req.params;
    const { settings } = req.body;
    const { corp_id, emp_id } = req.user;

    // Check if settings already exist
    const { data: existing } = await req.supabase
      .from(SETTINGS_TABLE)
      .select('id')
      .eq('category', category)
      .eq('is_deleted', 'n')
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await req.supabase
        .from(SETTINGS_TABLE)
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await req.supabase
        .from(SETTINGS_TABLE)
        .insert({
          corp_id,
          emp_id,
          category,
          settings
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Twilio connection
router.post('/test-twilio', async (req: any, res: any) => {
  try {
    const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = req.body;
    
    // Basic validation
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Twilio credentials'
      });
    }

    // Validate Account SID format
    if (!twilioAccountSid.startsWith('AC')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account SID format. It should start with "AC"'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(twilioPhoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
      });
    }

    // In production, you would actually test the connection here
    // by making an API call to Twilio's API
    res.json({
      success: true,
      data: {
        message: 'Connection test successful (simulated)',
        note: 'In production, this would validate credentials with Twilio API'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get telephony settings (for outbound calls)
router.get('/telephony/active', async (req: any, res: any) => {
  try {
    const { data, error } = await req.supabase
      .from(SETTINGS_TABLE)
      .select('settings')
      .eq('category', 'telephony')
      .eq('is_deleted', 'n')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const settings = data?.settings || {};
    
    // Return only the necessary fields for outbound calls
    const activeConfig = {
      provider: settings.provider || 'twilio',
      callerId: settings.callerId || settings.twilioPhoneNumber,
      twilioPhoneNumber: settings.twilioPhoneNumber,
      // Note: We don't return sensitive credentials in this endpoint
      // They should be retrieved server-side when making actual calls
    };

    res.json({
      success: true,
      data: activeConfig
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
