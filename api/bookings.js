export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const airtableKey = process.env.AIRTABLE_API_KEY;
  const airtableBase = process.env.AIRTABLE_BASE_ID;

  if (!airtableKey || !airtableBase) {
    return res.status(200).json({ bookings: [], warning: 'Airtable not configured' });
  }

  try {
    const url = `https://api.airtable.com/v0/${airtableBase}/Bookings?sort[0][field]=Created&sort[0][direction]=desc&maxRecords=200`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${airtableKey}` }
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Airtable fetch failed:', body);
      return res.status(200).json({ bookings: [], warning: 'Could not load from Airtable' });
    }

    const data = await response.json();
    const bookings = (data.records || []).map(r => ({
      id: r.id,
      name: r.fields.Name || '',
      email: r.fields.Email || '',
      phone: r.fields.Phone || '',
      service: r.fields.Service || '',
      date: r.fields.Date || '',
      time: r.fields.Time || '',
      pickup: r.fields.Pickup || '',
      dropoff: r.fields.Dropoff || '',
      notes: r.fields.Notes || '',
      status: (r.fields.Status || 'pending').toLowerCase(),
      created: r.fields.Created || r.createdTime
    }));

    return res.status(200).json({ bookings });
  } catch (err) {
    console.error('Bookings API error:', err);
    return res.status(500).json({ error: 'Failed to load bookings' });
  }
}
