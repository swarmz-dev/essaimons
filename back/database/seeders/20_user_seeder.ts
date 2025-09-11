import { BaseSeeder } from '@adonisjs/lucid/seeders';
import env from '#start/env';
import User from '#models/user';
import UserRepository from '#repositories/user_repository';
import UserRoleEnum from '#types/enum/user_role_enum';
import FileService from '#services/file_service';
import LogUserRepository from '#repositories/log_user_repository';
import LogRepository from '#repositories/log_repository';

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        const fileService: FileService = new FileService();
        const logRepository: LogRepository = new LogRepository();
        const logUserRepository: LogUserRepository = new LogUserRepository(logRepository);
        const userRepository: UserRepository = new UserRepository(fileService, logUserRepository);

        const emails: string[] = JSON.parse(env.get('ADDITIONAL_EMAILS'));
        for (const email of [...emails, env.get('ADMIN_EMAIL')]) {
            if (!(await userRepository.findOneBy({ email }))) {
                await User.create({
                    username: email.split('@')[0],
                    email,
                    password: 'xxx',
                    role: email === env.get('ADMIN_EMAIL') ? UserRoleEnum.ADMIN : UserRoleEnum.USER,
                    enabled: true,
                    acceptedTermsAndConditions: true,
                });
            }
        }
    }
}
