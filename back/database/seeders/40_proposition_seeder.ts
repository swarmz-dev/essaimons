import { BaseSeeder } from '@adonisjs/lucid/seeders';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import User from '#models/user';
import PropositionStatusHistory from '#models/proposition_status_history';
import { PropositionStatusEnum, PropositionVisibilityEnum } from '#types';
import { DateTime } from 'luxon';

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
}

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        const users: User[] = await User.query().orderBy('created_at', 'asc');
        if (users.length < 2) {
            console.warn('[PropositionSeeder] Not enough users to seed propositions with rescue initiators.');
            return;
        }

        const categories = await PropositionCategory.all();
        const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

        const seedData: SeedProposition[] = [
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
            },
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
                expertise: 'Formatrices, animateurs de réseau, spécialistes de l’éducation populaire.',
                categories: ['Mobilisation citoyenne', 'Formation & accompagnement'],
                associates: ['Déployer une plateforme citoyenne de démocratie liquide pour le budget 2026'],
            },
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
            },
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
            },
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
            },
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
            },
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
            },
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
            },
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
                expertise: 'Gestionnaires de fonds d’innovation, coachs entrepreneuriaux, experts civic tech.',
                categories: ['Outils numériques', 'Formation & accompagnement'],
                associates: ['Créer une boîte à outils open source pour les organisations en démocratie liquide'],
            },
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
                expertise: 'Traducteurs communautaires, stratèges communication, gestionnaires d’événements.',
                categories: ['Communication citoyenne', 'Mobilisation citoyenne'],
                associates: ['Lancer un média citoyen dédié à la démocratie liquide'],
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

            const creator: User = users[index % users.length];
            const rescueCandidates: User[] = users.filter((user: User): boolean => user.id !== creator.id);
            if (!rescueCandidates.length) {
                console.warn(`[PropositionSeeder] No rescue initiator available for proposition ${proposal.title}`);
                continue;
            }

            const clarificationDeadline: DateTime<true> = DateTime.now()
                .plus({ days: 28 + index * 4 })
                .startOf('day');
            const improvementDeadline: DateTime<true> = clarificationDeadline.plus({ days: 14 });
            const voteDeadline: DateTime<true> = clarificationDeadline.plus({ days: 35 });
            const mandateDeadline: DateTime<true> = clarificationDeadline.plus({ days: 90 });
            const evaluationDeadline: DateTime<true> = clarificationDeadline.plus({ days: 200 });

            const proposition: Proposition = await Proposition.create({
                title: proposal.title,
                summary: proposal.summary,
                detailedDescription: proposal.detailedDescription,
                smartObjectives: proposal.smartObjectives,
                impacts: proposal.impacts,
                mandatesDescription: proposal.mandatesDescription,
                expertise: proposal.expertise ?? null,
                status: PropositionStatusEnum.DRAFT,
                statusStartedAt: DateTime.now(),
                visibility: PropositionVisibilityEnum.PUBLIC,
                archivedAt: null,
                settingsSnapshot: {},
                clarificationDeadline,
                improvementDeadline,
                voteDeadline,
                mandateDeadline,
                evaluationDeadline,
                creatorId: creator.id,
            });

            await PropositionStatusHistory.create({
                propositionId: proposition.id,
                fromStatus: PropositionStatusEnum.DRAFT,
                toStatus: PropositionStatusEnum.DRAFT,
                triggeredByUserId: creator.id,
                reason: 'seed initial status',
                metadata: {},
            });

            const categoryIds: string[] = proposal.categories.map((name: string): string | undefined => categoryMap.get(name)).filter((value: string | undefined): value is string => Boolean(value));

            if (categoryIds.length) {
                await proposition.related('categories').sync(categoryIds, false);
            }

            const rescueIds: string[] = rescueCandidates.slice(index % rescueCandidates.length, (index % rescueCandidates.length) + 2).map((user: User): string => user.id);

            if (!rescueIds.length) {
                rescueIds.push(rescueCandidates[0].id);
            }

            await proposition.related('rescueInitiators').sync(rescueIds, false);

            createdPropositions.set(proposal.title, proposition);

            if (proposal.associates?.length) {
                pendingAssociations.push({ title: proposal.title, associates: proposal.associates });
            }
        }

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
    }
}
