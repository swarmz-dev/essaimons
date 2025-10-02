import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

// Transmit controllers
const EventStreamController = () => import('@adonisjs/transmit/controllers/event_stream_controller');
const SubscribeController = () => import('@adonisjs/transmit/controllers/subscribe_controller');
const UnsubscribeController = () => import('@adonisjs/transmit/controllers/unsubscribe_controller');

// Admin controllers
const AdminUserController = () => import('#controllers/admin/user_controller');
const AdminPropositionCategoryController = () => import('#controllers/admin/proposition_category_controller');
const AdminOrganizationSettingsController = () => import('#controllers/admin/organization_settings_controller');
const AdminDiscordController = () => import('#controllers/admin/discord_controller');

// App controllers
const HealthCheckController = () => import('#controllers/health_checks_controller');
const AuthController = () => import('#controllers/auth_controller');
const ProfileController = () => import('#controllers/profile_controller');
const FileController = () => import('#controllers/file_controller');
const OauthController = () => import('#controllers/oauth_controller');
const PropositionController = () => import('#controllers/proposition_controller');
const PropositionEventController = () => import('#controllers/proposition_event_controller');
const PropositionVoteController = () => import('#controllers/proposition_vote_controller');
const PropositionMandateController = () => import('#controllers/proposition_mandate_controller');
const PropositionMandateDeliverableController = () => import('#controllers/proposition_mandate_deliverable_controller');
const PropositionCommentController = () => import('#controllers/proposition_comment_controller');
const SettingsController = () => import('#controllers/settings_controller');
const DiscordEventController = () => import('#controllers/discord_event_controller');

router.get('healthcheck', [HealthCheckController]);

router
    .group((): void => {
        router.get('/settings/organization', [SettingsController, 'organization']);

        router.get('/static/organization/logo/:fileId', [FileController, 'serveOrganizationLogoFile']);

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

                        router
                            .group((): void => {
                                router.get('/', [AdminOrganizationSettingsController, 'show']);
                                router.post('/', [AdminOrganizationSettingsController, 'update']);
                            })
                            .prefix('organization');

                        router
                            .group((): void => {
                                router.get('/', [AdminDiscordController, 'show']);
                                router.post('/', [AdminDiscordController, 'update']);
                                router.post('/guilds', [AdminDiscordController, 'listGuilds']);
                                router.post('/channels', [AdminDiscordController, 'listChannels']);
                            })
                            .prefix('discord');
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
                        router.post('/:id/status', [PropositionController, 'updateStatus']);
                        router.delete('/:id', [PropositionController, 'delete']);

                        router.get('/:id/events', [PropositionEventController, 'index']);
                        router.post('/:id/events', [PropositionEventController, 'store']);
                        router.put('/:id/events/:eventId', [PropositionEventController, 'update']);
                        router.delete('/:id/events/:eventId', [PropositionEventController, 'destroy']);

                        router.get('/:id/votes', [PropositionVoteController, 'index']);
                        router.post('/:id/votes', [PropositionVoteController, 'store']);
                        router.put('/:id/votes/:voteId', [PropositionVoteController, 'update']);
                        router.post('/:id/votes/:voteId/status', [PropositionVoteController, 'changeStatus']);
                        router.delete('/:id/votes/:voteId', [PropositionVoteController, 'destroy']);

                        const VoteBallotController = () => import('#controllers/vote_ballot_controller');
                        router.get('/:id/votes/:voteId/ballot', [VoteBallotController, 'show']);
                        router.post('/:id/votes/:voteId/ballot', [VoteBallotController, 'store']);
                        router.get('/:id/votes/:voteId/results', [VoteBallotController, 'results']);
                        router.delete('/:id/votes/:voteId/ballot', [VoteBallotController, 'destroy']);

                        router.get('/:id/mandates', [PropositionMandateController, 'index']);
                        router.post('/:id/mandates', [PropositionMandateController, 'store']);
                        router.put('/:id/mandates/:mandateId', [PropositionMandateController, 'update']);
                        router.delete('/:id/mandates/:mandateId', [PropositionMandateController, 'destroy']);

                        router.get('/:id/mandates/:mandateId/deliverables', [PropositionMandateDeliverableController, 'index']);
                        router.post('/:id/mandates/:mandateId/deliverables', [PropositionMandateDeliverableController, 'store']);
                        router.post('/:id/mandates/:mandateId/deliverables/:deliverableId/evaluations', [PropositionMandateDeliverableController, 'evaluate']);

                        router.get('/:id/comments', [PropositionCommentController, 'index']);
                        router.post('/:id/comments', [PropositionCommentController, 'store']);
                        router.put('/:id/comments/:commentId', [PropositionCommentController, 'update']);
                        router.delete('/:id/comments/:commentId', [PropositionCommentController, 'destroy']);
                    })
                    .prefix('propositions');

                router.post('/discord/events', [DiscordEventController, 'create']);

                router
                    .group((): void => {
                        router.get('/profile-picture/:userId', [FileController, 'serveStaticProfilePictureFile']);
                        router.get('/propositions/visual/:propositionId', [FileController, 'serveStaticPropositionVisualFile']);
                        router.get('/propositions/attachments/:attachmentId', [FileController, 'serveStaticPropositionAttachmentFile']);
                        router.get('/propositions/deliverables/:deliverableId', [FileController, 'serveMandateDeliverableFile']);
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
