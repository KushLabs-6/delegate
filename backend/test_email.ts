import nodemailer from 'nodemailer';

async function testEmail() {
  const user = 'delegatetheapp@gmail.com';
  const pass = 'demiannaja876';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
  });

  try {
    console.log('Sending email...');
    await transporter.sendMail({
      from: `"Delegate App" <${user}>`,
      to: 'admin@delegate.app',
      subject: 'Test',
      html: '<p>Test</p>'
    });
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  }
}

testEmail();
