import { Router } from 'express';
import { callSimulator } from '../services/call_simulator.js';

const router: Router = Router();

/**
 * GET /api/simulation/twiml-preview/:campaignId/:customerId
 * Preview the TwiML that would be sent for a specific campaign/customer
 */
router.get('/twiml-preview/:campaignId/:customerId', async (req: any, res: any) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const customerId = parseInt(req.params.customerId, 10);

    if (isNaN(campaignId) || isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaignId or customerId'
      });
    }

    const preview = await callSimulator.generateTwiMLPreview(req.supabase, campaignId, customerId);

    res.json({
      success: true,
      data: preview
    });
  } catch (error: any) {
    console.error('TwiML preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate TwiML preview'
    });
  }
});

/**
 * POST /api/simulation/start
 * Start a simulated call
 */
router.post('/start', async (req: any, res: any) => {
  try {
    const { campaignId, customerId, options } = req.body;

    if (!campaignId || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and customerId are required'
      });
    }

    const simulation = await callSimulator.startSimulation(
      req.supabase,
      parseInt(campaignId, 10),
      parseInt(customerId, 10),
      options || {}
    );

    res.json({
      success: true,
      data: {
        simulationId: simulation.id,
        status: simulation.status,
        phone: simulation.phone,
        startedAt: simulation.startedAt
      }
    });
  } catch (error: any) {
    console.error('Simulation start error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start simulation'
    });
  }
});

/**
 * GET /api/simulation/:simulationId
 * Get simulation status and events
 */
router.get('/:simulationId', async (req: any, res: any) => {
  try {
    const { simulationId } = req.params;
    const simulation = callSimulator.getSimulation(simulationId);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: simulation.id,
        campaignId: simulation.campaignId,
        customerId: simulation.customerId,
        phone: simulation.phone,
        status: simulation.status,
        startedAt: simulation.startedAt,
        answeredAt: simulation.answeredAt,
        endedAt: simulation.endedAt,
        duration: simulation.duration,
        customerResponse: simulation.customerResponse,
        outcome: simulation.outcome,
        events: simulation.events
      }
    });
  } catch (error: any) {
    console.error('Simulation get error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get simulation'
    });
  }
});

/**
 * GET /api/simulation/active
 * Get all active simulations
 */
router.get('/active', async (req: any, res: any) => {
  try {
    const simulations = callSimulator.getActiveSimulations();

    res.json({
      success: true,
      data: simulations.map(sim => ({
        id: sim.id,
        campaignId: sim.campaignId,
        customerId: sim.customerId,
        phone: sim.phone,
        status: sim.status,
        startedAt: sim.startedAt,
        duration: sim.duration,
        outcome: sim.outcome
      }))
    });
  } catch (error: any) {
    console.error('Active simulations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active simulations'
    });
  }
});

/**
 * POST /api/simulation/:simulationId/input
 * Simulate customer input during an active call
 */
router.post('/:simulationId/input', async (req: any, res: any) => {
  try {
    const { simulationId } = req.params;
    const { digit } = req.body;

    if (!digit || !['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'].includes(digit)) {
      return res.status(400).json({
        success: false,
        error: 'Valid digit (0-9, *, #) is required'
      });
    }

    const success = callSimulator.simulateCustomerInput(simulationId, digit);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Simulation not found or not in answered state'
      });
    }

    res.json({
      success: true,
      data: { message: `Input ${digit} simulated` }
    });
  } catch (error: any) {
    console.error('Simulation input error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to simulate input'
    });
  }
});

/**
 * POST /api/simulation/:simulationId/end
 * End a simulation manually
 */
router.post('/:simulationId/end', async (req: any, res: any) => {
  try {
    const { simulationId } = req.params;
    const success = callSimulator.endSimulation(simulationId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'Simulation ended' }
    });
  } catch (error: any) {
    console.error('Simulation end error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end simulation'
    });
  }
});

/**
 * POST /api/simulation/cleanup
 * Clean up old simulations
 */
router.post('/cleanup', async (req: any, res: any) => {
  try {
    const maxAgeMs = req.body.maxAgeMs || 3600000; // Default 1 hour
    const cleaned = callSimulator.cleanupOldSimulations(maxAgeMs);

    res.json({
      success: true,
      data: { cleaned }
    });
  } catch (error: any) {
    console.error('Simulation cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cleanup simulations'
    });
  }
});

export default router;
