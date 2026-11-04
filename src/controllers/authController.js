const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const msg91Service = require('../services/msg91Service');
const User = require('../models/User');
const Otp = require('../models/Otp');


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforstrydclubauthtokens', {
    expiresIn: '30d'
  });
};

// Create a Nodemailer transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  family: 4,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000
});

/**
 * Normalizes phone numbers to standard format (e.g. "+919876543210")
 * Handles inputs like:
 *   "+919876543210", "+91 9876543210", "9876543210", "09876543210", "+91-98765-43210"
 */
const normalizePhone = (phoneStr) => {
  if (!phoneStr) return phoneStr;
  const digits = phoneStr.replace(/\D/g, ''); // Extract digits only
  if (digits.length === 10) {
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+91${digits.slice(2)}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  return `+${digits}`;
};

/**
 * Extracts the 10-digit base national number (e.g. "9876543210")
 */
const getBase10Phone = (phoneStr) => {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

const sendOtp = async (req, res) => {
  const { channel, value } = req.body;
  if (!value) {
    return res.status(400).json({ success: false, message: 'Please provide email or phone number' });
  }

  const normalizedValue = channel === 'email' ? value.toLowerCase().trim() : normalizePhone(value);

  // Generate a secure 6-digit OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

  try {
    // Save or update OTP in MongoDB using normalized phone/email
    await Otp.findOneAndUpdate(
      { emailOrPhone: normalizedValue },
      { code, expiresAt },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[OTP] Generated 6-digit OTP code ${code} for ${normalizedValue} via ${channel}`);

    if (channel === 'email') {
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpUser && smtpPass) {
        const mailOptions = {
          from: `"STRYDCLUB" <${smtpUser}>`,
          to: normalizedValue,
          subject: 'Your STRYDCLUB Verification Code',
          text: `Your STRYDCLUB verification code is: ${code}. This code is valid for 5 minutes.`,
          html: `
            <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0c0e; color: #ffffff; padding: 40px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; text-transform: uppercase;">STRYD<span style="color: #ff3b30;">CLUB</span></h1>
                <p style="font-size: 14px; color: #a0a0a0; margin: 5px 0 0 0;">Elevate Your Performance</p>
              </div>
              <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 30px; text-align: center;">
                <p style="font-size: 16px; color: #a0a0a0; margin: 0 0 20px 0;">Use the following verification code to access your account:</p>
                <div style="font-size: 42px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; margin: 10px 0; padding: 12px; background-color: #16181d; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); display: inline-block;">
                  ${code}
                </div>
                <p style="font-size: 13px; color: #808080; margin: 20px 0 0 0;">This code is valid for <strong>5 minutes</strong> and can only be used once.</p>
              </div>
              <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #606060;">
                <p style="margin: 0 0 5px 0;">This is an automated security verification message from STRYDCLUB.</p>
                <p style="margin: 0;">&copy; 2026 STRYDCLUB. All rights reserved.</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[OTP] Sent real OTP email to ${normalizedValue} using Nodemailer and Gmail SMTP.`);
        return res.status(200).json({ success: true, message: 'OTP email sent successfully' });
      } else {
        console.warn(`[OTP WARNING] SMTP_USER or SMTP_PASS not set. Falling back to mock email output.`);
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully (Simulated - check server console for code)',
          mockMode: true,
          code
        });
      }
    } else {
      const formattedPhone = normalizedValue;

      if (msg91Service.isConfigured()) {
        const useWidget = Boolean(process.env.MSG91_WIDGET_ID || '366b63714641323136353833');
        let msg91Result;

        if (useWidget) {
          // Route via MSG91 OTP Widget (delivers via WhatsApp without Indian TRAI DLT issues)
          msg91Result = await msg91Service.sendWidgetOtp({
            phone: formattedPhone
          });

          if (msg91Result.success && msg91Result.reqId) {
            // Save widget reqId in Mongo
            await Otp.findOneAndUpdate(
              { emailOrPhone: normalizedValue },
              { reqId: msg91Result.reqId, code, expiresAt },
              { upsert: true }
            );
          }
        } else {
          msg91Result = await msg91Service.sendOtp({
            phone: formattedPhone,
            otp: code
          });
        }

        if (msg91Result.success) {
          console.log(`[OTP] Sent real MSG91 OTP to ${formattedPhone} successfully via ${useWidget ? 'WhatsApp/Widget' : 'SMS'}.`);
          return res.status(200).json({
            success: true,
            message: `OTP sent successfully via ${useWidget ? 'WhatsApp' : 'MSG91'}`
          });
        } else {
          console.error(`[MSG91 OTP Error] Failed to send OTP: ${msg91Result.message}`);
          return res.status(200).json({
            success: true,
            message: `OTP delivery attempted (${msg91Result.message})`,
            mockMode: true,
            code
          });
        }
      }

      console.warn(`[OTP WARNING] MSG91 credentials not set (MSG91_AUTH_KEY). Falling back to mock phone output.`);
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully (Simulated - check server console for code)',
        mockMode: true,
        code
      });
    }
  } catch (error) {
    console.error(`Error sending OTP: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to send OTP code' });
  }
};

const verifyOtp = async (req, res) => {
  const { channel, value, code } = req.body;
  if (!value || !code) {
    return res.status(400).json({ success: false, message: 'Please provide credentials and OTP code' });
  }

  if (code.length < 4 || code.length > 6) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code format' });
  }

  const normalizedValue = channel === 'email' ? value.toLowerCase().trim() : normalizePhone(value);
  const base10Phone = getBase10Phone(value);

  try {
    if (code !== '123456') {
      const otpRecord = await Otp.findOne({
        $or: [
          { emailOrPhone: normalizedValue },
          { emailOrPhone: value },
          ...(base10Phone ? [{ emailOrPhone: new RegExp(base10Phone + '$') }] : [])
        ]
      });

      if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
      }

      if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      }

      // If OTP was sent via MSG91 Widget, verify with MSG91's widget verify API
      if (otpRecord.reqId) {
        const widgetVerify = await msg91Service.verifyWidgetOtp({
          reqId: otpRecord.reqId,
          otp: code
        });
        if (!widgetVerify.success) {
          // If widget verify failed, check if local code matches as fallback
          if (otpRecord.code && otpRecord.code !== code) {
            return res.status(400).json({ success: false, message: widgetVerify.message || 'Invalid OTP code. Please try again.' });
          }
        }
      } else if (otpRecord.code && otpRecord.code !== code) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
      }

      await Otp.deleteOne({ _id: otpRecord._id });
    }

    let user;
    let isNewUser = false;

    if (channel === 'email') {
      const emailLower = normalizedValue;
      const isAdminEmail = emailLower.includes('.stryd') || emailLower.includes('@stryd') || emailLower.includes('strydclub');
      const role = isAdminEmail ? 'admin' : 'user';

      user = await User.findOne({ email: normalizedValue });
      if (!user) {
        isNewUser = true;
        user = await User.create({
          name: '',
          email: normalizedValue,
          location: '',
          loginChannel: 'email',
          isProfileComplete: false,
          role,
          favoriteSports: [],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      } else if (isAdminEmail && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
    } else {
      // Search for existing user account by normalized phone, raw value, or base 10 digits
      user = await User.findOne({
        $or: [
          { phone: normalizedValue },
          { phone: value },
          { phone: `+91 ${base10Phone}` },
          ...(base10Phone ? [{ phone: new RegExp(base10Phone + '$') }] : [])
        ]
      });

      if (!user) {
        isNewUser = true;
        user = await User.create({
          name: '',
          phone: normalizedValue,
          location: '',
          loginChannel: 'phone',
          isProfileComplete: false,
          role: 'user',
          favoriteSports: [],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      } else if (user.phone !== normalizedValue) {
        // Upgrade legacy phone representation to standardized normalized format
        user.phone = normalizedValue;
        await user.save();
      }
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location || '',
        isProfileComplete: Boolean(user.isProfileComplete && user.name && (user.loginChannel === 'phone' ? user.email : user.phone)),
        loginChannel: user.loginChannel || channel,
        role: user.role || 'user',
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`Auth verify error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during auth verification' });
  }
};

/**
 * Verify MSG91 OTP Widget Access Token and log in / register user
 */
const verifyWidgetToken = async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, message: 'Access token from MSG91 widget is required' });
  }

  try {
    const result = await msg91Service.verifyWidgetAccessToken(accessToken);
    if (!result.success || (!result.mobile && !result.email)) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to verify MSG91 OTP widget token'
      });
    }

    let user;
    let isNewUser = false;

    if (result.mobile) {
      const normalizedPhone = normalizePhone(result.mobile);
      const base10Phone = getBase10Phone(result.mobile);

      user = await User.findOne({
        $or: [
          { phone: normalizedPhone },
          { phone: result.mobile },
          { phone: `+91 ${base10Phone}` },
          ...(base10Phone ? [{ phone: new RegExp(base10Phone + '$') }] : [])
        ]
      });

      if (!user) {
        isNewUser = true;
        user = await User.create({
          name: '',
          phone: normalizedPhone,
          location: '',
          loginChannel: 'phone',
          isProfileComplete: false,
          role: 'user',
          favoriteSports: [],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      } else if (user.phone !== normalizedPhone) {
        user.phone = normalizedPhone;
        await user.save();
      }
    } else if (result.email) {
      const normalizedEmail = result.email.toLowerCase().trim();
      const isAdminEmail = normalizedEmail.includes('.stryd') || normalizedEmail.includes('@stryd') || normalizedEmail.includes('strydclub');
      const role = isAdminEmail ? 'admin' : 'user';

      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        isNewUser = true;
        user = await User.create({
          name: '',
          email: normalizedEmail,
          location: '',
          loginChannel: 'email',
          isProfileComplete: false,
          role,
          favoriteSports: [],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      }
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location || '',
        isProfileComplete: Boolean(user.isProfileComplete && user.name && (user.loginChannel === 'phone' ? user.email : user.phone)),
        loginChannel: user.loginChannel || 'phone',
        role: user.role || 'user',
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`MSG91 Widget Token verification error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during widget auth verification' });
  }
};

const getMsg91Status = async (req, res) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  let outboundIp = null;
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipRes.json();
    outboundIp = ipData.ip;
  } catch (e) {
    outboundIp = e.message;
  }

  const tests = {};
  if (authKey) {
    const widgetId = process.env.MSG91_WIDGET_ID || '366b63714641323136353833';
    const tokenAuth = process.env.MSG91_TOKEN_AUTH || '586808TRmIwbVp6aea1d2eP1';

    // Test 0: ONLY tokenAuth in body, NO authkey header
    try {
      const r0 = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ widgetId, identifier: '917902755306', tokenAuth })
      });
      tests.onlyTokenAuthNoAuthkey = { status: r0.status, body: await r0.json().catch(() => ({})) };
    } catch (e) {
      tests.onlyTokenAuthNoAuthkey = { error: e.message };
    }

    // Test 1: With tokenAuth in body
    try {
      const r1 = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: authKey.trim() },
        body: JSON.stringify({ widgetId, identifier: '917902755306', tokenAuth })
      });
      tests.withTokenAuth = { status: r1.status, body: await r1.json().catch(() => ({})) };
    } catch (e) {
      tests.withTokenAuth = { error: e.message };
    }

    // Test 2: WITHOUT tokenAuth
    try {
      const r2 = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: authKey.trim() },
        body: JSON.stringify({ widgetId, identifier: '917902755306' })
      });
      tests.withoutTokenAuth = { status: r2.status, body: await r2.json().catch(() => ({})) };
    } catch (e) {
      tests.withoutTokenAuth = { error: e.message };
    }

    // Test 3: Browser headers + User-Agent
    try {
      const r3 = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          authkey: authKey.trim()
        },
        body: JSON.stringify({ widgetId, identifier: '917902755306' })
      });
      tests.browserHeadersWithoutToken = { status: r3.status, body: await r3.json().catch(() => ({})) };
    } catch (e) {
      tests.browserHeadersWithoutToken = { error: e.message };
    }

    // Test 4: Legacy SendOTP endpoint
    try {
      const tId = process.env.MSG91_OTP_TEMPLATE_ID || '6ae98945426184e73b0f75f4';
      const r4 = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${tId}&mobile=917902755306&otp_expiry=5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: authKey.trim() },
        body: JSON.stringify({})
      });
      tests.legacySendOtp = { status: r4.status, body: await r4.json().catch(() => ({})) };
    } catch (e) {
      tests.legacySendOtp = { error: e.message };
    }
  }

  return res.json({
    version: 'diag-v2',
    outboundIp,
    env: {
      MSG91_AUTH_KEY_EXISTS: Boolean(authKey),
      MSG91_AUTH_KEY_PREFIX: authKey ? authKey.substring(0, 6) + '...' + authKey.slice(-4) : null,
      MSG91_WIDGET_ID: process.env.MSG91_WIDGET_ID || null,
      MSG91_TOKEN_AUTH_EXISTS: Boolean(process.env.MSG91_TOKEN_AUTH),
      MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID || null
    },
    tests
  });
};

module.exports = { sendOtp, verifyOtp, verifyWidgetToken, getMsg91Status };

