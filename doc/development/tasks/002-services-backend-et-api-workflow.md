# Tâche 002 · Services backend & API workflow

# Tâche 002 · Services backend & API workflow

**Statut actuel : en cours – transitions + gestion événements/votes/mandats/commentaires exposées via l’API.**

## Prérequis
- ✅ Tâche 001 livrée (structures de données et relations disponibles).
- ✅ Matrice de permissions initiale définie (voir tableau ci-dessous).
- ✅ Inventaire des endpoints/services actuels : `PropositionController.search/create/show/update`, `PropositionService`, `PropositionRepository`, routes `/api/propositions/*`.

## Implémentation
- ✅ `PropositionWorkflowService` introduit : transitions, contrôles d’autorisation (admin/initiators), historisation et calcul des transitions possibles.
- ✅ `PropositionService` mis à jour (création initiale via workflow, méthode `transition`).
- ✅ Endpoint `POST /api/propositions/:id/status` (transition → `PropositionController.updateStatus`).
- ✅ Nouveaux services & endpoints :
  - `PropositionEventController`/`Service` (`/events`: CRUD + permissions initiateur/admin).
  - `PropositionVoteController`/`Service` (`/votes`: création/options, update, changement de statut, suppression, contrôle statut).
  - `PropositionMandateController`/`Service` (`/mandates`: création/mise à jour/suppression avec cascade deliverables/applications/revocations).
  - `PropositionCommentController`/`Service` (`/comments`: création, édition, suppression, contrôles rôles/scope).
- ✅ Validators dédiés (événements, votes, mandats, commentaires, status) + routes enregistrées.
- 🔄 À venir : recalcul des échéances automatiques (tâche 005) et exposition des permissions détaillées côté serialization/UI.
- 🔄 À venir : matrix permissions appliquée finement via policies/middlewares et exposition front complète.
- 🔄 À venir : sérialisation étendue (timeline, permissions détaillées).

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
- ✅ Nouveau scénario E2E `proposition_workflow_api.spec.ts` :
  - Transition initiateur `draft → clarify` (historique vérifié).
  - Blocage d’un contributeur non autorisé (403).
  - Flux complet évènements/votes/mandats/commentaires (création + lecture + droits).
- ✅ Harmonisation des migrations tests (connexion `logs`).
- 🔄 Tests complémentaires à prévoir : granularité permissions (matrix configurable), votes ouverts avec bulletins, modération avancée.
