# Tâche 001 · Modèle & migrations du workflow

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
- Étendre `propositions` pour ajouter `status`, `status_started_at`, `visibility`, `archived_at`, `settings_snapshot` et les timestamps nécessaires.
- Créer les tables suivantes avec contraintes FK et index :
  - `proposition_status_history` (traçabilité des transitions).
  - `proposition_events` pour milestones/temps d’échange/évaluation.
  - `proposition_votes`, `vote_options`, `vote_ballots` pour gérer votes (phases vote, mandature, révocation).
  - `proposition_mandates`, `mandate_applications` pour gérer mandatés et candidatures.
  - `mandate_deliverables`, `deliverable_evaluations` pour suivi livrables & évaluations.
  - `mandate_revocation_requests` pour procédures de révocation.
  - `proposition_comments`, `proposition_reactions` pour clarifications/amendements/suivi.
- Définir les relations dans les modèles Adonis (`app/models/*`) en respectant les alias (#models).
- Initialiser enums/constantes nécessaires (ex. types d’événements, méthodes de vote) dans `back/app/types`.
- Mettre à jour les seeders si besoin pour refléter les nouveaux champs (statut par défaut `A formaliser`).
- Générer les migrations down correspondantes.

## Tests
- Tests Japa pour vérifier :
  - Création d’une proposition initialise `status`, `visibility` et enregistre un historique.
  - Relations principales (hasMany/belongsTo) fonctionnent (chargement events, votes, mandats, commentaires).
- Tests d’intégration migration : exécuter `node ace migration:run` sur base de test et vérifier la présence des tables/colonnes (via queries SQL ou inspect schema helper).
- Optionnel : test de seed pour s'assurer que les seeds existants fonctionnent avec le nouveau schéma.
