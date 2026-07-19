const crypto = require('crypto');
const OtpLog = require('../models/OtpLog');
const { getAuthConfig } = require('../config/env');

const OTP_EXPIRY_MINUTES = 10;
/**
 * Sends per identifier per hour.
 *
 * Every successful password login sends one, so a cap of 5 was low enough to
 * lock a legitimate user out of their own account: two logins plus a few
 * "Resend OTP" clicks exhausted it and every subsequent login returned 429 for
 * up to an hour despite correct credentials. 12 still bounds SMS/email cost and
 * bombing abuse while leaving normal use comfortable.
 */
const MAX_OTP_PER_HOUR = 12;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Cryptographically secure OTP generation.
 *
 * The previous implementation used `Math.floor(100000 + Math.random() * 900000)`.
 * Math.random() is a non-cryptographic PRNG (V8 uses xorshift128+) whose internal
 * state can be recovered from a modest number of observed outputs — so an
 * attacker able to trigger a few OTPs for their own account could predict codes
 * issued to other users. crypto.randomInt draws from the OS CSPRNG.
 */
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

/**
 * Codes are hashed at rest so a database read does not yield live OTPs.
 * A keyed HMAC is used rather than bare SHA-256: the plaintext space is only
 * 10^6, which a precomputed table trivially inverts. Falls back to the access
 * secret when no dedicated pepper is configured.
 */
const getOtpPepper = () => process.env.OTP_PEPPER || getAuthConfig().accessSecret;
const hashOtp = (otp) =>
  crypto.createHmac('sha256', getOtpPepper()).update(String(otp)).digest('hex');

/** Constant-time comparison so verification latency cannot leak the code. */
const safeEqualHex = (a, b) => {
  const bufferA = Buffer.from(String(a), 'hex');
  const bufferB = Buffer.from(String(b), 'hex');
  if (bufferA.length !== bufferB.length || bufferA.length === 0) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

const checkRateLimit = async (identifier) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await OtpLog.countDocuments({
    identifier,
    createdAt: { $gte: oneHourAgo },
    // Deliveries that failed (SMTP down, provider error) never reached the user,
    // so counting them against their budget would penalise them for our outage.
    status: { $ne: 'failed' },
  });
  return count < MAX_OTP_PER_HOUR;
};

/**
 * Records a failed guess against every live code for this identifier and expires
 * any that exhaust the attempt budget.
 */
const registerFailedAttempt = async (identifier, purpose) => {
  const query = {
    identifier,
    status: 'sent',
    ...(purpose ? { purpose } : {}),
    expiresAt: { $gt: new Date() },
  };

  await OtpLog.updateMany(query, { $inc: { attempts: 1 } });
  await OtpLog.updateMany(
    { ...query, attempts: { $gte: MAX_VERIFY_ATTEMPTS } },
    { status: 'expired' }
  );
};

const sendViaTwilioVerify = async (phone, channel = 'sms') => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error('Twilio Verify credentials not configured');
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
  const params = new URLSearchParams({ To: phone, Channel: channel });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Twilio Verify send failed');
  }

  return response.json();
};

const checkViaTwilioVerify = async (phone, code) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error('Twilio Verify credentials not configured');
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`;
  const params = new URLSearchParams({ To: phone, Code: code });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();
  return data.status === 'approved';
};

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
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio SMS error: ${error}`);
  }

  return response.json();
};

const sendViaMsg91 = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error('MSG91 credentials not configured');
  }

  const response = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: authKey },
    body: JSON.stringify({ template_id: templateId, mobile: phone.replace(/[^0-9]/g, ''), otp }),
  });

  if (!response.ok) {
    throw new Error(`MSG91 error: ${await response.text()}`);
  }

  return response.json();
};

const getProvider = () => (process.env.OTP_PROVIDER || 'twilio_verify').toLowerCase();

exports.sendOtp = async ({ identifier, type = 'sms', purpose = 'verify', ipAddress, userAgent }) => {
  const allowed = await checkRateLimit(identifier);
  if (!allowed) throw new Error('Too many OTP requests. Please try again after some time.');

  const provider = getProvider();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    if (type === 'email') {
      const otp = generateOtp();
      const sendEmail = require('../utils/sendEmail');

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
        `,
      });

      await OtpLog.create({
        identifier,
        otp: hashOtp(otp),
        type: 'email',
        status: 'sent',
        provider: 'nodemailer',
        purpose,
        ipAddress,
        userAgent,
        expiresAt,
      });
    } else if (provider === 'twilio_verify') {
      const channel = type === 'whatsapp' ? 'whatsapp' : 'sms';
      await sendViaTwilioVerify(identifier, channel);
      await OtpLog.create({
        identifier,
        otp: 'twilio_managed',
        type,
        status: 'sent',
        provider: 'twilio_verify',
        purpose,
        ipAddress,
        userAgent,
        expiresAt,
      });
    } else if (provider === 'msg91') {
      const otp = generateOtp();
      await sendViaMsg91(identifier, otp);
      await OtpLog.create({
        identifier,
        otp: hashOtp(otp),
        type,
        status: 'sent',
        provider: 'msg91',
        purpose,
        ipAddress,
        userAgent,
        expiresAt,
      });
    } else {
      const otp = generateOtp();
      await sendViaTwilioSms(identifier, otp, type);
      await OtpLog.create({
        identifier,
        otp: hashOtp(otp),
        type,
        status: 'sent',
        provider: 'twilio',
        purpose,
        ipAddress,
        userAgent,
        expiresAt,
      });
    }

    return { success: true, message: `OTP sent via ${type}`, expiresAt };
  } catch (error) {
    await OtpLog.create({
      identifier,
      otp: 'failed',
      type,
      status: 'failed',
      provider,
      purpose,
      ipAddress,
      userAgent,
      expiresAt,
    }).catch(() => {});

    throw error;
  }
};

/**
 * Verifies a submitted OTP.
 *
 * Every failure path returns the same generic message so the response cannot be
 * used to distinguish "wrong code" from "expired" from "no code was ever sent"
 * (which would otherwise be an account-enumeration oracle).
 */
exports.verifyOtp = async (identifier, code, purpose) => {
  const failure = { success: false, message: 'Invalid or expired OTP' };
  const normalizedCode = String(code || '').trim();
  if (!/^\d{6}$/.test(normalizedCode)) return failure;

  const hashedCode = hashOtp(normalizedCode);

  const consume = async (record) => {
    record.status = 'verified';
    record.verifiedAt = new Date();
    await record.save();

    // Invalidate every other outstanding code for this identifier so a
    // previously issued code cannot be replayed after a successful login.
    await OtpLog.updateMany(
      { identifier, status: 'sent', _id: { $ne: record._id } },
      { status: 'expired' }
    );

    return { success: true, message: 'OTP verified successfully' };
  };

  // Locally generated codes (email via nodemailer, or SMS via msg91/twilio SMS)
  // are stored hashed. Load the newest live candidate and compare in constant
  // time, rather than querying by hash, so we can enforce an attempt budget.
  const candidates = await OtpLog.find({
    identifier,
    status: 'sent',
    provider: { $ne: 'twilio_verify' },
    ...(purpose ? { purpose } : {}),
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_VERIFY_ATTEMPTS },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_OTP_PER_HOUR);

  const matched = candidates.find((record) => safeEqualHex(record.otp, hashedCode));
  if (matched) return consume(matched);

  const provider = getProvider();

  if (provider === 'twilio_verify') {
    // Twilio Verify holds the code itself; it enforces its own attempt limits.
    const pending = await OtpLog.findOne({
      identifier,
      provider: 'twilio_verify',
      status: 'sent',
      ...(purpose ? { purpose } : {}),
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_VERIFY_ATTEMPTS },
    }).sort({ createdAt: -1 });

    if (!pending) {
      await registerFailedAttempt(identifier, purpose);
      return failure;
    }

    const approved = await checkViaTwilioVerify(identifier, normalizedCode);
    if (!approved) {
      await registerFailedAttempt(identifier, purpose);
      return failure;
    }

    return consume(pending);
  }

  await registerFailedAttempt(identifier, purpose);
  return failure;
};

exports.MAX_VERIFY_ATTEMPTS = MAX_VERIFY_ATTEMPTS;
exports.OTP_EXPIRY_MINUTES = OTP_EXPIRY_MINUTES;
