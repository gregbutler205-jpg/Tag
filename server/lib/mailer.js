import nodemailer from 'nodemailer'

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  const user = (process.env.ADMIN_EMAILS || '').split(',')[0].trim()
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  _transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  return _transporter
}

export async function sendTrainingNotification(pendingCount) {
  const transport = getTransporter()
  if (!transport) return
  const to = process.env.ADMIN_EMAILS || ''
  if (!to) return
  const from = to.split(',')[0].trim()
  try {
    await transport.sendMail({
      from: `"Tag Wizard" <${from}>`,
      to,
      subject: `Tag Wizard — ${pendingCount} plate${pendingCount === 1 ? '' : 's'} ready for training review`,
      text: [
        `You have ${pendingCount} new plate interpretation${pendingCount === 1 ? '' : 's'} pending review in your training dataset.`,
        '',
        'Log in to the admin panel to review them:',
        'https://tag.iwonde.com/admin',
        '',
        'These are AI decodes and user-validated challenges ready to approve for fine-tuning.',
      ].join('\n'),
      html: `
        <p>You have <strong>${pendingCount} new plate interpretation${pendingCount === 1 ? '' : 's'}</strong>
        pending review in your training dataset.</p>
        <p><a href="https://tag.iwonde.com/admin">Open Admin Panel → Training tab</a></p>
        <p style="color:#888;font-size:12px">Tag Wizard · tag.iwonde.com</p>
      `,
    })
    console.log(`[mailer] Training notification sent to ${to}`)
  } catch (err) {
    console.warn('[mailer] Failed to send training notification:', err.message)
  }
}
