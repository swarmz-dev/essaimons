import { BaseSeeder } from '@adonisjs/lucid/seeders';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import User from '#models/user';
import PropositionStatusHistory from '#models/proposition_status_history';
import PropositionComment from '#models/proposition_comment';
import PropositionEvent from '#models/proposition_event';
import PropositionMandate from '#models/proposition_mandate';
import MandateApplication from '#models/mandate_application';
import PropositionVote from '#models/proposition_vote';
import {
    PropositionStatusEnum,
    PropositionVisibilityEnum,
    PropositionCommentScopeEnum,
    PropositionCommentVisibilityEnum,
    PropositionEventTypeEnum,
    MandateStatusEnum,
    MandateApplicationStatusEnum,
    PropositionVoteStatusEnum,
} from '#types';
import { DateTime } from 'luxon';
import env from '#start/env';

interface SeedProposition {
    title: string;
    summary: string;
    detailedDescription: string;
    smartObjectives: string;
    impacts: string;
    mandatesDescription: string;
    expertise?: string;
    categories: string[];
    associates?: string[];
    targetStatus: PropositionStatusEnum;
    withClarifications?: boolean;
    withAmendments?: boolean;
    withEvents?: boolean;
    withMandates?: boolean;
    withVote?: boolean;
}

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        // Skip in production environment
        if (env.get('NODE_ENV') === 'production') {
            console.log('[PropositionSeeder] Skipping in production environment');
            return;
        }

        const users: User[] = await User.query().orderBy('created_at', 'asc');
        if (users.length < 3) {
            console.warn('[PropositionSeeder] Not enough users to seed propositions. Need at least 3 users: admin, initiator, and rescue.');
            return;
        }

        // On s'attend à avoir : users[0] = admin, users[1] = initiator, users[2] = rescue
        const admin = users[0]; // superadmin@essaimons.fr
        const initiator = users[1]; // initiator@essaimons.fr
        const rescue = users[2]; // rescue@essaimons.fr

        // Utilisateurs supplémentaires pour les candidatures et commentaires
        const additionalUsers = users.slice(3);

        console.log(`[PropositionSeeder] Using users: admin=${admin.email}, initiator=${initiator.email}, rescue=${rescue.email}`);

        const categories = await PropositionCategory.all();
        const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

        const seedData: SeedProposition[] = [
            // 1. DRAFT - Brouillon simple
            {
                title: 'Déployer une plateforme citoyenne de démocratie liquide pour le budget 2026',
                summary: 'Lancer un outil municipal permettant aux habitants de déléguer ou reprendre leur vote pour prioriser les projets du budget participatif 2026.',
                detailedDescription: `
Le projet se déroule en trois phases :
1. Sélection et hébergement d'une solution open source de démocratie liquide.
2. Intégration avec les bases de données municipales et formation des agents référents.
3. Campagne de lancement incluant ateliers pédagogiques et suivi des délégations.
        `.trim(),
                smartObjectives: `
- Obtenir 1 500 comptes vérifiés avant la phase de vote.
- Atteindre 60 % de délégations actives sur au moins un sujet.
- Publier un tableau de bord public hebdomadaire pendant toute la période de vote.
        `.trim(),
                impacts: `
Mobilisation de nouveaux publics pour les budgets participatifs, meilleure traçabilité des préférences citoyennes et réduction des biais liés à l'abstention dans les processus actuels.
        `.trim(),
                mandatesDescription: `
Mandat 1 (technique) : paramétrer la plateforme et assurer la sécurité des données.
Mandat 2 (médiation) : animer l'accompagnement citoyen et répondre aux questions.
Mandat 3 (analyse) : suivre les métriques de participation et organiser les restitutions publiques.
        `.trim(),
                expertise: 'Experts en civic tech, juristes en données personnelles, médiateurs numériques.',
                categories: ['Démocratie liquide', 'Outils numériques'],
                targetStatus: PropositionStatusEnum.DRAFT,
            },
            // 2. CLARIFY - En clarification avec messages
            {
                title: "Former un réseau d'ambassadeurs de la démocratie liquide dans chaque quartier",
                summary: "Constituer un réseau de volontaires capables d'expliquer la délégation de vote et d'animer des permanences hebdomadaires.",
                detailedDescription: `
Le programme propose un parcours de formation de 12 heures, des kits d'animation et un accompagnement mensuel.
Chaque ambassadeur dispose d'un budget micro-local pour organiser des rencontres et remonter les besoins spécifiques de son quartier.
        `.trim(),
                smartObjectives: `
- Recruter 40 ambassadeurs d'ici la fin du trimestre.
- Couvrir 100 % des quartiers prioritaires avec au moins deux permanences par mois.
- Collecter 200 retours citoyens documentés dans un registre partagé.
        `.trim(),
                impacts: `
Renforcement du lien entre habitants et élus, montée en compétences citoyennes et meilleure appropriation des outils de participation continue.
        `.trim(),
                mandatesDescription: `
Mandat 1 : concevoir et délivrer la formation initiale.
Mandat 2 : coacher les ambassadeurs et assurer la logistique des permanences.
Mandat 3 : compiler les retours et les intégrer au calendrier décisionnel municipal.
        `.trim(),
                expertise: "Formatrices, animateurs de réseau, spécialistes de l'éducation populaire.",
                categories: ['Mobilisation citoyenne', 'Formation & accompagnement'],
                associates: ['Déployer une plateforme citoyenne de démocratie liquide pour le budget 2026'],
                targetStatus: PropositionStatusEnum.CLARIFY,
                withClarifications: true,
            },
            // 3. AMEND - En amendement avec commentaires
            {
                title: 'Créer une boîte à outils open source pour les organisations en démocratie liquide',
                summary: "Mettre à disposition un ensemble de scripts, modèles de chartes et tutoriels vidéo pour faciliter l'adoption de la délégation de vote.",
                detailedDescription: `
Le projet rassemble des contributeurs techniques et des praticiens pour produire des modules réutilisables (authentification, gestion des mandats, data viz).
Une documentation multilingue et un support communautaire seront mis en place sur un forum dédié.
        `.trim(),
                smartObjectives: `
- Publier la première version du kit sous licence libre dans les 90 jours.
- Documenter au moins 8 cas d'usage différents.
- Réunir 50 contributeurs réguliers sur le dépôt Git.
        `.trim(),
                impacts: `
Accélération de l'adoption de la démocratie liquide dans les associations et coopératives, mutualisation des coûts de développement et transparence accrue.
        `.trim(),
                mandatesDescription: `
Mandat 1 : coordonner la production des modules techniques.
Mandat 2 : animer la communauté contributive.
Mandat 3 : assurer la qualité éditoriale et la traduction de la documentation.
        `.trim(),
                expertise: 'Développeurs full-stack, designers UX, rédacteurs techniques.',
                categories: ['Outils numériques', 'Démocratie liquide'],
                associates: ['Déployer une plateforme citoyenne de démocratie liquide pour le budget 2026'],
                targetStatus: PropositionStatusEnum.AMEND,
                withClarifications: true,
                withAmendments: true,
            },
            // 4. VOTE - En vote avec configuration
            {
                title: 'Organiser un tour des cafés citoyens sur la délégation de vote',
                summary: 'Programmer vingt rencontres conviviales pour vulgariser la démocratie liquide et recueillir les freins perçus.',
                detailedDescription: `
L'équipe itinérante se déplace dans les cafés associatifs, bibliothèques et maisons de quartier.
Chaque rencontre combine un mini-atelier pratique et un temps d'échange scénarisé autour d'exemples concrets.
        `.trim(),
                smartObjectives: `
- Toucher 1 200 habitantes et habitants en trois mois.
- Récolter 300 idées d'amélioration des parcours de participation.
- Constituer un répertoire de 50 questions fréquentes pour l'équipe support.
        `.trim(),
                impacts: `
Hausse de la notoriété de la démocratie liquide, réduction des appréhensions liées au numérique et repérage des relais locaux.
        `.trim(),
                mandatesDescription: `
Mandat 1 : organiser la tournée et produire le matériel pédagogique.
Mandat 2 : animer les rencontres et modérer les échanges.
Mandat 3 : consolider les retours et proposer un plan d'amélioration continue.
        `.trim(),
                expertise: 'Facilitateurs, spécialistes communication de proximité, médiateurs culturels.',
                categories: ['Mobilisation citoyenne', 'Communication citoyenne'],
                associates: ["Former un réseau d'ambassadeurs de la démocratie liquide dans chaque quartier"],
                targetStatus: PropositionStatusEnum.VOTE,
                withClarifications: true,
                withAmendments: true,
                withEvents: true,
                withVote: true,
            },
            // 5. MANDATE - Sélection de mandats avec candidatures
            {
                title: 'Mettre en place un observatoire des délégations et de leur efficacité',
                summary: "Suivre l'évolution des délégations de vote et mesurer leur impact sur les décisions prises par les élus et délégués.",
                detailedDescription: `
L'observatoire publie des analyses trimestrielles, s'appuie sur des tableaux de bord en open data et organise des auditions publiques avec des experts.
        `.trim(),
                smartObjectives: `
- Construire un référentiel d'indicateurs partagés avant la fin du mois 2.
- Produire quatre rapports publics la première année.
- Mettre à jour les données en open data sous 72 heures après chaque vote.
        `.trim(),
                impacts: `
Transparence renforcée, amélioration de la confiance citoyenne et capacité à ajuster la gouvernance liquide en fonction des données collectées.
        `.trim(),
                mandatesDescription: `
Mandat 1 : gérer la collecte et l'anonymisation des données.
Mandat 2 : conduire les analyses et publier les rapports.
Mandat 3 : animer la restitution publique et recueillir les recommandations.
        `.trim(),
                expertise: 'Data analysts, juristes open data, spécialistes évaluation de politiques publiques.',
                categories: ['Suivi & évaluation', 'Démocratie liquide'],
                associates: ['Déployer une plateforme citoyenne de démocratie liquide pour le budget 2026'],
                targetStatus: PropositionStatusEnum.MANDATE,
                withClarifications: true,
                withAmendments: true,
                withEvents: true,
                withVote: true,
                withMandates: true,
            },
            // 6. EVALUATE - En évaluation avec mandats actifs
            {
                title: "Lancer un programme d'inclusion numérique pour la délégation de vote",
                summary: "Accompagner les publics éloignés du numérique pour qu'ils puissent déléguer et reprendre leur vote en toute autonomie.",
                detailedDescription: `
Le programme propose des ateliers en petits groupes, des tutoriels papier à emporter et un numéro vert pour assistance.
Il s'appuie sur les points d'accès publics à Internet et les maisons France Services.
        `.trim(),
                smartObjectives: `
- Organiser 60 ateliers dans les six prochains mois.
- Atteindre un taux de satisfaction de 85 %.
- Équiper 500 participant·es d'un compte sécurisé et actif.
        `.trim(),
                impacts: `
Réduction des inégalités d'accès au vote numérique, renforcement des solidarités locales et augmentation du nombre de délégations éclairées.
        `.trim(),
                mandatesDescription: `
Mandat 1 : concevoir le parcours pédagogique inclusif.
Mandat 2 : déployer les ateliers dans les territoires.
Mandat 3 : assurer le suivi post-formation et l'entraide entre pairs.
        `.trim(),
                expertise: 'Formateurs inclusion numérique, travailleurs sociaux, UX designers accessibles.',
                categories: ['Formation & accompagnement', 'Mobilisation citoyenne'],
                targetStatus: PropositionStatusEnum.EVALUATE,
                withClarifications: true,
                withAmendments: true,
                withEvents: true,
                withVote: true,
                withMandates: true,
            },
            // 7. ARCHIVED - Archivée
            {
                title: "Mettre en place un laboratoire d'expérimentation sur les délégations temporisées",
                summary: 'Tester différents modèles de délégation à durée limitée et analyser leur effet sur la participation et la confiance.',
                detailedDescription: `
Le laboratoire recrute un panel de volontaires et expérimente trois scénarios de délégation (durée courte, limitée à un sujet, délégation par compétence).
Il documente les résultats dans un rapport comparatif publié en open access.
        `.trim(),
                smartObjectives: `
- Recruter 600 volontaires issus de profils diversifiés.
- Tester les trois scénarios en moins de six mois.
- Formuler 12 recommandations opérationnelles pour la municipalité.
        `.trim(),
                impacts: `
Meilleure compréhension des comportements de délégation, ajustement des règles de vote liquide et capitalisation scientifique en France.
        `.trim(),
                mandatesDescription: `
Mandat 1 : concevoir le protocole d'expérimentation et l'instrumentation.
Mandat 2 : piloter la relation avec les participants et garantir l'éthique.
Mandat 3 : analyser les résultats et proposer les évolutions réglementaires.
        `.trim(),
                expertise: 'Chercheurs en sciences politiques, data scientists, déontologues.',
                categories: ['Suivi & évaluation', 'Démocratie liquide'],
                targetStatus: PropositionStatusEnum.ARCHIVED,
            },
            // 8. DRAFT - Autre brouillon
            {
                title: 'Lancer un média citoyen dédié à la démocratie liquide',
                summary: 'Produire une newsletter, un podcast et des formats vidéo courts pour vulgariser les décisions prises via le vote délégué.',
                detailedDescription: `
Le média adopte une approche pédagogique, valorise les initiatives locales et propose un agenda des consultations à venir.
Une charte journalistique est co-construite avec les collectifs citoyens.
        `.trim(),
                smartObjectives: `
- Publier 24 épisodes de podcast la première année.
- Atteindre 10 000 abonnés à la newsletter.
- Obtenir un taux d'ouverture moyen supérieur à 45 %.
        `.trim(),
                impacts: `
Diffusion large des innovations démocratiques, émergence de porte-voix citoyens et renforcement de la culture de transparence.
        `.trim(),
                mandatesDescription: `
Mandat 1 : animer l'équipe éditoriale et la ligne pédagogique.
Mandat 2 : produire les formats audio/vidéo et gérer la diffusion multicanale.
Mandat 3 : développer les partenariats avec les médias locaux et écoles.
        `.trim(),
                expertise: 'Journalistes, storytellers, spécialistes marketing digital.',
                categories: ['Communication citoyenne', 'Mobilisation citoyenne'],
                associates: ['Organiser un tour des cafés citoyens sur la délégation de vote'],
                targetStatus: PropositionStatusEnum.DRAFT,
            },
            // 9. CLARIFY - Autre en clarification
            {
                title: "Créer un fonds d'amorçage pour les outils civiques de démocratie liquide",
                summary: "Financer des prototypes d'applications et de services facilitant la délégation de vote dans les communes rurales.",
                detailedDescription: `
Le fonds attribue des micro-subventions, accompagne les porteurs de projet et organise un démonstrateur annuel pour présenter les solutions à d'autres collectivités.
        `.trim(),
                smartObjectives: `
- Soutenir 15 prototypes la première année.
- Transformer au moins 5 prototypes en pilote opérationnel.
- Documenter l'impact de chaque projet financé via une fiche publique.
        `.trim(),
                impacts: `
Diversification de l'écosystème civic tech, appropriation de la démocratie liquide dans les territoires ruraux et mutualisation des innovations.
        `.trim(),
                mandatesDescription: `
Mandat 1 : définir les critères de sélection et gérer l'instruction des dossiers.
Mandat 2 : suivre l'exécution des projets et coacher les équipes.
Mandat 3 : organiser le démonstrateur annuel et capitaliser les retours d'expérience.
        `.trim(),
                expertise: "Gestionnaires de fonds d'innovation, coachs entrepreneuriaux, experts civic tech.",
                categories: ['Outils numériques', 'Formation & accompagnement'],
                associates: ['Créer une boîte à outils open source pour les organisations en démocratie liquide'],
                targetStatus: PropositionStatusEnum.CLARIFY,
                withClarifications: true,
            },
            // 10. AMEND - Autre en amendement
            {
                title: 'Mettre en œuvre une stratégie de communication multilingue sur la démocratie liquide',
                summary: 'Produire des supports en six langues, mobiliser les radios communautaires et assurer une présence sur les marchés hebdomadaires.',
                detailedDescription: `
La campagne combine affichage, capsules audio diffusées localement et présence physique sur les événements de quartier.
Des porte-parole issus des communautés concernées co-construisent les messages.
        `.trim(),
                smartObjectives: `
- Produire 18 supports clés traduits en six langues.
- Atteindre 80 000 personnes uniques via les canaux partenaires.
- Augmenter de 25 % les inscriptions aux ateliers de sensibilisation.
        `.trim(),
                impacts: `
Inclusion des publics allophones, visibilité accrue des opportunités de participation et légitimité renforcée des décisions déléguées.
        `.trim(),
                mandatesDescription: `
Mandat 1 : concevoir la stratégie multilingue et les supports.
Mandat 2 : coordonner les relais médias et les événements terrain.
Mandat 3 : mesurer la portée de la campagne et ajuster les messages.
        `.trim(),
                expertise: "Traducteurs communautaires, stratèges communication, gestionnaires d'événements.",
                categories: ['Communication citoyenne', 'Mobilisation citoyenne'],
                associates: ['Lancer un média citoyen dédié à la démocratie liquide'],
                targetStatus: PropositionStatusEnum.AMEND,
                withClarifications: true,
                withAmendments: true,
            },
        ];

        const createdPropositions = new Map<string, Proposition>();
        const pendingAssociations: Array<{ title: string; associates: string[] }> = [];

        for (const [index, proposal] of seedData.entries()) {
            const existing: Proposition | null = await Proposition.query().where('title', proposal.title).first();
            if (existing) {
                createdPropositions.set(proposal.title, existing);
                if (proposal.associates?.length) {
                    pendingAssociations.push({ title: proposal.title, associates: proposal.associates });
                }
                continue;
            }

            // Toutes les propositions sont créées par l'initiateur (users[1])
            // avec le rescue (users[2]) comme initiateur de secours
            const creator: User = initiator;

            const clarificationDeadline: DateTime<true> = DateTime.now()
                .plus({ days: 28 + index * 4 })
                .startOf('day');
            const amendmentDeadline: DateTime<true> = clarificationDeadline.plus({ days: 14 });
            const voteDeadline: DateTime<true> = clarificationDeadline.plus({ days: 35 });
            const mandateDeadline: DateTime<true> = clarificationDeadline.plus({ days: 90 });
            const evaluationDeadline: DateTime<true> = clarificationDeadline.plus({ days: 200 });

            // Calculer statusStartedAt en fonction du statut cible
            let statusStartedAt = DateTime.now();
            if (proposal.targetStatus !== PropositionStatusEnum.DRAFT) {
                // Pour les propositions avancées, on recule la date de début
                const daysAgo = index * 5 + 10;
                statusStartedAt = DateTime.now().minus({ days: daysAgo });
            }

            const proposition: Proposition = await Proposition.create({
                title: proposal.title,
                summary: proposal.summary,
                detailedDescription: proposal.detailedDescription,
                smartObjectives: proposal.smartObjectives,
                impacts: proposal.impacts,
                mandatesDescription: proposal.mandatesDescription,
                expertise: proposal.expertise ?? null,
                status: proposal.targetStatus,
                statusStartedAt,
                visibility: PropositionVisibilityEnum.PUBLIC,
                archivedAt: proposal.targetStatus === PropositionStatusEnum.ARCHIVED ? DateTime.now() : null,
                settingsSnapshot: {},
                clarificationDeadline,
                amendmentDeadline,
                voteDeadline,
                mandateDeadline,
                evaluationDeadline,
                creatorId: creator.id,
            });

            // Créer l'historique de statut
            await this.createStatusHistory(proposition, creator, proposal.targetStatus);

            const categoryIds: string[] = proposal.categories.map((name: string): string | undefined => categoryMap.get(name)).filter((value: string | undefined): value is string => Boolean(value));

            if (categoryIds.length) {
                await proposition.related('categories').sync(categoryIds, false);
            }

            // Ajouter le rescue comme initiateur de secours
            await proposition.related('rescueInitiators').sync([rescue.id], false);

            // Ajouter les clarifications
            if (proposal.withClarifications) {
                await this.addClarifications(proposition, admin, additionalUsers);
            }

            // Ajouter les amendements
            if (proposal.withAmendments) {
                await this.addAmendments(proposition, admin, additionalUsers);
            }

            // Ajouter les événements
            if (proposal.withEvents) {
                await this.addEvents(proposition, creator);
            }

            // Ajouter le vote
            if (proposal.withVote) {
                await this.addVote(proposition, creator);
            }

            // Ajouter les mandats
            if (proposal.withMandates) {
                await this.addMandates(proposition, creator, additionalUsers);
            }

            createdPropositions.set(proposal.title, proposition);

            if (proposal.associates?.length) {
                pendingAssociations.push({ title: proposal.title, associates: proposal.associates });
            }

            console.log(`[PropositionSeeder] Created proposition "${proposal.title}" (${proposal.targetStatus})`);
        }

        // Gérer les associations entre propositions
        for (const association of pendingAssociations) {
            const source: Proposition | undefined = createdPropositions.get(association.title);
            if (!source) continue;

            const relatedIds: string[] = association.associates
                .map((title: string): string | undefined => createdPropositions.get(title)?.id)
                .filter((id: string | undefined): id is string => Boolean(id));

            if (!relatedIds.length) {
                continue;
            }

            const existingIds = new Set((await source.related('associatedPropositions').query().select('propositions.id')).map((related: Proposition): string => related.id as string));

            const idsToAttach: string[] = relatedIds.filter((id: string): boolean => !existingIds.has(id));

            if (idsToAttach.length) {
                await source.related('associatedPropositions').attach(idsToAttach);
            }
        }

        console.log('[PropositionSeeder] ✅ Seeding completed with all proposition states and entities');
    }

    private async createStatusHistory(proposition: Proposition, user: User, targetStatus: PropositionStatusEnum): Promise<void> {
        const statusFlow = [
            PropositionStatusEnum.DRAFT,
            PropositionStatusEnum.CLARIFY,
            PropositionStatusEnum.AMEND,
            PropositionStatusEnum.VOTE,
            PropositionStatusEnum.MANDATE,
            PropositionStatusEnum.EVALUATE,
            PropositionStatusEnum.ARCHIVED,
        ];

        const targetIndex = statusFlow.indexOf(targetStatus);

        for (let i = 0; i <= targetIndex; i++) {
            const fromStatus = i === 0 ? statusFlow[i] : statusFlow[i - 1];
            const toStatus = statusFlow[i];

            await PropositionStatusHistory.create({
                propositionId: proposition.id,
                fromStatus,
                toStatus,
                triggeredByUserId: user.id,
                reason: i === 0 ? 'seed initial status' : `Transition to ${toStatus}`,
                metadata: {},
            });
        }
    }

    private async addClarifications(proposition: Proposition, admin: User, additionalUsers: User[]): Promise<void> {
        // Utiliser admin si pas d'utilisateurs supplémentaires
        const user1 = additionalUsers[0] ?? admin;
        const user2 = additionalUsers[1] ?? admin;

        // Question de clarification d'un citoyen
        const question = await PropositionComment.create({
            propositionId: proposition.id,
            authorId: user1.id,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            section: 'budget',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: 'Pouvez-vous préciser le budget estimé pour ce projet ? Y a-t-il des sources de financement déjà identifiées ?',
        });

        // Réponse de l'initiateur
        await PropositionComment.create({
            propositionId: proposition.id,
            parentId: question.id,
            authorId: proposition.creatorId,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            section: 'budget',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content:
                "Excellent question ! Le budget estimé est de 45 000€ pour la première année. Nous avons identifié deux sources : 30 000€ de budget municipal participatif et 15 000€ d'une subvention régionale pour l'innovation démocratique.",
        });

        // Deuxième question
        const question2 = await PropositionComment.create({
            propositionId: proposition.id,
            authorId: user2.id,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            section: 'timeline',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: "Quelle est la timeline prévue ? Comment s'articule ce projet avec les échéances électorales ?",
        });

        // Réponse
        await PropositionComment.create({
            propositionId: proposition.id,
            parentId: question2.id,
            authorId: proposition.creatorId,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            section: 'timeline',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: "Le lancement est prévu pour janvier 2026, soit 18 mois avant les prochaines élections municipales. Cela permettra d'évaluer le dispositif avant les échéances électorales.",
        });
    }

    private async addAmendments(proposition: Proposition, admin: User, additionalUsers: User[]): Promise<void> {
        // Utiliser les utilisateurs supplémentaires, ou admin par défaut
        const user1 = additionalUsers[0] ?? admin;
        const user2 = additionalUsers[1] ?? admin;

        // Proposition d'amendement 1
        await PropositionComment.create({
            propositionId: proposition.id,
            authorId: user1.id,
            scope: PropositionCommentScopeEnum.AMENDMENT,
            section: 'objectives',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: "Je propose d'ajouter un objectif sur l'accessibilité : 'Garantir l'accessibilité de la plateforme aux personnes en situation de handicap (conformité RGAA niveau AA).'",
        });

        // Proposition d'amendement 2
        await PropositionComment.create({
            propositionId: proposition.id,
            authorId: (additionalUsers[3] ?? user2).id,
            scope: PropositionCommentScopeEnum.AMENDMENT,
            section: 'impacts',
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: "Il faudrait mentionner l'impact environnemental : privilégier un hébergement éco-responsable et mesurer l'empreinte carbone de la plateforme.",
        });
    }

    private async addEvents(proposition: Proposition, creator: User): Promise<void> {
        // Événement d'échange 1 - Passé
        await PropositionEvent.create({
            propositionId: proposition.id,
            type: PropositionEventTypeEnum.EXCHANGE,
            title: 'Atelier de co-construction',
            description: 'Premier atelier ouvert pour co-construire le cahier des charges avec les citoyens intéressés.',
            startAt: DateTime.now().minus({ days: 10 }),
            endAt: DateTime.now().minus({ days: 10 }).plus({ hours: 2 }),
            location: 'Maison de la citoyenneté, salle B',
            createdByUserId: creator.id,
        });

        // Événement d'échange 2 - À venir
        await PropositionEvent.create({
            propositionId: proposition.id,
            type: PropositionEventTypeEnum.EXCHANGE,
            title: 'Webinaire de présentation',
            description: 'Présentation publique du projet et session de questions-réponses en ligne.',
            startAt: DateTime.now().plus({ days: 5 }),
            endAt: DateTime.now().plus({ days: 5 }).plus({ hours: 1, minutes: 30 }),
            videoLink: 'https://meet.example.com/proposition-demo',
            createdByUserId: creator.id,
        });

        // Jalon
        await PropositionEvent.create({
            propositionId: proposition.id,
            type: PropositionEventTypeEnum.MILESTONE,
            title: 'Date limite de soumission des amendements',
            description: 'Après cette date, les amendements ne pourront plus être proposés.',
            startAt: DateTime.now().plus({ days: 15 }),
            createdByUserId: creator.id,
        });
    }

    private async addVote(proposition: Proposition, _creator: User): Promise<void> {
        await PropositionVote.create({
            propositionId: proposition.id,
            phase: 'approval' as any, // TODO: utiliser PropositionVotePhaseEnum
            method: 'simple' as any, // TODO: utiliser PropositionVoteMethodEnum
            status: PropositionVoteStatusEnum.OPEN,
            title: "Approuvez-vous cette proposition telle qu'amendée ?",
            description: "Vote pour valider la proposition après la phase d'amendement.",
            openAt: DateTime.now().minus({ days: 2 }),
            closeAt: DateTime.now().plus({ days: 12 }),
            metadata: {
                voteType: 'simple_majority',
                quorum: 100,
            },
        });
    }

    private async addMandates(proposition: Proposition, creator: User, additionalUsers: User[]): Promise<void> {
        // Mandat 1 : À assigner avec plusieurs candidatures
        const mandate1 = await PropositionMandate.create({
            propositionId: proposition.id,
            title: 'Mandat technique : Développement et sécurité',
            description: 'Paramétrer la plateforme, assurer la sécurité des données et garantir la conformité RGPD.',
            status: MandateStatusEnum.TO_ASSIGN,
            targetObjectiveRef: 'obj-1',
            initialDeadline: DateTime.now().plus({ days: 90 }),
            currentDeadline: DateTime.now().plus({ days: 90 }),
            metadata: {},
        });

        // Candidature 1 - En attente
        await MandateApplication.create({
            mandateId: mandate1.id,
            applicantUserId: additionalUsers[0]?.id ?? creator.id,
            statement: "Je suis développeur full-stack avec 5 ans d'expérience en sécurité web et certifié en protection des données. J'ai déjà contribué à plusieurs projets de civic tech.",
            status: MandateApplicationStatusEnum.PENDING,
            submittedAt: DateTime.now().minus({ days: 3 }),
        });

        // Candidature 2 - En attente
        if (additionalUsers[1]) {
            await MandateApplication.create({
                mandateId: mandate1.id,
                applicantUserId: additionalUsers[1].id,
                statement: "Ingénieure en cybersécurité, j'ai travaillé sur des systèmes de vote électronique et je connais bien les enjeux de confidentialité.",
                status: MandateApplicationStatusEnum.PENDING,
                submittedAt: DateTime.now().minus({ days: 1 }),
            });
        }

        // Mandat 2 : Actif avec un titulaire
        const mandate2 = await PropositionMandate.create({
            propositionId: proposition.id,
            title: 'Mandat médiation : Animation et accompagnement',
            description: "Animer l'accompagnement citoyen, répondre aux questions et organiser des permanences.",
            holderUserId: additionalUsers[2]?.id ?? creator.id,
            status: MandateStatusEnum.ACTIVE,
            targetObjectiveRef: 'obj-2',
            initialDeadline: DateTime.now().plus({ days: 120 }),
            currentDeadline: DateTime.now().plus({ days: 120 }),
            lastStatusUpdateAt: DateTime.now().minus({ days: 5 }),
            metadata: {},
        });

        // Candidature acceptée
        if (additionalUsers[2]) {
            await MandateApplication.create({
                mandateId: mandate2.id,
                applicantUserId: additionalUsers[2].id,
                statement: 'Animateur socio-culturel depuis 10 ans, spécialisé dans la médiation numérique et la participation citoyenne.',
                status: MandateApplicationStatusEnum.ACCEPTED,
                submittedAt: DateTime.now().minus({ days: 15 }),
            });
        }

        // Candidature rejetée
        if (additionalUsers[3]) {
            await MandateApplication.create({
                mandateId: mandate2.id,
                applicantUserId: additionalUsers[3].id,
                statement: 'Intéressé par la médiation citoyenne.',
                status: MandateApplicationStatusEnum.REJECTED,
                submittedAt: DateTime.now().minus({ days: 20 }),
            });
        }

        // Mandat 3 : Complété
        await PropositionMandate.create({
            propositionId: proposition.id,
            title: 'Mandat analyse : Suivi des métriques',
            description: 'Suivre les métriques de participation et organiser les restitutions publiques.',
            holderUserId: additionalUsers[4]?.id ?? creator.id,
            status: MandateStatusEnum.COMPLETED,
            targetObjectiveRef: 'obj-3',
            initialDeadline: DateTime.now().minus({ days: 10 }),
            currentDeadline: DateTime.now().minus({ days: 10 }),
            lastStatusUpdateAt: DateTime.now().minus({ days: 2 }),
            metadata: {},
        });
    }
}
