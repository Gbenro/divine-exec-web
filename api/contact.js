export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, service, message } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Route to workspace mailbox first, then legacy key, then business default.
    const notifyEmail =
      process.env.DIVINE_EXEC_WORKSPACE_EMAIL ||
      process.env.CONTACT_FORM_EMAIL ||
      'info@divineexec.com';
    const fromEmail = process.env.CONTACT_FORM_FROM_EMAIL || 'Divine Executive Chauffeurs <info@divineexec.com>';

    // For now, log the submission (in production, integrate with email service)
    console.log('Contact form submission:', {
      timestamp: new Date().toISOString(),
      name,
      email,
      phone: phone || 'Not provided',
      service: service || 'Not specified',
      message: message || 'No message',
      notifyEmail
    });

    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY: cannot deliver contact form email');
    }

    if (process.env.RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: notifyEmail,
          reply_to: email,
          subject: `New Inquiry: ${service || 'General'} - ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Service:</strong> ${service || 'Not specified'}</p>
            <p><strong>Message:</strong></p>
            <p>${message || 'No message'}</p>
            <hr>
            <p><em>Submitted at ${new Date().toLocaleString()}</em></p>
          `
        })
      });
      if (!emailResponse.ok) {
        const bodyText = await emailResponse.text();
        console.error('Email send failed:', bodyText);
      }
    }

    // Save to Supabase if this is a booking submission
    if (service && service.startsWith('Booking') && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const bookingFields = parseBookingFields(message);
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || '',
          service: service.replace('Booking — ', ''),
          date: bookingFields.date,
          time: bookingFields.time,
          pickup: bookingFields.pickup,
          dropoff: bookingFields.dropoff,
          notes: bookingFields.notes,
          status: 'pending'
        })
      }).catch(err => console.error('Supabase write failed:', err));
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for your inquiry! We will contact you shortly.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to process submission' });
  }
}

function parseBookingFields(message) {
  if (!message) return { date: '', time: '', pickup: '', dropoff: '', notes: '' };
  const get = (label) => {
    const match = message.match(new RegExp(label + ':\\s*(.+)'));
    return match ? match[1].trim() : '';
  };
  return {
    date: get('Date'),
    time: get('Time'),
    pickup: get('Pickup'),
    dropoff: get('Drop-off'),
    notes: get('Special requests')
  };
}
