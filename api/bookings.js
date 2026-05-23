export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ bookings: [], warning: 'Supabase not configured — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?select=*&order=created_at.desc&limit=200`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('Supabase fetch failed:', body);
      return res.status(200).json({ bookings: [], warning: 'Could not load bookings from Supabase.' });
    }

    const records = await response.json();
    const bookings = records.map(r => ({
      id: r.id,
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      service: r.service || '',
      date: r.date || '',
      time: r.time || '',
      pickup: r.pickup || '',
      dropoff: r.dropoff || '',
      notes: r.notes || '',
      status: (r.status || 'pending').toLowerCase(),
      created: r.created_at
    }));

    return res.status(200).json({ bookings });
  } catch (err) {
    console.error('Bookings API error:', err);
    return res.status(500).json({ error: 'Failed to load bookings' });
  }
}
