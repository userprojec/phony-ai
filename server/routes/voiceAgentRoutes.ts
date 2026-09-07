import { Router } from 'express';

const router: Router = Router();

const TABLE_NAME = 'voice_agents_s_622aa944_0';

router.get('/', async (req: any, res: any) => {
  try {
    const { is_active, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let query = req.supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
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
      .select('*')
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Voice agent not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const {
      name,
      voice_type,
      voice_accent,
      language,
      greeting_script,
      main_script,
      faq_responses,
      company_name
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Voice agent name is required' });
    }

    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .insert({
        name,
        voice_type,
        voice_accent,
        language,
        greeting_script,
        main_script,
        faq_responses: faq_responses || {},
        company_name,
        corp_id: req.user?.corpId,
        emp_id: req.user?.empId
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
    if (!data) return res.status(404).json({ success: false, error: 'Voice agent not found' });

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

router.post('/:id/activate', async (req: any, res: any) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update({ is_active: true })
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Voice agent not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/deactivate', async (req: any, res: any) => {
  try {
    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('is_deleted', 'n')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Voice agent not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
