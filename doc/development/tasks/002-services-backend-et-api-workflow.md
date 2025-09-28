# Tâche 002 · Services backend & API workflow

# Tâche 002 · Services backend & API workflow

**Statut actuel : préparation en cours (prérequis clarifiés, implémentation à démarrer).**

## Prérequis
- ✅ Tâche 001 livrée (structures de données et relations disponibles).
- ✅ Matrice de permissions initiale définie (voir tableau ci-dessous).
- ✅ Inventaire des endpoints/services actuels : `PropositionController.search/create/show/update`, `PropositionService`, `PropositionRepository`, routes `/api/propositions/*`.

## Implémentation
- Introduire un `PropositionWorkflowService` responsable des transitions de statut, de la validation business et de l’écriture d’historique.
- Adapter `PropositionService` pour supporter la création en statut `A formaliser`, la gestion de visibilité (privé/public) et l’appel au workflow pour les transitions.
- Créer/mettre à jour les endpoints :
  - Publication d’un brouillon → `A clarifier`.
  - Passage entre statuts (clarifier → amender → voter → mandater → évaluer → archiver).
  - Gestion des événements (CRUD sur `proposition_events`).
  - Gestion des votes (configuration, ouverture, clôture) et des bulletins (création sécurisée).
  - Gestion des mandats (candidatures, affectations) et livrables.
  - Gestion des commentaires/réactions par scope.
- Implémenter des policies/middlewares pour vérifier autorisations (rôle + statut + permissions settings).
- Prévoir des méthodes utilitaires pour recalculer les échéances lors des transitions (à connecter à la tâche 005).
- Renvoyer les nouveaux champs dans les serializers (`apiSerialize`, `listSerialize`).

### Matrice de permissions par défaut (à implémenter côté settings + policies)
| Statut → / Action ↓ | Admin | Initiator | Mandated | Contributor |
| --- | --- | --- | --- | --- |
| **A formaliser** | toutes actions | créer/éditer brouillon, publier, gérer visuel & pièces | – | lecture si proposition publique |
| **A clarifier** | toutes actions | éditer proposition, modérer commentaires, répondre | – | marquer `Lu/Question`, commenter (clarif), répondre |
| **A amender** | toutes actions | éditer proposition, gérer événements « Temps d’échanges » | – | commenter (amendement), filer de discussion, réactions |
| **A voter** | toutes actions | configurer vote avant premier bulletin, ajuster échéances | – | voter (participation unique), consulter contenus |
| **A mandater** | toutes actions | préparer vote jugement majoritaire, ajuster échéances | candidater tant que vote non ouvert, consulter | voter (unique), voir candidatures |
| **A évaluer** | toutes actions | gérer livrables, lancer/clôturer procédure de révocation | téléverser livrables, répondre aux évaluations, initier demande | commenter (suivi), évaluer livrable (compliant/non), initier révocation si aucune autre ouverte |
| **Archivé** | lecture + purge | lecture | lecture | lecture |

Notes :
- `Admin` reste super-utilisateur, bypass des restrictions.
- `Initiator` inclut créateur + initiateurs de secours.
- `Mandated` = utilisateurs liés à un mandat actif sur la proposition.
- `Contributor` = utilisateurs connectés hors initiateurs/mandatés (spectateurs exclus si nécessaire via settings).
- Actions clés à contrôler : `edit_proposition`, `manage_events`, `configure_vote` (bloqué dès qu’un bulletin existe), `participate_vote`, `upload_deliverable`, `evaluate_deliverable`, `comment_scope.*`, `trigger_revocation`, `manage_permissions`.

## Tests
- Tests Japa d’API couvrant :
  - Transition valide (ex. `A formaliser` → `A clarifier`) et enregistrement d’historique.
  - Refus d’une transition par un utilisateur non autorisé.
  - Création/édition d’un événement par un initiateur, visibilité contrôle.
  - Configuration d’un vote et blocage des modifications après dépôt d’un bulletin.
  - CRUD commentaires/réactions avec scopes corrects.
- Tests unitaires sur `PropositionWorkflowService` pour valider la logique de transition et les erreurs retournées.
- Tests de sérialisation vérifiant la présence des nouvelles propriétés (`status`, `timeline`, `permissions`).
