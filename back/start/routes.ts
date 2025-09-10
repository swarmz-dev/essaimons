import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

// Transmit controllers
const EventStreamController = () => import('@adonisjs/transmit/controllers/event_stream_controller');
const SubscribeController = () => import('@adonisjs/transmit/controllers/subscribe_controller');
const UnsubscribeController = () => import('@adonisjs/transmit/controllers/unsubscribe_controller');

// Admin controllers
const AdminLanguageController = () => import('#controllers/admin/language_controller');
const AdminUserController = () => import('#controllers/admin/user_controller');

// App controllers
const HealthCheckController = () => import('#controllers/health_checks_controller');
const AuthController = () => import('#controllers/auth_controller');
const ProfileController = () => import('#controllers/profile_controller');
const FileController = () => import('#controllers/file_controller');
const OauthController = () => import('#controllers/oauth_controller');

router.get('healthcheck', [HealthCheckController]);

router
    .group((): void => {
        router
            .group((): void => {
                // Classic authentication routes
                router.post('/', [AuthController, 'login']);

                // OAuth routes
                router
                    .group((): void => {
                        router.get('/', [OauthController, 'github']);
                        router.get('/callback', [OauthController, 'githubCallback']);
                    })
                    .prefix('github');
                router
                    .group((): void => {
                        router.get('/', [OauthController, 'discord']);
                        router.get('/callback', [OauthController, 'discordCallback']);
                    })
                    .prefix('discord');
                router
                    .group((): void => {
                        router.get('/', [OauthController, 'google']);
                        router.get('/callback', [OauthController, 'googleCallback']);
                    })
                    .prefix('google');

                router.post('/confirm/:provider/:token', [OauthController, 'confirmOauthConnection']);
            })
            .prefix('auth');

        // Classic account creation routes
        router
            .group((): void => {
                router.post('/send-mail', [AuthController, 'sendAccountCreationEmail']);
                router.post('/confirm/:token', [AuthController, 'confirmAccountCreation']);
            })
            .prefix('account-creation');

        router
            .group((): void => {
                router.post('/send-mail', [ProfileController, 'sendResetPasswordEmail']);
                router.post('/confirm/:token', [ProfileController, 'resetPassword']);
            })
            .prefix('reset-password');

        // Authenticated routes
        router
            .group((): void => {
                // Authentication check route
                router.get('/', (): { isSessionTokenValid: boolean } => {
                    return { isSessionTokenValid: true };
                });

                // Admin routes
                router
                    .group((): void => {
                        router
                            .group((): void => {
                                router.get('/', [AdminLanguageController, 'getAll']);
                                router.post('/delete', [AdminLanguageController, 'delete']);
                                router.post('/create', [AdminLanguageController, 'create']);
                                router.post('/update', [AdminLanguageController, 'update']);
                                router.get('/:languageCode', [AdminLanguageController, 'get']);
                            })
                            .prefix('language');

                        router
                            .group((): void => {
                                router.get('/', [AdminUserController, 'getAll']);
                                router.post('/delete', [AdminUserController, 'delete']);
                                router.post('/create', [AdminUserController, 'create']);
                                router.post('/update', [AdminUserController, 'update']);
                                router.get('/:frontId', [AdminUserController, 'get']);
                            })
                            .prefix('user');
                    })
                    .prefix('admin')
                    .use([middleware.isAdmin()]);

                router.delete('/logout', [AuthController, 'logout']);

                router
                    .group((): void => {
                        router.get('/', [ProfileController, 'getProfile']);
                        router.post('/update', [ProfileController, 'updateProfile']);
                    })
                    .prefix('profile');

                router
                    .group((): void => {
                        router.get('/profile-picture/:userId', [FileController, 'serveStaticProfilePictureFile']);
                        router.get('/language-flag/:languageCode', [FileController, 'serveStaticLanguageFlagFile']);
                    })
                    .prefix('static');
            })
            .use([middleware.auth()]);
    })
    .prefix('api')
    .use([middleware.log(), middleware.language()]);

router.get('/__transmit/events', [EventStreamController]);
router.post('/__transmit/subscribe', [SubscribeController]);
router.post('/__transmit/unsubscribe', [UnsubscribeController]);
