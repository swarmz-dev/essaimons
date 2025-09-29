# Tâche 001 · Modèle & migrations du workflow

**Statut actuel : ✅ terminé (migrations, modèles et tests validés).**

## Prérequis
- Validation du périmètre fonctionnel décrit dans `doc/development/cycle_de_vie_propositions.md` (statuts, règles par phase).
- Inventaire des tables existantes pour éviter collisions — réalisé (voir inventaire ci-dessous).
- Conventions de nommage et archivage — validées (voir ci-dessous).
- Disponibilité d’un environnement de développement avec base vierge pour exécuter les migrations.

### Inventaire des tables existantes (réalisé)
| Table | Migration d'origine | Rôle principal |
| ----- | ------------------- | -------------- |
| `files` | `1690148831300_create_files_table.ts` | Métadonnées des fichiers stockés (nom, chemin, type, taille, usage). |
| `languages` | `1691148831301_create_languages_table.ts` | Gestion des langues disponibles et du fallback. |
| `users` | `1700861155828_create_users_table.ts` | Comptes utilisateurs applicatifs avec rôles. |
| `auth_access_tokens` | `1700861155829_create_access_tokens_table.ts` | Jetons d’accès API liés aux utilisateurs. |
| `user_tokens` | `1727370012280_create_user_tokens_table.ts` | Jetons temporaires (reset, vérifications). |
| `settings` | `1759051000000_create_settings_table.ts` | Stockage clé/valeur des paramètres organisationnels. |
| `proposition_categories` | `1758328085000_create_propositions_tables.ts` | Catégories disponibles pour classer les propositions. |
| `propositions` | `1758328085000_create_propositions_tables.ts` | Données principales d’une proposition (textes, échéances, rattachements). |
| `proposition_category_pivot` | `1758328085000_create_propositions_tables.ts` | Pivot propositions ↔ catégories. |
| `proposition_rescue_initiators` | `1758328085000_create_propositions_tables.ts` | Pivot propositions ↔ utilisateurs « initiateurs de secours ». |
| `proposition_attachments` | `1758328085000_create_propositions_tables.ts` | Pivot propositions ↔ fichiers joints. |
| `proposition_associations` | `1758328085000_create_propositions_tables.ts` | Association bidirectionnelle entre propositions. |
| `log_users` | `logs/1700861155828_create_users_table.ts` | Comptes techniques pour journalisation des accès. |
| `logs` | `logs/1711148831301_create_logs_table.ts` | Journal des requêtes HTTP et réponses associées. |

### Conventions de nommage et archivage (validées)
- Préfixer toutes les nouvelles tables spécifiques au workflow par `proposition_` (cohérence avec le schéma actuel).
- Normaliser les valeurs d’état via une enum documented : `draft`, `clarify`, `amend`, `vote`, `mandate`, `evaluate`, `archived`.
- Mapper l’interface utilisateur (`A formaliser`, `A clarifier`, etc.) avec ces valeurs internes dans les serializers.
- Ajouter un champ `archived_at` sur `propositions` pour tracer la date de bascule en archive; aucun déplacement physique n’est prévu.

## Implémentation
- ✅ `propositions` étendue (`status`, `status_started_at`, `visibility`, `archived_at`, `settings_snapshot`).
- ✅ Nouvelle migration `1760000000000_update_propositions_workflow.ts` créant :
  - `proposition_status_histories`, `proposition_events`, `proposition_votes`, `vote_options`, `vote_ballots`,
    `proposition_mandates`, `mandate_applications`, `mandate_deliverables`, `deliverable_evaluations`,
    `mandate_revocation_requests`, `proposition_comments`, `proposition_reactions` (+ index & FK).
- ✅ Modèles Adonis ajoutés pour chaque table et relations exposées dans `Proposition`.
- ✅ Enums/export `#types` complétés pour statuts, visibilités, votes, mandats, réactions…
- ✅ Seeder `40_proposition_seeder` mis à jour (statut par défaut `draft`, historique initial).
- ⚠️ Prévoir alignement des services/validators front/back (tâches 002+).

## Tests
- ✅ Nouveau test E2E `proposition_workflow_schema.spec.ts` couvrant l’initialisation du workflow.
- ✅ Suite backend repassée (`npm test --workspace back`), seules les specs S3 sont ignorées faute de configuration.
- À garder en tête lors des prochains travaux : relancer `node ace migration:fresh --seed && node ace migration:run --connection=logs` avant les tests quand le schéma évolue.
