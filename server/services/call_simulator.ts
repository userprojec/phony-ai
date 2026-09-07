/**
 * Call Simulator Service
 * Simulates the entire Twilio call flow without making actual calls
 * Allows testing of AI voice scripts, TwiML generation, and call flow logic
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SimulationCall {
  id: string;
  campaignId: number;
  customerId: number;
  phone: string;
  status: 'pending' | 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed';
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  twimlSent?: string;
  customerResponse?: string;
  outcome?: string;
  events: SimulationEvent[];
}

export interface SimulationEvent {
  timestamp: Date;
  type: 'call_initiated' | 'ringing' | 'answered' | 'twiml_sent' | 'gather_input' | 'completed' | 'failed' | 'no_answer' | 'say';
  message: string;
  details?: any;
}

export interface TwiMLPreview {
  campaignId: number;
  customerId: number;
  customerName: string;
  phone: string;
  greeting: string;
  voice: string;
  language: string;
  twiml: string;
  steps: TwiMLStep[];
}

export interface TwiMLStep {
  order: number;
  type: 'say' | 'pause' | 'gather' | 'hangup';
  description: string;
  content?: string;
  voice?: string;
  language?: string;
  duration?: number;
}

// Table names with session suffix
const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';
const VOICE_AGENTS_TABLE = 'voice_agents_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';

class CallSimulator {
  private activeSimulations: Map<string, SimulationCall> = new Map();

  /**
   * Generate TwiML preview for a campaign/customer combination
   * Shows exactly what will be sent to Twilio without making a call
   */
  async generateTwiMLPreview(supabase: SupabaseClient, campaignId: number, customerId: number): Promise<TwiMLPreview> {
    // Get campaign and voice agent
    const { data: campaign, error: campaignError } = await supabase
      .from(CAMPAIGNS_TABLE)
      .select('voice_agent_id, name')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign fetch error:', campaignError);
      throw new Error('Campaign not found');
    }

    const { data: voiceAgent, error: voiceError } = await supabase
      .from(VOICE_AGENTS_TABLE)
      .select('greeting_script, voice_type, language, company_name')
      .eq('id', campaign.voice_agent_id)
      .single();

    if (voiceError || !voiceAgent) {
      console.error('Voice agent fetch error:', voiceError);
      throw new Error('Voice agent not found');
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from(CUSTOMERS_TABLE)
      .select('name, phone, order_id, order_status')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('Customer fetch error:', customerError);
      throw new Error('Customer not found');
    }

    // Generate personalized greeting
    let greeting = voiceAgent.greeting_script || 'Hello, this is an automated call from our company.';
    greeting = greeting.replace(/\{name\}/g, customer.name || 'there');
    greeting = greeting.replace(/\{order_id\}/g, customer.order_id || '');
    greeting = greeting.replace(/\{order_status\}/g, customer.order_status || '');
    greeting = greeting.replace(/\{company_name\}/g, voiceAgent.company_name || 'our company');

    const voice = voiceAgent.voice_type === 'female' ? 'Polly.Joanna' : 'Polly.Matthew';
    const language = voiceAgent.language || 'en-US';

    // Build TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${this.escapeXml(greeting)}</Say>
  <Pause length="1"/>
  <Gather action="/webhooks/twilio/gather" method="POST" numDigits="1" timeout="10">
    <Say voice="${voice}" language="${language}">Press 1 if you received your order, or press 2 if you have not received it.</Say>
  </Gather>
  <Say voice="${voice}" language="${language}">We didn't receive any input. Goodbye.</Say>
  <Hangup/>
</Response>`;

    // Build step-by-step breakdown
    const steps: TwiMLStep[] = [
      {
        order: 1,
        type: 'say',
        description: 'AI greets the customer with personalized message',
        content: greeting,
        voice: voice,
        language: language
      },
      {
        order: 2,
        type: 'pause',
        description: 'Brief pause before asking for input',
        duration: 1
      },
      {
        order: 3,
        type: 'gather',
        description: 'AI asks customer to press 1 (received) or 2 (not received)',
        content: 'Press 1 if you received your order, or press 2 if you have not received it.',
        voice: voice,
        language: language
      },
      {
        order: 4,
        type: 'say',
        description: 'Fallback message if no input received',
        content: "We didn't receive any input. Goodbye.",
        voice: voice,
        language: language
      },
      {
        order: 5,
        type: 'hangup',
        description: 'Call ends'
      }
    ];

    return {
      campaignId,
      customerId,
      customerName: customer.name,
      phone: customer.phone,
      greeting,
      voice,
      language,
      twiml,
      steps
    };
  }

  /**
   * Start a simulated call
   * Mimics the entire call flow without contacting Twilio
   */
  async startSimulation(supabase: SupabaseClient, campaignId: number, customerId: number, options?: {
    autoAnswer?: boolean;
    customerResponse?: string;
    simulateDelay?: boolean;
  }): Promise<SimulationCall> {
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get customer phone
    const { data: customer, error: customerError } = await supabase
      .from(CUSTOMERS_TABLE)
      .select('phone, name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('Customer fetch error:', customerError);
      throw new Error('Customer not found');
    }

    const simulation: SimulationCall = {
      id: simulationId,
      campaignId,
      customerId,
      phone: customer.phone,
      status: 'pending',
      startedAt: new Date(),
      events: []
    };

    this.activeSimulations.set(simulationId, simulation);

    // Log initial event
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'call_initiated',
      message: `Simulated call initiated to ${customer.name} at ${customer.phone}`,
      details: { campaignId, customerId, phone: customer.phone }
    });

    // Get TwiML preview
    const twimlPreview = await this.generateTwiMLPreview(supabase, campaignId, customerId);
    simulation.twimlSent = twimlPreview.twiml;

    // Simulate call flow asynchronously
    this.simulateCallFlow(simulationId, options);

    return simulation;
  }

  /**
   * Simulate the call flow steps
   */
  private async simulateCallFlow(simulationId: string, options?: {
    autoAnswer?: boolean;
    customerResponse?: string;
    simulateDelay?: boolean;
  }) {
    const simulation = this.activeSimulations.get(simulationId);
    if (!simulation) return;

    const delay = options?.simulateDelay !== false;
    const wait = (ms: number) => delay ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();

    // Step 1: Initiated
    await wait(500);
    simulation.status = 'initiated';
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'call_initiated',
      message: 'Call status: initiated (Twilio would create the call now)',
      details: { status: 'initiated' }
    });

    // Step 2: Ringing
    await wait(2000);
    simulation.status = 'ringing';
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'ringing',
      message: 'Phone is ringing...',
      details: { status: 'ringing' }
    });

    // Step 3: Answered or No Answer
    if (options?.autoAnswer === false) {
      await wait(30000); // Wait for timeout
      simulation.status = 'failed';
      this.addEvent(simulationId, {
        timestamp: new Date(),
        type: 'no_answer',
        message: 'Call timed out - no answer',
        details: { status: 'failed', reason: 'no_answer' }
      });
      simulation.endedAt = new Date();
      return;
    }

    await wait(3000);
    simulation.status = 'answered';
    simulation.answeredAt = new Date();
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'answered',
      message: 'Customer answered the call!',
      details: { status: 'answered' }
    });

    // Step 4: Send TwiML
    await wait(500);
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'twiml_sent',
      message: 'TwiML sent to Twilio',
      details: { twiml: simulation.twimlSent }
    });

    // Step 5: Play greeting
    await wait(2000);
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'say',
      message: 'AI Voice: Playing greeting script...',
      details: { step: 'greeting' }
    });

    // Step 6: Ask for input
    await wait(1500);
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'gather_input',
      message: 'AI Voice: Asking for customer input (Press 1 or 2)...',
      details: { step: 'gather', timeout: 10 }
    });

    // Step 7: Customer response
    await wait(4000);
    const response = options?.customerResponse || '1';
    simulation.customerResponse = response;
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'gather_input',
      message: `Customer pressed: ${response}`,
      details: { digit: response }
    });

    // Step 8: Response based on input
    await wait(1000);
    if (response === '1') {
      simulation.outcome = 'confirmed';
      this.addEvent(simulationId, {
        timestamp: new Date(),
        type: 'say',
        message: 'AI Voice: "Thank you for confirming. Have a great day!"',
        details: { outcome: 'confirmed' }
      });
    } else if (response === '2') {
      simulation.outcome = 'issue_reported';
      this.addEvent(simulationId, {
        timestamp: new Date(),
        type: 'say',
        message: 'AI Voice: "We apologize for the inconvenience. Our team will contact you shortly..."',
        details: { outcome: 'issue_reported' }
      });
    } else {
      simulation.outcome = 'no_response';
      this.addEvent(simulationId, {
        timestamp: new Date(),
        type: 'say',
        message: 'AI Voice: "Thank you for your response. Goodbye."',
        details: { outcome: 'no_response' }
      });
    }

    // Step 9: Call ends
    await wait(1500);
    simulation.status = 'completed';
    simulation.endedAt = new Date();
    simulation.duration = Math.round((simulation.endedAt.getTime() - simulation.answeredAt!.getTime()) / 1000);
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'completed',
      message: `Call completed. Duration: ${simulation.duration}s, Outcome: ${simulation.outcome}`,
      details: { status: 'completed', duration: simulation.duration, outcome: simulation.outcome }
    });
  }

  /**
   * Get simulation status
   */
  getSimulation(simulationId: string): SimulationCall | undefined {
    return this.activeSimulations.get(simulationId);
  }

  /**
   * Get all active simulations
   */
  getActiveSimulations(): SimulationCall[] {
    return Array.from(this.activeSimulations.values());
  }

  /**
   * Simulate customer input during an active call
   */
  simulateCustomerInput(simulationId: string, digit: string): boolean {
    const simulation = this.activeSimulations.get(simulationId);
    if (!simulation || simulation.status !== 'answered') {
      return false;
    }

    simulation.customerResponse = digit;
    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'gather_input',
      message: `Customer input simulated: ${digit}`,
      details: { digit, manual: true }
    });

    return true;
  }

  /**
   * End simulation manually
   */
  endSimulation(simulationId: string): boolean {
    const simulation = this.activeSimulations.get(simulationId);
    if (!simulation) return false;

    simulation.status = 'completed';
    simulation.endedAt = new Date();
    if (simulation.answeredAt) {
      simulation.duration = Math.round((simulation.endedAt.getTime() - simulation.answeredAt.getTime()) / 1000);
    }

    this.addEvent(simulationId, {
      timestamp: new Date(),
      type: 'completed',
      message: 'Simulation ended manually',
      details: { reason: 'manual_end' }
    });

    return true;
  }

  /**
   * Add event to simulation log
   */
  private addEvent(simulationId: string, event: SimulationEvent) {
    const simulation = this.activeSimulations.get(simulationId);
    if (simulation) {
      simulation.events.push(event);
    }
  }

  /**
   * Clean up old simulations
   */
  cleanupOldSimulations(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, sim] of this.activeSimulations.entries()) {
      if (now - sim.startedAt.getTime() > maxAgeMs) {
        this.activeSimulations.delete(id);
        cleaned++;
      }
    }
    return cleaned;
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
export const callSimulator = new CallSimulator();
