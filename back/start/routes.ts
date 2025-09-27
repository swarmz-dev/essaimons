import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

// Transmit controllers
const EventStreamController = () => import('@adonisjs/transmit/controllers/event_stream_controller');
const SubscribeController = () => import('@adonisjs/transmit/controllers/subscribe_controller');
const UnsubscribeController = () => import('@adonisjs/transmit/controllers/unsubscribe_controller');

// Admin controllers
const AdminUserController = () => import('#controllers/admin/user_controller');
const AdminPropositionCategoryController = () => import('#controllers/admin/proposition_category_controller');

// App controllers
const HealthCheckController = () => import('#controllers/health_checks_controller');
const AuthController = () => import('#controllers/auth_controller');
const ProfileController = () => import('#controllers/profile_controller');
const FileController = () => import('#controllers/file_controller');
const OauthController = () => import('#controllers/oauth_controller');
const PropositionController = () => import('#controllers/proposition_controller');

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
                        router.get('/', [OauthController, 'discord']);
                        router.get('/callback', [OauthController, 'discordCallback']);
                    })
                    .prefix('discord');

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
                                router.get('/', [AdminUserController, 'getAll']);
                                router.post('/delete', [AdminUserController, 'delete']);
                                router.post('/create', [AdminUserController, 'create']);
                                router.post('/update', [AdminUserController, 'update']);
                                router.get('/:frontId', [AdminUserController, 'get']);
                            })
                            .prefix('user');

                        router
                            .group((): void => {
                                router.get('/', [AdminPropositionCategoryController, 'index']);
                                router.post('/', [AdminPropositionCategoryController, 'create']);
                                router.put('/:id', [AdminPropositionCategoryController, 'update']);
                                router.delete('/:id', [AdminPropositionCategoryController, 'delete']);
                            })
                            .prefix('categories');
                    })
                    .prefix('admin')
                    .use([middleware.isAdmin()]);

                router.delete('/logout', [AuthController, 'logout']);

                router
                    .group((): void => {
                        router.get('/', [ProfileController, 'getProfile']);
                        router.post('/update', [ProfileController, 'updateProfile']);
                        router.get('/export', [ProfileController, 'exportProfile']);
                    })
                    .prefix('profile');

                router
                    .group((): void => {
                        router.get('/', [PropositionController, 'search']);
                        router.get('/bootstrap', [PropositionController, 'bootstrap']);
                        router.get('/:id', [PropositionController, 'show']);
                        router.post('/', [PropositionController, 'create']);
                        router.put('/:id', [PropositionController, 'update']);
                        router.delete('/:id', [PropositionController, 'delete']);
                    })
                    .prefix('propositions');

                router
                    .group((): void => {
                        router.get('/profile-picture/:userId', [FileController, 'serveStaticProfilePictureFile']);
                        router.get('/propositions/visual/:propositionId', [FileController, 'serveStaticPropositionVisualFile']);
                        router.get('/propositions/attachments/:attachmentId', [FileController, 'serveStaticPropositionAttachmentFile']);
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
