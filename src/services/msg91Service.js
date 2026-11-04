/**
 * MSG91 Service Module
 * Handles SMS, WhatsApp, OTP, and Flow notifications via MSG91 REST APIs.
 */

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  // Prefer IPv4 for outbound requests so IP matches user's whitelisted IPv4 address
  dns.setDefaultResultOrder('ipv4first');
}

const formatMobileForMsg91 = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // Prepend India country code for 10-digit numbers
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
};

const isConfigured = () => {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_AUTH_KEY.trim());
};

/**
 * Sends OTP via MSG91 SendOTP API
 * @param {Object} params
 * @param {string} params.phone - Target mobile number (10 digits or with country code)
 * @param {string} [params.otp] - Optional custom OTP code (if omitted, MSG91 generates one)
 * @param {string} [params.templateId] - MSG91 OTP Template ID
 * @param {number} [params.otpExpiry=5] - Expiry in minutes
 */
const sendOtp = async ({ phone, otp, templateId, otpExpiry = 5 }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const tId = templateId || process.env.MSG91_OTP_TEMPLATE_ID;
  const mobile = formatMobileForMsg91(phone);

  if (!authKey) {
    return {
      success: false,
      message: 'MSG91_AUTH_KEY is not set in environment variables'
    };
  }

  if (!tId) {
    return {
      success: false,
      message: 'MSG91_OTP_TEMPLATE_ID is not configured in environment variables'
    };
  }

  if (!mobile) {
    return {
      success: false,
      message: 'Invalid mobile number provided'
    };
  }

  try {
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.append('template_id', tId);
    url.searchParams.append('mobile', mobile);
    url.searchParams.append('otp_expiry', String(otpExpiry));
    if (otp) {
      url.searchParams.append('otp', String(otp));
    }

    // In MSG91 SendOTP API, parameters are sent via query string.
    // The JSON body is strictly reserved for custom template variables (if any).
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey.trim()
      },
      body: JSON.stringify({})
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && (data.type === 'success' || data.status === 'success' || !data.type)) {
      console.log(`[MSG91 OTP Success] Sent to ${mobile}:`, data.message || 'OTP triggered');
      return {
        success: true,
        data,
        message: data.message || 'OTP sent successfully'
      };
    } else {
      console.error(`[MSG91 OTP Error] Response from MSG91:`, data);
      return {
        success: false,
        message: data.message || `MSG91 error status: ${response.status}`,
        data
      };
    }
  } catch (error) {
    console.error(`[MSG91 Network Error] Exception while calling MSG91 OTP:`, error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Retry OTP via Voice or Text
 * @param {Object} params
 * @param {string} params.phone
 * @param {'text'|'voice'} [params.retryType='text']
 */
const retryOtp = async ({ phone, retryType = 'text' }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = formatMobileForMsg91(phone);

  if (!authKey) {
    return { success: false, message: 'MSG91_AUTH_KEY not set' };
  }

  try {
    const url = new URL('https://control.msg91.com/api/v5/otp/retry');
    url.searchParams.append('authkey', authKey.trim());
    url.searchParams.append('mobile', mobile);
    url.searchParams.append('retrytype', retryType);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        authkey: authKey.trim()
      }
    });

    const data = await response.json().catch(() => ({}));
    return {
      success: response.ok && data.type !== 'error',
      message: data.message || (response.ok ? 'Retry triggered' : 'Failed to retry OTP'),
      data
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Send Transactional / Event Notifications via MSG91 Flow API
 * Flow can deliver via SMS, WhatsApp, Email, or multi-channel failover as configured in MSG91 dashboard.
 * @param {Object} params
 * @param {string} params.templateId - MSG91 Flow Template ID
 * @param {Array<Object>} params.recipients - Array of recipient objects with mobile and dynamic template variables
 */
const sendFlow = async ({ templateId, recipients = [] }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const tId = templateId || process.env.MSG91_REGISTRATION_FLOW_ID || process.env.MSG91_FLOW_ID;

  if (!authKey) {
    return { success: false, message: 'MSG91_AUTH_KEY not set' };
  }

  if (!tId) {
    return { success: false, message: 'MSG91 Flow template ID not provided' };
  }

  // Format mobiles in each recipient
  const formattedRecipients = recipients.map((r) => ({
    ...r,
    mobiles: formatMobileForMsg91(r.mobiles || r.mobile || r.phone)
  }));

  try {
    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey.trim()
      },
      body: JSON.stringify({
        template_id: tId,
        short_url: '0',
        recipients: formattedRecipients
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.type !== 'error') {
      console.log(`[MSG91 Flow Success] Flow triggered for template ${tId}`);
      return {
        success: true,
        message: data.message || 'Flow sent successfully',
        data
      };
    } else {
      console.error(`[MSG91 Flow Error]:`, data);
      return {
        success: false,
        message: data.message || `Flow delivery failed (${response.status})`,
        data
      };
    }
  } catch (error) {
    console.error(`[MSG91 Flow Network Error]:`, error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Verify access token returned by MSG91 OTP Widget
 * @param {string} accessToken - JWT access token string from widget success callback
 */
const verifyWidgetAccessToken = async (accessToken) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    return { success: false, message: 'MSG91_AUTH_KEY is not set in environment variables' };
  }
  if (!accessToken) {
    return { success: false, message: 'Access token is required' };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
    const payload = {
      authkey: authKey.trim(),
      'access-token': accessToken
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        authkey: authKey.trim()
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (data.type === 'error' || data.status === 'error') {
      console.error('[MSG91 Widget Verify Error]:', data);
      return {
        success: false,
        message: data.message || 'Invalid or expired OTP widget token',
        data
      };
    }

    // MSG91 returns verified details in data or message
    const mobile =
      data?.data?.mobile ||
      data?.mobile ||
      data?.identifier ||
      (typeof data?.message === 'string' && data.message.match(/\d{10,}/) ? data.message.match(/\d{10,}/)[0] : null);

    const email = data?.data?.email || data?.email || null;

    return {
      success: true,
      mobile,
      email,
      message: data.message || 'Token verified successfully',
      data
    };
  } catch (error) {
    console.error('[MSG91 Widget Network Error]:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Send OTP using MSG91 OTP Widget API (routes through WhatsApp / Voice / shared channels)
 * @param {Object} params
 * @param {string} params.phone - Mobile number
 */
const sendWidgetOtp = async ({ phone }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID || '366b63714641323136353833';
  const tokenAuth = process.env.MSG91_TOKEN_AUTH || '586808TRmIwbVp6aea1d2eP1';
  const mobile = formatMobileForMsg91(phone);

  if (!authKey) {
    return { success: false, message: 'MSG91_AUTH_KEY is not set' };
  }

  const url = 'https://control.msg91.com/api/v5/widget/sendOtp';
  const attempts = [
    // Attempt 1: Without tokenAuth (bypasses tokenAuth IP throttle while using valid Authkey)
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        authkey: authKey.trim()
      },
      body: { widgetId, identifier: mobile }
    },
    // Attempt 2: With tokenAuth if attempt 1 fails
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        authkey: authKey.trim()
      },
      body: { widgetId, identifier: mobile, tokenAuth }
    }
  ];

  let lastError = null;
  for (const att of attempts) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: att.headers,
        body: JSON.stringify(att.body)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.type === 'success') {
        console.log(`[MSG91 Widget OTP Success] Sent to ${mobile}, reqId: ${data.message}`);
        return {
          success: true,
          reqId: data.message,
          message: 'OTP sent successfully via MSG91 WhatsApp/Widget'
        };
      } else {
        lastError = data.message || `HTTP ${response.status}`;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  return {
    success: false,
    message: lastError || 'Failed to send OTP via widget'
  };
};

/**
 * Verify OTP entered by user using MSG91 Widget Verify API
 * @param {Object} params
 * @param {string} params.reqId - Request ID returned from sendWidgetOtp
 * @param {string} params.otp - 4-6 digit OTP entered by user
 */
const verifyWidgetOtp = async ({ reqId, otp }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID || '366b63714641323136353833';

  if (!authKey) {
    return { success: false, message: 'MSG91_AUTH_KEY is not set' };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/widget/verifyOtp';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey.trim()
      },
      body: JSON.stringify({
        widgetId,
        reqId,
        otp: String(otp)
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.type === 'success') {
      return {
        success: true,
        message: 'OTP verified successfully',
        accessToken: data.message,
        data
      };
    } else {
      return {
        success: false,
        message: data.message || 'Invalid verification code',
        data
      };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  formatMobileForMsg91,
  isConfigured,
  sendOtp,
  retryOtp,
  sendFlow,
  sendWidgetOtp,
  verifyWidgetOtp,
  verifyWidgetAccessToken
};
