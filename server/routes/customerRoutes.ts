import { Router } from 'express';

const router: Router = Router();

const TABLE_NAME = 'customers_s_622aa944_0';

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{8,}$/;
  return phoneRegex.test(phone);
}

/**
 * Normalize phone number to E.164 format
 * E.164 format: +[country code][national number]
 * Examples:
 *   "9779704011561" -> "+9779704011561"
 *   "+9779704011561" -> "+9779704011561" (unchanged)
 *   "555-123-4567" -> "+15551234567" (assumes US if no country code)
 */
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Already has + prefix, just return as is
  if (phone.trim().startsWith('+')) {
    return `+${digitsOnly}`;
  }
  
  // Check if it already looks like E.164 (starts with country code)
  // Country codes are 1-3 digits. Common patterns:
  // - 1 (US/Canada): 11 digits total
  // - 44 (UK): 10-11 digits
  // - 91 (India): 10-11 digits
  // - 977 (Nepal): 10-12 digits
  
  // If number starts with 1 and has 11 digits, it's likely US/Canada
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If number has 10 digits (US/Canada without country code), add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // For other cases, assume the digits already include country code
  // This handles cases like 9779704011561 (Nepal +977)
  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }
  
  // Fallback: return with + prefix
  return `+${digitsOnly}`;
}

function validateCustomer(customer: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!customer.name || customer.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!customer.phone || customer.phone.trim() === '') {
    errors.push('Phone number is required');
  } else if (!validatePhone(customer.phone)) {
    errors.push('Invalid phone number format');
  }

  if (!customer.order_id || customer.order_id.trim() === '') {
    errors.push('Order ID is required');
  }

  if (!customer.order_status || customer.order_status.trim() === '') {
    errors.push('Order status is required');
  }

  return { isValid: errors.length === 0, errors };
}

router.get('/', async (req: any, res: any) => {
  try {
    const { search, status, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let query = req.supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('is_deleted', 'n')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,order_id.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('validation_status', status);
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
    if (!data) return res.status(404).json({ success: false, error: 'Customer not found' });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const validation = validateCustomer(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors.join(', ') });
    }

    const { data, error } = await req.supabase
      .from(TABLE_NAME)
      .insert({
        ...req.body,
        validation_status: 'valid'
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
    if (!data) return res.status(404).json({ success: false, error: 'Customer not found' });

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

router.post('/import', async (req: any, res: any) => {
  try {
    const { customers } = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ success: false, error: 'No customers provided' });
    }

    // Normalize and validate phone numbers
    const normalizedCustomers = customers.map((customer: any) => ({
      ...customer,
      phone: normalizePhone(customer.phone)
    }));

    const phoneSet = new Set<string>();
    const duplicates: string[] = [];
    const validatedCustomers = normalizedCustomers.map((customer: any) => {
      const validation = validateCustomer(customer);
      const phone = customer.phone?.trim();

      if (phone && phoneSet.has(phone)) {
        duplicates.push(phone);
        validation.errors.push(`Duplicate phone number: ${phone}`);
      } else if (phone) {
        phoneSet.add(phone);
      }

      return {
        ...customer,
        validation_status: validation.isValid && duplicates.length === 0 ? 'valid' : 'invalid',
        validation_errors: validation.errors
      };
    });

    const validCustomers = validatedCustomers.filter(c => c.validation_status === 'valid');
    const invalidCustomers = validatedCustomers.filter(c => c.validation_status === 'invalid');

    let insertedCount = 0;
    if (validCustomers.length > 0) {
      const { data, error } = await req.supabase
        .from(TABLE_NAME)
        .insert(validCustomers.map(c => ({
          name: c.name,
          phone: c.phone,
          order_id: c.order_id,
          order_status: c.order_status,
          delivery_date: c.delivery_date,
          courier_name: c.courier_name,
          tracking_number: c.tracking_number,
          language: c.language || 'en',
          city: c.city,
          amount: c.amount,
          notes: c.notes,
          validation_status: 'valid',
          validation_errors: []
        })))
        .select();

      if (error) throw error;
      insertedCount = data?.length || 0;
    }

    res.json({
      success: true,
      data: {
        total: customers.length,
        valid: validCustomers.length,
        invalid: invalidCustomers.length,
        inserted: insertedCount,
        duplicates: duplicates.length,
        invalidDetails: invalidCustomers
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/validate', async (req: any, res: any) => {
  try {
    const { customers } = req.body;

    if (!Array.isArray(customers)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    const results = customers.map((customer: any) => {
      const validation = validateCustomer(customer);
      return {
        ...customer,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });

    res.json({
      success: true,
      data: {
        total: results.length,
        valid: results.filter(r => r.isValid).length,
        invalid: results.filter(r => !r.isValid).length,
        results
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
