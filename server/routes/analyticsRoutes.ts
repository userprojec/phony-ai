import { Router } from 'express';

const router: Router = Router();

const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';
const CALLS_TABLE = 'calls_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';

router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { start_date, end_date, campaign_id } = req.query;

    let campaignQuery = req.supabase
      .from(CAMPAIGNS_TABLE)
      .select('*')
      .eq('is_deleted', 'n');

    if (start_date) {
      campaignQuery = campaignQuery.gte('created_at', start_date);
    }
    if (end_date) {
      campaignQuery = campaignQuery.lte('created_at', end_date);
    }
    if (campaign_id) {
      campaignQuery = campaignQuery.eq('id', campaign_id);
    }

    const { data: campaigns, error: campaignError } = await campaignQuery;

    if (campaignError) throw campaignError;

    const campaignStats = await Promise.all(
      (campaigns || []).map(async (campaign: any) => {
        const { data: calls } = await req.supabase
          .from(CALLS_TABLE)
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('is_deleted', 'n');

        const totalCalls = calls?.length || 0;
        const completedCalls = calls?.filter((c: any) => c.status === 'completed').length || 0;
        const failedCalls = calls?.filter((c: any) => c.status === 'failed').length || 0;
        const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

        const totalDuration = calls?.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) || 0;
        const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;

        return {
          ...campaign,
          stats: {
            totalCalls,
            completedCalls,
            failedCalls,
            successRate,
            avgDuration
          }
        };
      })
    );

    res.json({ success: true, data: campaignStats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/trends', async (req: any, res: any) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const dates: string[] = [];

    for (let i = daysNum - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const trends = await Promise.all(
      dates.map(async (date) => {
        const startTime = `${date}T00:00:00`;
        const endTime = `${date}T23:59:59`;

        const { count: totalCalls } = await req.supabase
          .from(CALLS_TABLE)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startTime)
          .lte('created_at', endTime)
          .eq('is_deleted', 'n');

        const { count: completedCalls } = await req.supabase
          .from(CALLS_TABLE)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startTime)
          .lte('created_at', endTime)
          .eq('status', 'completed')
          .eq('is_deleted', 'n');

        return {
          date,
          total: totalCalls || 0,
          completed: completedCalls || 0,
          successRate: totalCalls && totalCalls > 0 ? Math.round(((completedCalls || 0) / totalCalls) * 100) : 0
        };
      })
    );

    res.json({ success: true, data: trends });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/languages', async (req: any, res: any) => {
  try {
    const { data: calls } = await req.supabase
      .from(CALLS_TABLE)
      .select(`
        *,
        customer:customer_id (language)
      `)
      .eq('is_deleted', 'n');

    const languageStats: Record<string, { total: number; completed: number }> = {};

    calls?.forEach((call: any) => {
      const lang = call.customer?.language || 'unknown';
      if (!languageStats[lang]) {
        languageStats[lang] = { total: 0, completed: 0 };
      }
      languageStats[lang].total++;
      if (call.status === 'completed') {
        languageStats[lang].completed++;
      }
    });

    const result = Object.entries(languageStats).map(([language, stats]) => ({
      language,
      total: stats.total,
      completed: stats.completed,
      successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
