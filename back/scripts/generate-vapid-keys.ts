/**
 * Script to generate VAPID keys for Web Push notifications
 * Run with: node ace run scripts/generate-vapid-keys.ts
 */

import webpush from 'web-push';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function generateVapidKeys() {
    console.log('🔐 Generating VAPID keys for Web Push...\n');

    const vapidKeys = webpush.generateVAPIDKeys();

    console.log('✅ Keys generated successfully!\n');
    console.log('Public Key:');
    console.log(vapidKeys.publicKey);
    console.log('\nPrivate Key:');
    console.log(vapidKeys.privateKey);
    console.log('\n📝 Add these to your .env file:\n');
    console.log(`VAPID_SUBJECT=mailto:admin@essaimons.fr`);
    console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

    // Try to append to .env if it exists
    try {
        const envPath = join(process.cwd(), '.env');
        let envContent = readFileSync(envPath, 'utf-8');

        // Check if VAPID keys already exist
        if (envContent.includes('VAPID_PUBLIC_KEY')) {
            console.log('\n⚠️  VAPID keys already exist in .env - not overwriting');
            console.log('   Please update manually if needed');
        } else {
            envContent += `\n# Web Push VAPID keys (generated ${new Date().toISOString()})\n`;
            envContent += `VAPID_SUBJECT=mailto:admin@essaimons.fr\n`;
            envContent += `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
            envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;

            writeFileSync(envPath, envContent);
            console.log('\n✅ Keys added to .env file');
        }
    } catch (error) {
        console.log('\n⚠️  Could not write to .env file - please add manually');
    }

    console.log('\n🎉 Done!');
}

// Run directly
generateVapidKeys()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
