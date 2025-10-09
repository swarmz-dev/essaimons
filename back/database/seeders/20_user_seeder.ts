import { BaseSeeder } from '@adonisjs/lucid/seeders';
import env from '#start/env';
import User from '#models/user';
import { UserRoleEnum } from '#types/enum/user_role_enum';

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        // Create users directly without logging (log_users table doesn't exist)
        const emails: string[] = JSON.parse(env.get('ADDITIONAL_EMAILS'));
        const adminEmail = env.get('ADMIN_EMAIL');

        // Create admin first, then additional users
        for (const email of [adminEmail, ...emails]) {
            const existing = await User.findBy('email', email);
            if (!existing) {
                await User.create({
                    username: email.split('@')[0],
                    email,
                    password: 'xxx',
                    role: email === adminEmail ? UserRoleEnum.ADMIN : UserRoleEnum.USER,
                    enabled: true,
                    acceptedTermsAndConditions: true,
                });
                console.log(`Created user: ${email} (${email === adminEmail ? 'admin' : 'user'})`);
            }
        }
    }
}
