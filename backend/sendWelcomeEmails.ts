import { PrismaClient } from '@prisma/client';
import { notifyWelcome } from './src/services/notificationService.js';

const prisma = new PrismaClient();

async function sendWelcomeEmails() {
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users. Sending welcome emails...`);

    for (const user of users) {
      console.log(`Sending to ${user.email}...`);
      await notifyWelcome({
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      });
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Finished sending welcome emails.');
  } catch (error) {
    console.error('Error sending welcome emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendWelcomeEmails();
