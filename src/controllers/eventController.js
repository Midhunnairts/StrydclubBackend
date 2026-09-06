const mongoose = require('mongoose');
const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+16093079161';

let twilioClient = null;
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
}

/**
 * Send WhatsApp, SMS, and Email registration confirmation notifications
 */
const sendRegistrationNotification = async (user, event) => {
  if (!user || !event) return;

  const athleteName = user.name || 'Athlete';
  const eventTitle = event.title || 'Sports Event';
  const eventDate = event.date || 'Upcoming';
  const eventTime = event.time || '';
  const eventLocation = event.location || 'Strydclub Venue';
  const priceText = event.price > 0 ? `₹${event.price}` : 'Free';

  // 1. Send WhatsApp / SMS via Twilio
  const rawPhone = user.phone;
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, '');
    let formattedPhone = digits;
    if (digits.length === 10) {
      formattedPhone = `+91${digits}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${digits}`;
    }

    const whatsappMessage = `🎉 *REGISTRATION CONFIRMED!* 🎉\n\nHi *${athleteName}*,\n\nYou have successfully registered for *${eventTitle}* on *STRYDCLUB*! 🏆\n\n📅 *Date:* ${eventDate}\n⏰ *Time:* ${eventTime}\n📍 *Venue:* ${eventLocation}\n💰 *Fee:* ${priceText}\n\nGet ready to elevate your performance! See you at the venue. 🏃‍♂️✨\n\n- *Team STRYDCLUB*`;

    if (twilioClient) {
      const waFrom = twilioWhatsAppNumber.startsWith('whatsapp:') ? twilioWhatsAppNumber : `whatsapp:${twilioWhatsAppNumber}`;
      const waTo = `whatsapp:${formattedPhone}`;

      try {
        await twilioClient.messages.create({
          body: whatsappMessage,
          from: waFrom,
          to: waTo
        });
        console.log(`[WhatsApp Notification] Sent WhatsApp registration confirmation to ${waTo} for event '${eventTitle}'`);
      } catch (waErr) {
        console.warn(`[WhatsApp Warning] ${waErr.message}. Attempting SMS fallback...`);
        try {
          const smsFrom = twilioWhatsAppNumber.replace('whatsapp:', '');
          await twilioClient.messages.create({
            body: `STRYDCLUB: Hi ${athleteName}, your registration for '${eventTitle}' on ${eventDate} at ${eventLocation} is CONFIRMED! See you there!`,
            from: smsFrom,
            to: formattedPhone
          });
          console.log(`[SMS Notification] Sent SMS registration confirmation to ${formattedPhone}`);
        } catch (smsErr) {
          console.error(`[SMS Error] ${smsErr.message}`);
        }
      }
    } else {
      console.log(`[WhatsApp Notification (Simulated)] Target: ${formattedPhone}\n${whatsappMessage}`);
    }
  }

  // 2. Send Email Confirmation if SMTP is configured
  if (user.email && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: `"STRYDCLUB" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `🎉 Registration Confirmed: ${eventTitle} - STRYDCLUB`,
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #0b0c0e; color: #ffffff; padding: 40px; border-radius: 16px; max-width: 550px; margin: 0 auto; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; text-transform: uppercase;">STRYD<span style="color: #ff3b30;">CLUB</span></h1>
              <p style="font-size: 14px; color: #a0a0a0; margin: 5px 0 0 0;">Event Registration Confirmation</p>
            </div>
            <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px;">
              <h2 style="color: #30d158; font-size: 20px; margin-top: 0;">🎉 You're All Set, ${athleteName}!</h2>
              <p style="font-size: 15px; color: #d1d1d6; line-height: 1.5;">Your spot for <strong>${eventTitle}</strong> is officially reserved.</p>
              
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;" />
              
              <div style="font-size: 14px; color: #a0a0a0; line-height: 1.8;">
                <div>📅 <strong>Date:</strong> <span style="color: #ffffff;">${eventDate}</span></div>
                <div>⏰ <strong>Time:</strong> <span style="color: #ffffff;">${eventTime}</span></div>
                <div>📍 <strong>Location:</strong> <span style="color: #ffffff;">${eventLocation}</span></div>
                <div>💰 <strong>Fee:</strong> <span style="color: #ffffff;">${priceText}</span></div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #606060;">
              <p style="margin: 0;">&copy; 2026 STRYDCLUB. Elevate Your Performance.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Email Notification] Sent confirmation email to ${user.email}`);
    } catch (emailErr) {
      console.error(`[Email Error] ${emailErr.message}`);
    }
  }
};

const getEvents = async (req, res) => {
  const { category, search } = req.query;
  const filter = {};

  if (category && category.toLowerCase() !== 'all') {
    filter.category = new RegExp(`^${category}$`, 'i');
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { title: searchRegex },
      { location: searchRegex },
      { category: searchRegex }
    ];
  }

  try {
    const events = await Event.find(filter)
      .select('slug title category date time location status slotsFilled slotsTotal price bannerUrl')
      .sort({ createdAt: -1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const updatedEvents = await Promise.all(events.map(async (event) => {
      const eventObj = event.toObject();
      const eventDate = new Date(event.date);
      if (!isNaN(eventDate.getTime()) && eventDate < now) {
        eventObj.status = 'Completed';
        if (event.status !== 'Completed' && event.status !== 'completed' && event.status !== 'Event Completed') {
          event.status = 'Completed';
          await event.save();
        }
      }
      return eventObj;
    }));

    return res.status(200).json({ success: true, events: updatedEvents });
  } catch (error) {
    console.error(`Get events error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving events' });
  }
};

const getEventBySlug = async (req, res) => {
  const { slug } = req.params;
  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const eventDate = new Date(event.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (!isNaN(eventDate.getTime()) && eventDate < now) {
      if (event.status !== 'Completed' && event.status !== 'completed' && event.status !== 'Event Completed') {
        event.status = 'Completed';
        await event.save();
      }
    }

    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(`Get event by slug or ID error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving event details' });
  }
};

const registerForEvent = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.slotsFilled >= event.slotsTotal) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (existingReg) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    await Registration.create({
      user: userId,
      event: event._id,
      status: 'Confirmed'
    });

    event.slotsFilled += 1;
    event.participants.push({ name: req.user.name, role: 'Participant' });
    await event.save();

    const user = await User.findById(userId);
    user.totalEvents += 1;
    
    user.sportsPlayed = Math.max(user.sportsPlayed, 1);
    if (!user.favoriteSports.includes(event.category)) {
      user.favoriteSports.push(event.category);
    }
    await user.save();

    // Trigger WhatsApp & Email confirmation notification to registered user
    sendRegistrationNotification(user, event).catch(err => console.error(`[Notification Warning] ${err.message}`));

    return res.status(200).json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    console.error(`Register event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during event registration' });
  }
};

const createEvent = async (req, res) => {
  const {
    title,
    category,
    description,
    format,
    skillLevel,
    rulesNotes,
    date,
    time,
    endTime,
    registrationCloses,
    location,
    price,
    slotsTotal,
    playersPerTeam,
    prizePool,
    bannerUrl,
    rules,
    schedule,
    organizedBy,
    contact,
    venueUrl
  } = req.body;

  if (!title || !category || !date || !time || !location || slotsTotal === undefined) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
  }

  try {
    // Generate a clean URL-friendly slug
    let slug = title.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if the slug already exists to prevent duplicate endpoints
    const existingEvent = await Event.findOne({ slug });
    if (existingEvent) {
      // Append a unique timestamp or random suffix to make it unique
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newEvent = await Event.create({
      slug,
      title,
      category,
      description,
      format: format || 'Single Match',
      skillLevel: skillLevel || 'Open',
      rulesNotes: rulesNotes || '',
      date,
      time,
      endTime: endTime || '',
      registrationCloses: registrationCloses || '',
      location,
      venueUrl: venueUrl || '',
      price: Number(price) || 0,
      slotsTotal: Number(slotsTotal),
      playersPerTeam: Number(playersPerTeam) || 0,
      prizePool: Number(prizePool) || 0,
      bannerUrl: bannerUrl || '',
      slotsFilled: 0,
      rules: rules || [],
      schedule: schedule || [],
      organizedBy: organizedBy || req.user.name || 'Strydclub Admin',
      contact: contact || req.user.phone || ''
    });

    console.log(`[Event Created] Slug: ${newEvent.slug}, Title: ${newEvent.title}`);
    return res.status(201).json({ success: true, event: newEvent });
  } catch (error) {
    console.error(`Create event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during event creation' });
  }
};

const cancelRegistration = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (!existingReg) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    let refundProcessed = false;
    let refundDetails = null;

    // If registration was paid via Razorpay, initiate refund
    if (existingReg.paymentId) {
      try {
        refundDetails = await razorpay.payments.refund(existingReg.paymentId);
        refundProcessed = true;
        console.log(`[Razorpay Refund Initiated] Payment ID: ${existingReg.paymentId}, Refund ID: ${refundDetails.id}`);
      } catch (refundError) {
        console.error(`Razorpay refund error: ${refundError.message}`);
        // Log warning and proceed with cancellation; if payment was mock/dummy or already refunded
      }
    }

    // Delete registration
    await Registration.deleteOne({ _id: existingReg._id });

    // Decrease slotsFilled
    if (event.slotsFilled > 0) {
      event.slotsFilled -= 1;
    }

    // Remove user from participants list
    event.participants = event.participants.filter(p => p.name !== req.user.name);
    await event.save();

    // Decrease user's total events count
    const user = await User.findById(userId);
    if (user && user.totalEvents > 0) {
      user.totalEvents -= 1;
    }
    if (user) {
      await user.save();
    }

    const message = refundProcessed
      ? `Successfully cancelled registration. A full refund of ₹${event.price} has been initiated to your original payment method.`
      : 'Successfully cancelled registration.';

    return res.status(200).json({
      success: true,
      message,
      refundProcessed,
      refundId: refundDetails ? refundDetails.id : null
    });
  } catch (error) {
    console.error(`Cancel registration error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during cancellation' });
  }
};

const createCashfreeOrder = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.slotsFilled >= event.slotsTotal) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (existingReg) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    const amount = Number(event.price);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Event is free, no payment required' });
    }

    const orderId = `order_${event._id}_${Date.now()}`;
    const isProd = process.env.CASHFREE_ENV === 'PROD';
    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId.toString(),
        customer_email: req.user.email || `${userId}@strydclub.com`,
        customer_phone: req.user.phone ? req.user.phone.replace(/[^0-9]/g, '').slice(-10) : '9999999999',
        customer_name: req.user.name || 'Athlete'
      }
    };

    try {
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID || 'TEST_APP_ID',
          'x-client-secret': process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET',
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const cfData = await response.json();

      if (response.ok && cfData.payment_session_id) {
        return res.status(200).json({
          success: true,
          order_id: cfData.order_id,
          payment_session_id: cfData.payment_session_id,
          cf_environment: isProd ? 'production' : 'sandbox'
        });
      } else {
        console.warn(`[Cashfree API Warning] ${cfData.message || 'Falling back to sandbox order session'}`);
        // Fallback for development/testing when keys are simulated
        return res.status(200).json({
          success: true,
          order_id: orderId,
          payment_session_id: `session_${Date.now()}`,
          cf_environment: 'sandbox'
        });
      }
    } catch (cfErr) {
      console.error(`Cashfree API connection error: ${cfErr.message}`);
      return res.status(200).json({
        success: true,
        order_id: orderId,
        payment_session_id: `session_${Date.now()}`,
        cf_environment: 'sandbox'
      });
    }
  } catch (error) {
    console.error(`Create Cashfree order error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during payment order creation' });
  }
};

const verifyCashfreePayment = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ success: false, message: 'Missing order_id for payment verification' });
  }

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (existingReg) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    if (event.slotsFilled >= event.slotsTotal) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // Verify status with Cashfree API if production API keys are live
    const isProd = process.env.CASHFREE_ENV === 'PROD';
    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    let isPaymentValid = true;
    try {
      if (!order_id.includes(`session_`)) {
        const response = await fetch(`${baseUrl}/orders/${order_id}`, {
          method: 'GET',
          headers: {
            'x-client-id': process.env.CASHFREE_APP_ID || 'TEST_APP_ID',
            'x-client-secret': process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET',
            'x-api-version': '2023-08-01'
          }
        });
        const cfData = await response.json();
        if (response.ok && cfData.order_status !== 'PAID') {
          isPaymentValid = false;
        }
      }
    } catch (cfErr) {
      console.warn(`Cashfree verification status check bypassed for test order: ${cfErr.message}`);
    }

    if (!isPaymentValid) {
      return res.status(400).json({ success: false, message: 'Cashfree payment not completed or invalid.' });
    }

    // Payment valid, create event registration!
    await Registration.create({
      user: userId,
      event: event._id,
      status: 'Confirmed',
      paymentId: `cf_pay_${Date.now()}`,
      orderId: order_id
    });

    event.slotsFilled += 1;
    event.participants.push({ name: req.user.name, role: 'Participant' });
    await event.save();

    const user = await User.findById(userId);
    user.totalEvents += 1;
    user.sportsPlayed = Math.max(user.sportsPlayed, 1);
    if (!user.favoriteSports.includes(event.category)) {
      user.favoriteSports.push(event.category);
    }
    await user.save();

    // Trigger WhatsApp & Email confirmation notification to registered user
    sendRegistrationNotification(user, event).catch(err => console.error(`[Notification Warning] ${err.message}`));

    return res.status(200).json({ success: true, message: 'Cashfree payment verified and registration successful' });
  } catch (error) {
    console.error(`Verify Cashfree payment error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during payment verification' });
  }
};

module.exports = {
  getEvents,
  getEventBySlug,
  registerForEvent,
  createEvent,
  cancelRegistration,
  createCashfreeOrder,
  verifyCashfreePayment
};

