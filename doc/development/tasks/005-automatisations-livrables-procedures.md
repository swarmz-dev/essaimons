# Tâche 005 · Automatisations livrables & procédures

**Statut actuel : livrée et corrigée – automatisations back/front en place (recalcul d'échéances, procédure non conforme, vote révocatoire). Correctifs critiques appliqués (2025-01-30).**

## Prérequis
- Tâches 001 et 002 complètes pour disposer des tables et services de base.
- Seuils et délais configurés via Tâche 003 (gérés au niveau organisation, portée confirmée).
- Paramètres d'automatisation validés : déclenchement évènementiel des recalculs (cooldown minimal de 10 minutes), offsets et seuils initialisés dans `workflowAutomation` avec des valeurs par défaut adaptées à un petit projet.

## Implémentation
- Étendre `workflowAutomation` côté back/front pour exposer les paramètres suivants (avec valeurs par défaut minimales) :
  - `deliverableRecalcCooldownMinutes` → 10 minutes ;
  - `evaluationAutoShiftDays` → offset fixe pour les itérations suivantes (valeur par défaut conservatrice de 14 jours si aucun override n'est fourni) ;
  - `nonConformityPercentThreshold` → pourcentage de votes "pour" déclenchant la procédure (par défaut 10 %) ;
  - `nonConformityAbsoluteFloor` → nombre minimal de votes "pour" à atteindre (par défaut 5) ;
  - `revocationAutoTriggerDelayDays` → délai d'inaction en jours calendaires avant passage au vote révocatoire (par défaut 7) ;
  - `revocationCheckFrequencyHours` → cadence du job de surveillance (par défaut toutes les 24 h).
- Créer un job Adonis ou un scheduler dédié pour recalculer les échéances (`evaluationDeadline`, `mandateDeadline`) lors des uploads de livrables ou des retards détectés, en respectant le cooldown de 10 minutes entre deux exécutions pour une même proposition/mandat.
- Implémenter la logique :
  - Première échéance calculée depuis validation mandature.
  - Retard → marquage "non respectée" + nouvelle échéance basée sur l'offset `evaluationAutoShiftDays`.
- Gérer la procédure "Non conforme" :
  - Calcul du seuil via `nonConformityPercentThreshold` combiné au plancher `nonConformityAbsoluteFloor` sur `deliverable_evaluations`.
  - Déclenchement automatique : flag sur le livrable, ouverture des commentaires au mandaté, notifications.
  - Délai d’inaction (jours calendaires) → repositionnement échéance de vote pour lancer vote révocatoire, contrôlé selon `revocationCheckFrequencyHours`.
- Créer la demande de révocation automatique/manuelle (liaison `mandate_revocation_requests` + vote phase `revocation`).
- Mettre à jour les serializers pour exposer l’historique des échéances, statut livrable, procédures en cours et les nouveaux paramètres d'automatisation.

### Livraison effective
- `back/app/services/deliverable_automation_service.ts`
  - `handleDeliverableCreated` et `handleEvaluationRecorded` appliquent le cooldown, recalculent `mandateDeadline`/`evaluationDeadline`, marquent les retards et mettent à jour les métadonnées (statut livrable, procédure, historique).
  - `runDeadlineSweep` déclenche automatiquement le recalcul des mandats en retard (raison « late_detection »), tandis que `runRevocationSweep` escalade les livrables non conformes vers un vote révocatoire.
- `back/start/automation.ts` planifie les deux routines d’automatisation (recalcul & révocation) selon `workflowAutomation.revocationCheckFrequencyHours` hors environnement de test.
- `back/app/services/storage/storage_manager.ts` force `tmp/test-storage` comme base locale lorsque `NODE_ENV=test`, garantissant que les tests et automatisations n’écrivent pas dans `static/`.
- Sérialisation enrichie : `serializeMandateDeliverable` expose `nonConformityFlaggedAt`, statut et procédure ; `serializeMandate` inclut `lastAutomationRunAt` et l’historique `deadlineHistory` pour l’UI.
- Front SvelteKit : les paramètres `workflowAutomation` et les statuts/procédures livrables sont reflétés dans les stores et écrans (organisation, détail proposition) pour afficher les échéances recalculées et procédures en cours.

## Tests
- Tests unitaires sur la logique de recalcul (cas première échéance, retard, multiples itérations).
- Tests Japa d'intégration vérifiant :
  - Upload livrable → création record, association mandat, recalcul échéance avec respect du cooldown.
  - Livrable en retard → historique marque non respecté + nouvelle échéance (vérifier dates).
  - Atteinte du seuil non conforme → création automatique d'une demande de procédure.
  - Délai expiré → création vote révocatoire programmé (en tenant compte de la cadence configurée).
- Tests e2e Playwright pour un mandaté : upload dans les temps vs en retard, visualisation UI (statut, prochaine échéance, procédure).

## Correctifs appliqués (2025-01-30)

### 1. Création de mandat - Erreur de type DateTime
**Problème :** Erreur "Invalid value for PropositionMandate.initialDeadline. It must be an instance of luxon.DateTime" lors de la création d'un mandat.

**Cause :** La méthode `normalizePayload` dans `PropositionMandateService` parsait les dates en objets JavaScript `Date` au lieu de `luxon.DateTime`.

**Solution :** Modification de [proposition_mandate_service.ts:144](back/app/services/proposition_mandate_service.ts#L144) pour utiliser `DateTime.fromISO()` au lieu de `new Date()`.

### 2. Affichage du titulaire de mandat
**Problème :** L'ID utilisateur s'affichait au lieu du nom d'utilisateur dans les détails du mandat.

**Cause :** La relation `holder` n'était pas préchargée après création/mise à jour du mandat.

**Solution :** Ajout du préchargement de la relation `holder` dans les méthodes `create` et `update` de `PropositionMandateService` ([proposition_mandate_service.ts:82-84](back/app/services/proposition_mandate_service.ts#L82-L84), [proposition_mandate_service.ts:119-121](back/app/services/proposition_mandate_service.ts#L119-L121)).

### 3. Upload de livrable - Blocage de la requête
**Problème :** L'upload de livrable se bloquait sans réponse du serveur.

**Causes multiples :**
- Requêtes côté client envoyées sans le préfixe `/api` (attendu par les routes backend)
- Token d'authentification inaccessible car cookie `httpOnly: true`
- Hook `beforeFind/beforeFetch` sur le modèle User qui préchargeait automatiquement `profilePicture`, causant des erreurs quand `profilePictureId` était null
- Relations non préchargées après commit de transaction

**Solutions :**
- Ajout du préfixe `/api` dans `requestService.ts` en utilisant la variable d'environnement `PUBLIC_API_BASE_URI`
- Lecture du token depuis les cookies et envoi via header `Authorization: Bearer`
- Changement de `httpOnly: true` à `httpOnly: false` pour les cookies de token (temporaire pour dev)
- Désactivation des hooks `beforeFind/beforeFetch` dans le modèle User ([user.ts:70-75](back/app/models/user.ts#L70-L75))
- Modification de `User.apiSerialize()` pour vérifier si `profilePicture` est préchargé avant d'y accéder ([user.ts:99](back/app/models/user.ts#L99))
- Suppression des appels `.select()` limitant les colonnes lors du préchargement des relations User (causait des échecs silencieux)
- Ajout de `refresh()` sur les modèles après commit de transaction ([mandate_deliverable_service.ts:126-129](back/app/services/mandate_deliverable_service.ts#L126-L129))
- Préchargement explicite de la relation `creator` sur la proposition ([mandate_deliverable_service.ts:127](back/app/services/mandate_deliverable_service.ts#L127))

### 4. Configuration CORS et cookies
**Problème :** Les cookies n'étaient pas envoyés dans les requêtes cross-origin (frontend:5173 → backend:3333).

**Solution :**
- Configuration `sameSite: false` en développement dans [app.ts:38](back/config/app.ts#L38) pour permettre l'envoi de cookies cross-origin
- Configuration CORS avec `credentials: true` déjà en place dans [cors.ts](back/config/cors.ts)

### 5. Limites de body parser
**Problème :** Potentielles erreurs silencieuses lors de l'upload de fichiers >20MB.

**Solution :** Augmentation de la limite multipart de 20MB à 100MB dans [bodyparser.ts:46](back/config/bodyparser.ts#L46).

### Notes de déploiement
- ⚠️ En production, remettre `httpOnly: true` pour les cookies de token pour des raisons de sécurité
- ⚠️ Vérifier que `sameSite: 'none'` avec `secure: true` fonctionne en production HTTPS
- Les hooks User désactivés ne posent pas de problème car `profilePicture` est explicitement préchargé quand nécessaire
