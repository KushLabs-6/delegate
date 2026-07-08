import nodemailer from 'nodemailer';
import prisma from '../config/db.js';
import { messaging } from '../config/firebase.js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotifyUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

interface NotifyJob {
  id: string;
  title: string;
  location?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  businessId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatShiftTime = (job: NotifyJob): string => {
  if (!job.startTime) return 'TBD';
  const date = new Date(job.startTime).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
  const start = new Date(job.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const end = job.endTime
    ? new Date(job.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  return end ? `${date} · ${start} – ${end}` : `${date} · ${start}`;
};

// ─── In-App & Push Notification ────────────────────────────────────────────────
export const sendInAppNotification = async (
  userId: string,
  title: string,
  description: string,
  type: string = 'JOB_UPDATE',
  link?: string
) => {
  try {
    await prisma.notification.create({
      data: { userId, title, description, type, link },
    });

    // Send push notification via Firebase Cloud Messaging
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true }
    });

    if (user && user.fcmTokens && user.fcmTokens.length > 0) {
      const message = {
        notification: {
          title,
          body: description,
        },
        data: {
          url: link || '/',
          type
        },
        tokens: user.fcmTokens
      };

      try {
        const response = await messaging.sendEachForMulticast(message);
        // We could clean up invalid tokens here based on response.responses
      } catch (fcmError) {
        console.error('[FCM Notification] Failed:', fcmError);
      }
    }
  } catch (err) {
    console.error('[In-App Notification] Failed:', err);
  }
};

// ─── Email Notification ───────────────────────────────────────────────────────
export const sendEmail = async (to: string, subject: string, html: string) => {
  const user = process.env.EMAIL_USER || 'delegatetheapp@gmail.com';
  const pass = process.env.EMAIL_PASS || 'demiannaja876';

  if (!user || !pass) {
    console.log(`[Email] Not configured — skipping email to ${to}`);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
    await transporter.sendMail({
      from: `"Delegate App" <${user}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[Email] Failed to send:', err);
  }
};

// ─── WhatsApp via Twilio ──────────────────────────────────────────────────────
export const sendWhatsApp = async (phone: string, message: string) => {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_WHATSAPP_FROM
  ) {
    console.log(`[WhatsApp] Not configured — skipping WhatsApp to ${phone}`);
    return;
  }
  try {
    // Dynamic import to avoid crash if twilio not installed
    const twilio = (await import('twilio')).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // Ensure whatsapp: prefix
    const toNumber = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body: message,
    });
    console.log(`[WhatsApp] Sent to ${phone}`);
  } catch (err) {
    console.error('[WhatsApp] Failed to send:', err);
  }
};

// ─── Email HTML Template ──────────────────────────────────────────────────────
const emailTemplate = (title: string, body: string, ctaText?: string, ctaLink?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #09090b; color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
    .header { background: #FACC15; padding: 24px 32px; display: flex; align-items: center; gap: 16px; }
    .header img { width: 48px; height: 48px; border-radius: 12px; }
    .header-text h1 { margin: 0; color: #09090b; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header-text p { margin: 4px 0 0; color: #713f12; font-size: 13px; }
    .body { padding: 28px 32px; }
    .body h2 { color: #fff; font-size: 18px; margin: 0 0 12px; }
    .body p { color: #a1a1aa; line-height: 1.6; font-size: 14px; margin: 0 0 16px; }
    .info-box { background: #09090b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; margin: 16px 0; }
    .info-box p { margin: 4px 0; color: #d4d4d8; font-size: 13px; }
    .info-box strong { color: #FACC15; }
    .cta { display: inline-block; background: #FACC15; color: #09090b; text-decoration: none; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin-top: 8px; }
    .footer { padding: 20px 32px; border-top: 1px solid #27272a; }
    .footer p { color: #52525b; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://delegate-backend.onrender.com/delegate-logo.png" alt="Delegate Logo" />
      <div class="header-text">
        <h1>DELEGATE</h1>
        <p>Team Scheduling & Coordination</p>
      </div>
    </div>
    <div class="body">
      <h2>\${title}</h2>
      \${body}
      \${ctaText && ctaLink ? \`<a href="\${ctaLink}" class="cta">\${ctaText}</a>\` : ''}
    </div>
    <div class="footer">
      <p>You are receiving this because you are a member of a Delegate team. This is an automated message.</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Compound Notification Events ────────────────────────────────────────────

// When a member requests to join a shift → notify the OWNER
export const notifySignupRequested = async (
  job: NotifyJob,
  member: NotifyUser,
  owner: NotifyUser
) => {
  const shiftTime = formatShiftTime(job);
  const appLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs`;

  // In-app → owner
  await sendInAppNotification(
    owner.id,
    `New signup request for "${job.title}"`,
    `${member.fullName} wants to join your shift on ${shiftTime}.`,
    'JOB_UPDATE',
    '/jobs'
  );

  // Email → owner
  await sendEmail(
    owner.email,
    `Delegate: ${member.fullName} wants to join "${job.title}"`,
    emailTemplate(
      `New Shift Signup Request`,
      `<p><strong style="color:#fff">${member.fullName}</strong> has requested to join your shift:</p>
      <div class="info-box">
        <p><strong>Shift:</strong> ${job.title}</p>
        <p><strong>When:</strong> ${shiftTime}</p>
        ${job.location ? `<p><strong>Location:</strong> ${job.location}</p>` : ''}
      </div>
      <p>Open Delegate to approve or reject this request.</p>`,
      'Review Request',
      appLink
    )
  );

  // WhatsApp → owner (if they have a phone)
  if (owner.phone) {
    await sendWhatsApp(
      owner.phone,
      `📋 *Delegate - New Signup Request*\n\n${member.fullName} wants to join your shift:\n*${job.title}*\n📅 ${shiftTime}${job.location ? `\n📍 ${job.location}` : ''}\n\nOpen Delegate to approve or reject.`
    );
  }
};

// When owner approves a signup → notify the MEMBER
export const notifySignupApproved = async (job: NotifyJob, member: NotifyUser) => {
  const shiftTime = formatShiftTime(job);
  const appLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs`;

  // In-app → member
  await sendInAppNotification(
    member.id,
    `✅ You're confirmed for "${job.title}"!`,
    `Your signup has been approved. Shift: ${shiftTime}${job.location ? ` at ${job.location}` : ''}.`,
    'JOB_UPDATE',
    '/jobs'
  );

  // Email → member
  await sendEmail(
    member.email,
    `Delegate: You're confirmed for "${job.title}" ✅`,
    emailTemplate(
      `You're On the Schedule! ✅`,
      `<p>Great news! Your signup request has been <strong style="color:#4ade80">approved</strong>.</p>
      <div class="info-box">
        <p><strong>Shift:</strong> ${job.title}</p>
        <p><strong>When:</strong> ${shiftTime}</p>
        ${job.location ? `<p><strong>Location:</strong> ${job.location}</p>` : ''}
      </div>
      <p>This shift has been added to your schedule in Delegate. See you there!</p>`,
      'View My Schedule',
      appLink
    )
  );

  // WhatsApp → member (if they have a phone)
  if (member.phone) {
    await sendWhatsApp(
      member.phone,
      `✅ *Delegate - Signup Approved!*\n\nYou're confirmed for:\n*${job.title}*\n📅 ${shiftTime}${job.location ? `\n📍 ${job.location}` : ''}\n\nThis shift is now on your schedule. See you there! 🎉`
    );
  }
};

// When owner rejects a signup → notify the MEMBER
export const notifySignupRejected = async (job: NotifyJob, member: NotifyUser) => {
  const shiftTime = formatShiftTime(job);
  const appLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs`;

  // In-app → member
  await sendInAppNotification(
    member.id,
    `Update on your signup for "${job.title}"`,
    `Your request for the shift on ${shiftTime} was not approved this time.`,
    'JOB_UPDATE',
    '/jobs'
  );

  // Email → member
  await sendEmail(
    member.email,
    `Delegate: Signup update for "${job.title}"`,
    emailTemplate(
      `Shift Signup Update`,
      `<p>We wanted to let you know that your signup request was <strong style="color:#f87171">not approved</strong> for this shift.</p>
      <div class="info-box">
        <p><strong>Shift:</strong> ${job.title}</p>
        <p><strong>When:</strong> ${shiftTime}</p>
        ${job.location ? `<p><strong>Location:</strong> ${job.location}</p>` : ''}
      </div>
      <p>Check Delegate for other available shifts and opportunities.</p>`,
      'View Available Shifts',
      appLink
    )
  );

  // WhatsApp → member
  if (member.phone) {
    await sendWhatsApp(
      member.phone,
      `ℹ️ *Delegate - Signup Update*\n\nYour request for:\n*${job.title}*\n📅 ${shiftTime}\n\nwas not approved this time. Check Delegate for other available shifts.`
    );
  }
};

// When a user registers → send welcome confirmation email
export const notifyWelcome = async (user: { fullName: string; email: string; username: string }) => {
  const appLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

  await sendEmail(
    user.email,
    `Welcome to Delegate, ${user.fullName}! 🎉`,
    emailTemplate(
      `Welcome to Delegate! 🎉`,
      `<p>Hey <strong style="color:#fff">${user.fullName}</strong>,</p>
      <p>Your account has been created successfully. You're all set to start coordinating with your team!</p>
      <div class="info-box">
        <p><strong>Username:</strong> @${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>
      </div>
      <p>Here's what you can do next:</p>
      <p style="color:#d4d4d8; font-size:13px; line-height:1.8;">
        ✅ Create or join a team<br>
        📋 Browse and sign up for shifts<br>
        💬 Chat with your team members<br>
        📅 Track your schedule
      </p>
      <p>Log in now to get started!</p>`,
      'Open Delegate',
      appLink
    )
  );
};
