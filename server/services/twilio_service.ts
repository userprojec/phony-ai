import twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface CallOptions {
  to: string;
  from: string;
  url: string;  // TwiML URL for the call flow
  statusCallback?: string;
  statusCallbackEvent?: string[];
  machineDetection?: 'Enable' | 'DetectMessageEnd';
}

export interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private config: TwilioConfig | null = null;

  initialize(config: TwilioConfig): void {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  isInitialized(): boolean {
    return this.client !== null && this.config !== null;
  }

  async makeCall(options: CallOptions): Promise<CallResult> {
    console.log('[DEBUG] Entered twilioService.makeCall()');
    console.log('[DEBUG] Call options:', JSON.stringify(options, null, 2));
    
    if (!this.client) {
      console.log('[DEBUG] ERROR: Twilio client not initialized');
      return { success: false, error: 'Twilio client not initialized' };
    }
    console.log('[DEBUG] Twilio client exists');

    try {
      // Validate phone numbers
      console.log('[DEBUG] Validating phone numbers...');
      if (!options.to.startsWith('+')) {
        console.log('[DEBUG] ERROR: Invalid to number format:', options.to);
        return { 
          success: false, 
          error: `Invalid 'to' phone number format. Must be E.164 format (e.g., +1234567890). Got: ${options.to}` 
        };
      }

      if (!options.from.startsWith('+')) {
        console.log('[DEBUG] ERROR: Invalid from number format:', options.from);
        return { 
          success: false, 
          error: `Invalid 'from' phone number format. Must be E.164 format (e.g., +1234567890). Got: ${options.from}` 
        };
      }
      console.log('[DEBUG] Phone numbers validated');

      console.log('[DEBUG] About to execute this.client.calls.create()...');
      console.log('[DEBUG] Twilio API params:', {
        to: options.to,
        from: options.from,
        url: options.url,
        statusCallback: options.statusCallback,
        statusCallbackEvent: options.statusCallbackEvent || ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        machineDetection: options.machineDetection || undefined,
        trim: 'trim-silence',
      });

      const call = await this.client.calls.create({
        to: options.to,
        from: options.from,
        url: options.url,
        statusCallback: options.statusCallback,
        statusCallbackEvent: options.statusCallbackEvent || ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        machineDetection: options.machineDetection || undefined,
        trim: 'trim-silence',
      });

      console.log('[DEBUG] Twilio API call SUCCESS! Call SID:', call.sid);
      console.log('[DEBUG] Full Twilio response:', JSON.stringify({
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to
      }, null, 2));

      return {
        success: true,
        callSid: call.sid,
      };
    } catch (error: any) {
      console.error('[DEBUG] Twilio call EXCEPTION:', error);
      console.error('[DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
      };
    }
  }

  async getCallStatus(callSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
        priceUnit: call.priceUnit,
      };
    } catch (error: any) {
      console.error('Error fetching call status:', error);
      throw error;
    }
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.client) {
      return { valid: false, error: 'Twilio client not initialized' };
    }

    try {
      // Try to fetch account info to validate credentials
      await this.client.api.accounts(this.config!.accountSid).fetch();
      return { valid: true };
    } catch (error: any) {
      console.error('Twilio credentials validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  generateTwiMLForVoiceAgent(voiceAgentConfig: {
    greeting: string;
    voice: 'man' | 'woman' | 'alice';
    language: string;
    gatherInput?: boolean;
  }): string {
    const { greeting, voice, language, gatherInput } = voiceAgentConfig;
    
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${this.escapeXml(greeting)}</Say>`;

    if (gatherInput) {
      twiml += `
  <Gather action="/webhooks/twilio/gather" method="POST" numDigits="1">
    <Say voice="${voice}" language="${language}">Press 1 to confirm, or 2 to speak with an agent.</Say>
  </Gather>`;
    }

    twiml += `
</Response>`;

    return twiml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Singleton instance
export const twilioService = new TwilioService();
