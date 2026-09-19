const ContactMessage = require('../models/ContactMessage');
const nodemailer = require('nodemailer');

const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all fields (Name, Email, Subject, Message).'
      });
    }

    // Save message in MongoDB
    const newMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    });

    console.log(`[Contact Message Saved] ID: ${newMessage._id}, From: ${name} (${email})`);

    // Optional email notification if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const mailOptions = {
          from: `"Strydclub Contact Form" <${process.env.SMTP_USER}>`,
          to: process.env.SMTP_USER || 'strydclub@gmail.com',
          replyTo: email,
          subject: `[Contact Form] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #6366f1; margin-top: 0;">New Contact Message Received</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p><strong>Message:</strong></p>
              <blockquote style="background: #f9f9f9; padding: 15px; border-left: 4px solid #6366f1; margin: 0;">
                ${message.replace(/\n/g, '<br>')}
              </blockquote>
              <p style="font-size: 0.85rem; color: #888; margin-top: 25px;">Submitted via Strydclub Contact Page.</p>
            </div>
          `
        };

        transporter.sendMail(mailOptions).catch(err => {
          console.error(`[Contact Email Warning] ${err.message}`);
        });
      } catch (smtpErr) {
        console.warn(`[SMTP Warning] ${smtpErr.message}`);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Thank you for reaching out! We've received your message and will get back to you shortly.",
      contactId: newMessage._id
    });
  } catch (error) {
    console.error(`Contact Submission Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while sending message. Please try again later.'
    });
  }
};

const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error(`Get Contact Messages Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error fetching contact messages.' });
  }
};

module.exports = {
  submitContactMessage,
  getContactMessages
};
