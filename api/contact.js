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

    // Get the notification email from environment variable
    const notifyEmail = process.env.CONTACT_FORM_EMAIL || 'info@divineexecutive.com';

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

    // If Resend API key is configured, send email
    if (process.env.RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Divine Executive Chauffeurs <onboarding@resend.dev>',
          to: notifyEmail,
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
        console.error('Email send failed:', await emailResponse.text());
      }
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
