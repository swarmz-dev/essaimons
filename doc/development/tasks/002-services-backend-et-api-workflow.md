# Tâche 002 · Services backend & API workflow

# Tâche 002 · Services backend & API workflow

**Statut actuel : en cours – workflow complet (transitions + événements/votes/mandats/commentaires) avec permissions dynamiques.**

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
- ✅ Permissions dynamiques :
  - Stockage dans `SettingsService` (`permissions.per_status` + valeurs par défaut).
  - `PropositionWorkflowService.canPerform` + intégration dans services/controllers (events/votes/mandates/comments, update proposition).
- 🔄 À venir : recalcul des échéances automatiques (tâche 005) et exposition enrichie côté serialization/UI (timeline, liste d’actions autorisées).

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
  - Flux complet évènements/votes/mandats/commentaires (création + lecture + droits, transitions de statut).
- ✅ Harmonisation des migrations tests (connexion `logs`).
- 🔄 Tests complémentaires à prévoir :
  - Couvrir les refus d’actions par rôle/statut (initiator vs contributor/mandated) sur chaque endpoint (`/events`, `/votes`, `/mandates`, `/comments`, transition `/status`).
  - Vérifier la prise en compte des overrides `permissions.per_status` (charger des settings custom puis assurer que `canPerform` reflète les changements).
  - Ajouter un test de vote verrouillé après ouverture (impossibilité de modifier/supprimer une fois status `open`).
  - Ajouter un test commentaire mandaté en phase `evaluate` (autorisé) vs contributeur (refus).
  - Sérialisation : s’assurer que la payload `settings` renvoie bien les permissions et que le détail proposition expose les actions autorisées (à réaliser après enrichissement serializer côté Tâche 002/004).
- ✅ Harmonisation des migrations tests (connexion `logs`).
- 🔄 Tests complémentaires à prévoir : granularité permissions (matrix configurable), votes ouverts avec bulletins, modération avancée.
