import { Router } from 'express';

const router: Router = Router();

const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';
const CALLS_TABLE = 'calls_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';

// Get real-time monitoring data
router.get('/', async (req: any, res: any) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Get active campaigns (running or paused)
    const { data: activeCampaigns, error: campaignsError } = await req.supabase
      .from(CAMPAIGNS_TABLE)
      .select('*')
      .in('status', ['running', 'paused'])
      .eq('is_deleted', 'n');

    if (campaignsError) throw campaignsError;

    // Get today's calls
    const { data: todayCalls, error: callsError } = await req.supabase
      .from(CALLS_TABLE)
      .select('*')
      .gte('created_at', todayStr)
      .eq('is_deleted', 'n');

    if (callsError) throw callsError;

    // Get active/live calls (started but not ended)
    const { data: liveCalls } = await req.supabase
      .from(CALLS_TABLE)
      .select(`
        *,
        campaign:campaign_id (name),
        customer:customer_id (name, phone)
      `)
      .eq('is_deleted', 'n')
      .not('started_at', 'is', null)
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    // Calculate queue status
    const { count: waitingCount } = await req.supabase
      .from(CALLS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('is_deleted', 'n');

    const { count: inProgressCount } = await req.supabase
      .from(CALLS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .eq('is_deleted', 'n');

    const completedToday = todayCalls?.filter((c: any) => c.status === 'completed').length || 0;
    const failedToday = todayCalls?.filter((c: any) => c.status === 'failed').length || 0;

    // Format active campaigns with stats
    const campaignsWithStats = await Promise.all(
      (activeCampaigns || []).map(async (campaign: any) => {
        const { count: totalCustomers } = await req.supabase
          .from('campaign_customers_s_622aa944_0')
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
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          total_customers: totalCustomers || 0,
          completed_calls: completedCalls || 0,
          success_rate: successRate,
          calls_per_minute: campaign.calls_per_minute || 60
        };
      })
    );

    // Format live calls
    const formattedLiveCalls = (liveCalls || []).map((call: any) => ({
      id: call.id,
      campaign_id: call.campaign_id,
      campaign_name: call.campaign?.name || 'Unknown',
      customer_name: call.customer?.name || 'Unknown',
      phone: call.customer?.phone || call.phone,
      status: call.status === 'in_progress' ? 'speaking' : 'connected',
      duration: call.started_at 
        ? Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000)
        : 0,
      sentiment: call.customer_sentiment || 'neutral',
      started_at: call.started_at
    }));

    // Mock system stats (in production, these would come from system monitoring)
    const systemStats = {
      cpu_usage: Math.floor(Math.random() * 30) + 20, // 20-50%
      memory_usage: Math.floor(Math.random() * 20) + 40, // 40-60%
      active_connections: (liveCalls || []).length + Math.floor(Math.random() * 5),
      avg_response_time: Math.floor(Math.random() * 50) + 50 // 50-100ms
    };

    res.json({
      success: true,
      data: {
        live_calls: formattedLiveCalls,
        active_campaigns: campaignsWithStats,
        queue_status: {
          waiting: waitingCount || 0,
          in_progress: inProgressCount || 0,
          completed_today: completedToday,
          failed_today: failedToday
        },
        system_stats: systemStats
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
