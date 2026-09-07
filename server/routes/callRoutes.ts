import { Router } from 'express';

const router: Router = Router();

const TABLE_NAME = 'calls_s_622aa944_0';
const CUSTOMERS_TABLE = 'customers_s_622aa944_0';
const CAMPAIGNS_TABLE = 'campaigns_s_622aa944_0';

router.get('/', async (req: any, res: any) => {
  try {
    const { campaign_id, status, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let query = req.supabase
      .from(TABLE_NAME)
      .select(`
        *,
        customer:customer_id (id, name, phone, order_id),
        campaign:campaign_id (id, name)
      `, { count: 'exact' })
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: {
        list: data || [],
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
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .select(`
        *,
        customer:customer_id (*),
        campaign:campaign_id (*)
      `)
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Call not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const { campaign_id, customer_id, phone } = req.body;

    if (!campaign_id || !customer_id || !phone) {
      return res.status(400).json({
        success: false,
        error: 'campaign_id, customer_id, and phone are required'
      });
    }

    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .insert({
        campaign_id,
        customer_id,
        phone,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
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
    if (!data) return res.status(404).json({ success: false, error: 'Call not found' });

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

router.post('/:id/transcript', async (req: any, res: any) => {
  try {
    const { transcript, ai_summary, customer_sentiment } = req.body;

    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update({
        transcript,
        ai_summary,
        customer_sentiment,
        status: 'completed'
      })
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Call not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
