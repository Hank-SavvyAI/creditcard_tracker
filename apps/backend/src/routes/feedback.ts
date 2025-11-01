import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Submit feedback (public, no auth required)
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email service is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Email credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send email to admin
    const mailOptions = {
      from: `"Credit Card Tracker Feedback" <${process.env.EMAIL_USER}>`,
      to: process.env.FEEDBACK_EMAIL || process.env.EMAIL_USER,
      replyTo: email,
      subject: `💬 New Feedback from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">💬 New Feedback Received</h2>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          </div>

          <div style="background: white; padding: 20px; border: 2px solid #667eea; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
            <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #6B7280; font-size: 14px;">
            Received at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
          </p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);

    // Send confirmation email to user
    const confirmationOptions = {
      from: `"Credit Card Tracker" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thank you for your feedback!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">✅ Thank you for your feedback!</h2>

          <p style="font-size: 16px; line-height: 1.6;">
            Hi ${name},
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for reaching out to us. We've received your message and will get back to you as soon as possible.
          </p>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Your message:</strong></p>
            <p style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #666;">${message}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">
            Best regards,<br/>
            Credit Card Tracker Team
          </p>

          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            This is an automated confirmation email. Please do not reply directly to this email.
          </p>
        </div>
      `,
    };

    await emailTransporter.sendMail(confirmationOptions);

    console.log(`✅ Feedback received from ${name} (${email})`);

    res.json({
      success: true,
      message: 'Feedback sent successfully. Thank you!'
    });
  } catch (error) {
    console.error('Failed to send feedback:', error);
    res.status(500).json({ error: 'Failed to send feedback. Please try again later.' });
  }
});

export default router;
