import { Router } from 'express';

const router: Router = Router();

const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';
const CALLS_TABLE = 'calls_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';

router.get('/', async (req: any, res: any) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const { count: totalCampaigns } = await req.supabase
      .from(CAMPAIGNS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', 'n');

    const { count: todayCallsCount } = await req.supabase
      .from(CALLS_TABLE)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .eq('is_deleted', 'n');

    const { count: completedCalls } = await req.supabase
      .from(CALLS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('is_deleted', 'n');

    const { count: totalCalls } = await req.supabase
      .from(CALLS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', 'n');

    const { data: avgDurationData } = await req.supabase
      .from(CALLS_TABLE)
      .select('duration')
      .eq('status', 'completed')
      .eq('is_deleted', 'n');

    const avgDuration = avgDurationData && avgDurationData.length > 0
      ? Math.round(avgDurationData.reduce((sum: number, call: any) => sum + (call.duration || 0), 0) / avgDurationData.length)
      : 0;

    const successRate = totalCalls && totalCalls > 0
      ? Math.round(((completedCalls || 0) / totalCalls) * 100)
      : 0;

    const { data: activeCampaigns } = await req.supabase
      .from(CAMPAIGNS_TABLE)
      .select('*')
      .eq('status', 'running')
      .eq('is_deleted', 'n')
      .order('started_at', { ascending: false })
      .limit(5);

    const { data: recentCalls } = await req.supabase
      .from(CALLS_TABLE)
      .select(`
        *,
        customer:customer_id (name, phone),
        campaign:campaign_id (name)
      `)
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: allCampaigns } = await req.supabase
      .from(CAMPAIGNS_TABLE)
      .select('status')
      .eq('is_deleted', 'n');

    const campaignStatusDistribution = (allCampaigns || []).reduce((acc: { name: string; value: number }[], c: any) => {
      const status = c.status || 'draft';
      const existing = acc.find((item) => item.name === status);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: status, value: 1 });
      }
      return acc;
    }, []);

    // Generate daily stats for the last 7 days
    const dailyStats: { date: string; calls: number; success: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = `${dateStr}T00:00:00`;
      const dayEnd = `${dateStr}T23:59:59`;

      const { count: dayCalls } = await req.supabase
        .from(CALLS_TABLE)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .eq('is_deleted', 'n');

      const { count: daySuccess } = await req.supabase
        .from(CALLS_TABLE)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .eq('status', 'completed')
        .eq('is_deleted', 'n');

      dailyStats.push({
        date: dateStr,
        calls: dayCalls || 0,
        success: daySuccess || 0,
      });
    }

    res.json({
      success: true,
      data: {
        totalCampaigns: totalCampaigns || 0,
        todayCalls: todayCallsCount || 0,
        successRate,
        avgDuration,
        activeCampaigns: activeCampaigns || [],
        recentCampaigns: activeCampaigns || [],
        recentCalls: recentCalls || [],
        dailyStats,
        campaignStatusDistribution
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const { start_date, end_date } = req.query;

    let query = req.supabase
      .from(CALLS_TABLE)
      .select('*')
      .eq('is_deleted', 'n');

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: calls } = await query;

    const stats = {
      total: calls?.length || 0,
      byStatus: {} as Record<string, number>,
      byOutcome: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>
    };

    calls?.forEach((call: any) => {
      stats.byStatus[call.status] = (stats.byStatus[call.status] || 0) + 1;
      if (call.outcome) {
        stats.byOutcome[call.outcome] = (stats.byOutcome[call.outcome] || 0) + 1;
      }
    });

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
