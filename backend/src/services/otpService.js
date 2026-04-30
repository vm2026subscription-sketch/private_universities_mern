const crypto = require('crypto');
const OtpLog = require('../models/OtpLog');

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_PER_HOUR = 5;

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const checkRateLimit = async (identifier) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await OtpLog.countDocuments({
    identifier,
    createdAt: { $gte: oneHourAgo }
  });
  return count < MAX_OTP_PER_HOUR;
};

// ── Twilio Verify Service (recommended — uses your VAf... SID) ──────

const sendViaTwilioVerify = async (phone, channel = 'sms') => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error('Twilio Verify credentials not configured');
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;

  const params = new URLSearchParams({ To: phone, Channel: channel }); // channel: sms or whatsapp

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Twilio Verify send failed');
  }

  return await response.json();
};

const checkViaTwilioVerify = async (phone, code) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`;

  const params = new URLSearchParams({ To: phone, Code: code });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json();
  return data.status === 'approved';
};

// ── Raw Twilio SMS (fallback — if you have a phone number) ──────────

const sendViaTwilioSms = async (phone, otp, type) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const fromNumber = type === 'whatsapp'
    ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
    : process.env.TWILIO_PHONE_NUMBER;
  const toNumber = type === 'whatsapp' ? `whatsapp:${phone}` : phone;
  const body = `Your Vidyarthi Mitra verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;

  const params = new URLSearchParams({ From: fromNumber, To: toNumber, Body: body });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio SMS error: ${error}`);
  }
  return await response.json();
};

// ── MSG91 (alternative provider) ────────────────────────────────────

const sendViaMsg91 = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) throw new Error('MSG91 credentials not configured');

  const response = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'authkey': authKey },
    body: JSON.stringify({ template_id: templateId, mobile: phone.replace(/[^0-9]/g, ''), otp })
  });

  if (!response.ok) throw new Error(`MSG91 error: ${await response.text()}`);
  return await response.json();
};

// ── Main exports ────────────────────────────────────────────────────

const getProvider = () => (process.env.OTP_PROVIDER || 'twilio_verify').toLowerCase();

exports.sendOtp = async ({ identifier, type = 'sms', purpose = 'verify', ipAddress, userAgent }) => {
  const allowed = await checkRateLimit(identifier);
  if (!allowed) throw new Error('Too many OTP requests. Please try again after some time.');

  const provider = getProvider();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    if (type === 'email') {
      // Send OTP via email
      const otp = generateOtp();
      const sendEmail = require('./sendEmail');
      await sendEmail({
        to: identifier,
        subject: 'Vidyarthi Mitra - Verification Code',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:400px;margin:0 auto;padding:20px;">
            <h2 style="color:#6366f1;">Verification Code</h2>
            <p>Your code is:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;margin:20px 0;padding:16px;background:#f4f4f5;border-radius:12px;">${otp}</div>
            <p style="color:#888;font-size:13px;">Expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share.</p>
          </div>
        `
      });
      await OtpLog.create({ identifier, otp: hashOtp(otp), type: 'email', status: 'sent', provider: 'nodemailer', purpose, ipAddress, userAgent, expiresAt });
    } else if (provider === 'twilio_verify') {
      // Use Twilio Verify Service — OTP is managed by Twilio
      const channel = type === 'whatsapp' ? 'whatsapp' : 'sms';
      await sendViaTwilioVerify(identifier, channel);
      await OtpLog.create({ identifier, otp: 'twilio_managed', type, status: 'sent', provider: 'twilio_verify', purpose, ipAddress, userAgent, expiresAt });
    } else if (provider === 'msg91') {
      const otp = generateOtp();
      await sendViaMsg91(identifier, otp);
      await OtpLog.create({ identifier, otp: hashOtp(otp), type, status: 'sent', provider: 'msg91', purpose, ipAddress, userAgent, expiresAt });
    } else {
      // Raw Twilio SMS
      const otp = generateOtp();
      await sendViaTwilioSms(identifier, otp, type);
      await OtpLog.create({ identifier, otp: hashOtp(otp), type, status: 'sent', provider: 'twilio', purpose, ipAddress, userAgent, expiresAt });
    }

    return { success: true, message: `OTP sent via ${type}`, expiresAt };
  } catch (error) {
    await OtpLog.create({ identifier, otp: 'failed', type, status: 'failed', provider, purpose, ipAddress, userAgent, expiresAt }).catch(() => {});
    throw error;
  }
};

exports.verifyOtp = async (identifier, code) => {
  const provider = getProvider();

  if (provider === 'twilio_verify') {
    // Verify via Twilio Verify API
    const approved = await checkViaTwilioVerify(identifier, code);
    if (!approved) return { success: false, message: 'Invalid or expired OTP' };

    // Mark OTP log as verified
    await OtpLog.findOneAndUpdate(
      { identifier, provider: 'twilio_verify', status: 'sent' },
      { status: 'verified', verifiedAt: new Date() },
      { sort: { createdAt: -1 } }
    );

    return { success: true, message: 'OTP verified successfully' };
  }

  // For other providers — verify via our stored hash
  const hashedCode = hashOtp(code);
  const otpRecord = await OtpLog.findOne({
    identifier,
    otp: hashedCode,
    status: 'sent',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) return { success: false, message: 'Invalid or expired OTP' };

  otpRecord.status = 'verified';
  otpRecord.verifiedAt = new Date();
  await otpRecord.save();

  await OtpLog.updateMany(
    { identifier, status: 'sent', _id: { $ne: otpRecord._id } },
    { status: 'expired' }
  );

  return { success: true, message: 'OTP verified successfully' };
};
