# Cycle de vie des propositions

## Vision d'ensemble
- Objectif : cadencer les contributions, votes et mandats autour d'une proposition avec un suivi clair des échéances.
- Utilisateurs : initiateurs (création et pilotage), contributeurs (interactions, votes), mandatés (exécution et livrables), administrateurs (supervision).
- Principe : chaque proposition évolue selon un statut unique, accompagné d'onglets fonctionnels et de règles métiers spécifiques.

## Statuts cibles et transitions
1. **A formaliser**
   - Création de la proposition et initialisation des 5 échéances obligatoires.
   - Brouillon sauvegardable en privé (invisible) ou en public (liste et contributions ouvertes).
   - Passage automatique en "A clarifier" via publication ou selon date de clarification.
2. **A clarifier**
   - Collecte de questions, réactions "Lu/Question" et compléments.
   - Initiateurs peuvent éditer la proposition, répondre et ajuster les contenus.
3. **A amender**
   - Ajout d'un onglet Amendements avec propositions structurées, temps d'échanges programmés.
   - Modifications de contenu et agenda par les initiateurs.
4. **A voter**
   - Configuration de votes (Oui/Non/Blanc ou multi-options) tant qu'aucune participation n'est enregistrée.
   - Ajustement possible de l'échéance "A voter" et des suivantes.
5. **A mandater**
   - Votes par jugement majoritaire pour désigner les mandatés, gestion des candidatures.
   - Ajustement de l'échéance de mandature et des échéances ultérieures.
6. **A évaluer**
   - Suivi des livrables, uploads horodatés, évaluation des mandats, demandes de révocation.
   - Recalcul automatique des prochaines échéances selon la complétion ou le retard.
7. **Archivé / Clos**
   - Statut final après cycle complet ou décision explicite, consultation en lecture seule.

Transition : chaque changement de statut trace un historique (`proposition_status_histories`) et déclenche les automatisations (notifications, recalculs d'échéance, ajustement permissions).

## Modèle de données cible
### Proposition (`propositions`)
- `id`, `front_id`, `status`, `status_started_at`, `title`, `summary`, `detailed_description`, `smart_objectives`, `impacts`, `mandates_description`, `expertise`,
  `clarification_deadline`, `improvement_deadline`, `vote_deadline`, `mandate_deadline`, `evaluation_deadline`.
- `creator_id`, `visual_file_id`, `settings_snapshot` (options prises au moment de la publication), `visibility` (privé/public en phase A formaliser), timestamps.

### Historique des statuts (`proposition_status_histories`)
- `id`, `proposition_id`, `from_status`, `to_status`, `triggered_by_user_id`, `reason`, `metadata`, `created_at`.

### Evénements & planning (`proposition_events`)
- `id`, `proposition_id`, `type` (`milestone`, `exchange`, `evaluation`), `title`, `description`, `start_date`, `end_date`, `location`, `video_link`, `created_by_user_id`.

### Votes génériques (`proposition_votes`)
- `id`, `proposition_id`, `phase` (`vote`, `mandate`, `revocation`), `method` (`binary`, `multi_choice`, `majority_judgment`), `title`, `description`, `open_at`, `close_at`, `max_selections`, `status`.

### Options de vote (`vote_options`)
- `id`, `vote_id`, `label`, `description`, `position`, `metadata` (ex. mention du mandat concerné).

### Bulletins (`vote_ballots`)
- `id`, `vote_id`, `voter_id`, `recorded_at`, `payload` (structure dépendant de la méthode), `revoked_at`.

### Mandats (`proposition_mandates`)
- `id`, `proposition_id`, `title`, `description`, `holder_user_id`, `status`, `target_objective_ref`, `initial_deadline`, `current_deadline`, `last_status_update_at`.

### Candidatures (`mandate_applications`)
- `id`, `mandate_id`, `applicant_user_id`, `statement`, `submitted_at`, `status`.

### Livrables (`mandate_deliverables`)
- `id`, `mandate_id`, `file_id`, `uploaded_by_user_id`, `uploaded_at`, `label`, `objective_ref`, `auto_filename`, `evaluation_deadline_snapshot`.

### Evaluations de livrables (`deliverable_evaluations`)
- `id`, `deliverable_id`, `evaluator_user_id`, `verdict` (`compliant`, `non_compliant`), `comment`, `recorded_at`.

### Demandes de révocation (`mandate_revocation_requests`)
- `id`, `mandate_id`, `initiated_by_user_id`, `reason`, `created_at`, `status`, `vote_id`, `resolved_at`.

### Commentaires (`proposition_comments`)
- `id`, `proposition_id`, `parent_id`, `author_id`, `scope` (`clarification`, `amendment`, `evaluation`, `mandate`), `visibility`, `content`, `created_at`, `updated_at`.

### Réactions (`proposition_reactions`)
- `id`, `proposition_id`, `author_id`, `type` (`read`, `question`, `agree`, etc.), `created_at`.

## Règles initiateurs
- `A formaliser` :
  - Sauvegarde brouillon, bascule privé/public.
  - Initialisation des échéances (5 étapes) et remplissage automatique des événements "Échéances".
- `A clarifier` :
  - Edition libre de la proposition, réponses aux commentaires, gestion des réactions.
  - Clôture possible du statut après validation interne.
- `A amender` :
  - Ajout/édition/suppression des événements "Temps d'échanges programmés".
  - Intégration des amendements validés directement dans la proposition.
- `A voter` :
  - Configuration du vote (type, options) tant qu'aucun bulletin n'existe.
  - Ajustement de l'échéance `vote` et propagation aux suivantes.
- `A mandater` :
  - Création du vote de mandature par jugement majoritaire.
  - Ajustement échéances mandature et suivantes.
- `A évaluer` :
  - Ajout d'événements "Suivi / CR", uploads de livrables avec association automatique à l'objectif.
  - Création/édition/suppression des demandes de révocation tant que le vote associé n'est pas ouvert.

## Règles contributeurs
- `A formaliser` :
  - Accès selon visibilité publique uniquement.
- `A clarifier` :
  - Réactions "Lu/Question", commentaires texte simple, réponses en fil.
- `A amender` :
  - Commentaires descriptifs d'amendements, fils de discussion, réactions.
- `A voter` :
  - Participation unique à chaque vote actif.
- `A mandater` :
  - Dépôt de candidatures (avant ouverture du vote), participation unique au vote.
- `A évaluer` :
  - Commentaires descriptifs, évaluations des livrables, dépôt de demandes de révocation si aucune autre n'est ouverte, participation unique au vote de révocation.

## Paramétrage et permissions
- Étendre les réglages d'organisation pour définir une matrice de permissions par statut :
  - Exemples de rôles : `initiator`, `contributor`, `mandated`, `admin`, `observer`.
  - Actions unitaires (`edit_proposition`, `open_vote`, `upload_deliverable`, `comment_scope.*`, `trigger_revocation`, etc.) activées/désactivées par statut.
  - Valeurs par défaut fournies, mais surchargeable via `organization.permissions.per_status` dans `settings`.
- Paramètres complémentaires :
  - Seuil "Non conforme" (abs/nbr ou %), délais automatiques (`evaluation_auto_shift`, `revocation_auto_trigger_delay`).
  - Règles de génération de nom de fichier (`deliverable_naming_pattern`).

## Automatisations clés
- Réévaluation automatique des échéances :
  - À la première validation de mandat → prochaine échéance = intervalle mandatation/évaluation.
  - En cas de retard → dernière échéance marquée "non respectée", nouvelle échéance calculée d'après les deux dernières.
- Déclenchement procédure non-conformité :
  - Seuil atteint → ouverture automatique de la procédure (notification mandaté + initiateurs, verrouillage livrable en "Non conforme – procédure en cours").
  - Après délai sans action → repositionnement de l'échéance vote pour lancer un vote révocatoire.
- Historisation :
  - Chaque transition consignée, avec snapshot des permissions effectives et des paramètres utilisés.

## Points à clarifier
- Paramétrage fin des seuils : confirmé → gestion au niveau organisation (pas de déclinaison par proposition).
- Interop CitizenOS : simple inspiration UX ou intégration API nécessaire ?
- Politique d'archivage et purge (RGPD, durée de conservation des commentaires et votes).

## Prochaines étapes
1. Atelier produit pour valider la matrice de permissions par statut et les seuils automatiques.
2. Conception détaillée des migrations et correspondances entités ↔ écrans (diagramme de séquence + maquettes onglets).
3. Prototype backend/UX de la phase "A évaluer" (upload livrable, recalcul échéance, procédures non-conformité) avant extension aux autres statuts.
