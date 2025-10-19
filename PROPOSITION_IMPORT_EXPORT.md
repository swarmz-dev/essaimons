# Système d'Import/Export de Propositions

Cette documentation décrit le système complet d'import/export de propositions permettant de migrer des propositions entre différents environnements de l'application.

## 📋 Vue d'ensemble

Le système permet aux administrateurs de :
- **Exporter** une ou plusieurs propositions avec toutes leurs données associées
- **Importer** des propositions dans un nouvel environnement avec résolution intelligente des conflits
- **Gérer les mappings** entre entités source et destination
- **Fusionner** des propositions existantes avec des données importées

## 🏗️ Architecture

### Backend (AdonisJS)

#### Services créés

1. **PropositionExportService** (`back/app/services/proposition_export_service.ts`)
   - Exporte les propositions au format JSON
   - Inclut toutes les relations (users, categories, files, votes, mandates, etc.)
   - Encode les fichiers en base64
   - Supporte les exports partiels (avec options)

2. **PropositionImportAnalyzerService** (`back/app/services/proposition_import_analyzer_service.ts`)
   - Analyse le fichier importé
   - Détecte les conflits (users manquants, catégories manquantes, doublons)
   - Génère des suggestions de résolution
   - Gère les sessions d'import temporaires (1h)

3. **PropositionImportExecutorService** (`back/app/services/proposition_import_executor_service.ts`)
   - Exécute l'import avec les résolutions définies
   - Crée les entités manquantes
   - Fusionne les propositions existantes
   - Gère les transactions DB
   - Importe les fichiers

#### Routes API

```
POST   /api/admin/propositions/export
POST   /api/admin/propositions/import/analyze
POST   /api/admin/propositions/import/configure
POST   /api/admin/propositions/import/execute
GET    /api/admin/propositions/import/:importId/session
```

#### Types TypeScript

Tous les types sont définis dans `back/app/types/import_export_types.ts` :
- `ExportData` - Format complet d'export
- `ExportedProposition` - Structure d'une proposition exportée
- `ConflictReport` - Rapport d'analyse
- `ImportConflict` - Détail d'un conflit
- `ConflictResolution` - Résolution d'un conflit
- `ImportResult` - Résultat de l'exécution

### Frontend (SvelteKit)

#### Pages créées

1. **Page d'export** (`front/src/routes/admin/propositions/export/+page.svelte`)
   - Sélection multiple de propositions avec DataTable
   - Options d'export (historique, votes, mandats, etc.)
   - Téléchargement direct du fichier JSON

2. **Page d'import** (`front/src/routes/admin/propositions/import/+page.svelte`)
   - Workflow en 4 étapes avec indicateur de progression
   - Stepper visuel

3. **Composants d'import**
   - `ImportStepUpload.svelte` - Upload du fichier avec drag & drop
   - `ImportStepResolve.svelte` - Résolution des conflits
   - `ImportStepExecute.svelte` - Confirmation et exécution
   - `ImportStepComplete.svelte` - Rapport final
   - `ConflictItem.svelte` - Widget de résolution d'un conflit

#### Store Svelte

**PropositionImportExportStore** (`front/src/lib/stores/propositionImportExportStore.svelte.ts`)
- Gère l'état de l'import (step, conflits, résolutions, résultat)
- Méthodes de navigation entre étapes
- Validation des résolutions critiques

## 🔄 Workflow d'utilisation

### Export de propositions

1. Accéder à `/admin/propositions/export`
2. Sélectionner les propositions à exporter (via checkboxes)
3. Choisir les options d'export (votes, mandates, comments, etc.)
4. Cliquer sur "Exporter la sélection"
5. Le fichier JSON est téléchargé automatiquement

**Format du fichier :** `propositions-export-YYYY-MM-DDTHH-mm-ss.json`

### Import de propositions

#### Étape 1 : Upload
1. Accéder à `/admin/propositions/import`
2. Glisser-déposer ou sélectionner le fichier JSON
3. Cliquer sur "Analyser le fichier"

#### Étape 2 : Résolution des conflits
Après l'analyse, l'application détecte automatiquement :

**Types de conflits :**
- **MISSING_USER** (ERROR) : Utilisateur introuvable
  - Créer un nouvel utilisateur
  - Mapper sur un utilisateur existant
  - Ignorer la proposition

- **MISSING_CATEGORY** (WARNING) : Catégorie introuvable
  - Créer la catégorie
  - Mapper sur une catégorie existante
  - Ne pas associer de catégorie

- **DUPLICATE_PROPOSITION** (WARNING) : Proposition déjà existante
  - Fusionner avec l'existante (avec choix par champ)
  - Créer un doublon
  - Ignorer

- **MISSING_ASSOCIATED_PROPOSITION** (WARNING) : Proposition associée introuvable
  - Mapper sur une proposition existante
  - Ne pas créer d'association

**Interface de résolution :**
- Les conflits critiques (ERROR) doivent être résolus
- Les avertissements (WARNING) sont optionnels
- Chaque conflit propose plusieurs stratégies
- Pour les fusions, choix champ par champ (KEEP_INCOMING, KEEP_CURRENT, MERGE_BOTH)

#### Étape 3 : Exécution
1. Vérifier le résumé
2. Cliquer sur "Lancer l'import"
3. L'import s'exécute dans une transaction DB

#### Étape 4 : Rapport
Affichage du résultat :
- Nombre de propositions créées
- Nombre de propositions fusionnées
- Nombre d'utilisateurs/catégories créés
- Fichiers importés
- Détails par proposition avec liens directs
- Erreurs éventuelles

## 📊 Format d'export

### Structure JSON

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-10-19T10:30:00Z",
  "exportedBy": {
    "userId": "uuid",
    "username": "admin@example.com",
    "email": "admin@example.com"
  },
  "sourceEnvironment": {
    "name": "Essaimons",
    "instanceId": "optional-instance-id"
  },
  "propositions": [
    {
      "sourceId": "uuid-from-source",
      "title": "Ma proposition",
      "summary": "Résumé...",
      "detailedDescription": "Description...",
      "status": "VOTE",
      "visibility": "PUBLIC",
      "externalReferences": {
        "creator": {
          "sourceId": "user-uuid",
          "username": "john.doe",
          "email": "john@example.com",
          "displayName": "John Doe",
          "role": "USER"
        },
        "categories": [
          {
            "sourceId": "cat-uuid",
            "name": "Innovation"
          }
        ],
        "visual": {
          "sourceId": "file-uuid",
          "name": "image.png",
          "extension": ".png",
          "mimeType": "image/png",
          "size": 12345,
          "data": "base64-encoded-content..."
        },
        "attachments": [...],
        "associatedPropositions": [...]
      },
      "statusHistory": [...],  // optionnel
      "votes": [...],          // optionnel
      "mandates": [...],       // optionnel
      "comments": [...],       // optionnel
      "events": [...],         // optionnel
      "reactions": [...]       // optionnel
    }
  ]
}
```

### Options d'export

```typescript
{
  includeStatusHistory?: boolean   // Historique des changements de statut
  includeVotes?: boolean           // Votes configurés
  includeBallots?: boolean         // Bulletins de vote individuels
  includeMandates?: boolean        // Mandats attribués
  includeComments?: boolean        // Commentaires/clarifications
  includeEvents?: boolean          // Événements planifiés
  includeReactions?: boolean       // Réactions emoji
}
```

## 🛡️ Sécurité

- Routes accessibles uniquement aux **administrateurs** (middleware `isAdmin`)
- Sessions d'import expirées après **1 heure**
- Toutes les modifications en **transaction DB** avec rollback automatique en cas d'erreur
- Validation complète des données avant import
- Pas de bypass des hooks git ou de commit forcé

## 🧪 Tests recommandés

### Scénarios de test

1. **Export basique**
   - Exporter 1 proposition sans options
   - Vérifier le JSON généré

2. **Export complet**
   - Exporter avec toutes les options
   - Vérifier les votes, mandates, comments

3. **Import sans conflit**
   - Importer dans un environnement vide
   - Tout doit être créé automatiquement

4. **Import avec utilisateurs manquants**
   - Tester la création automatique
   - Tester le mapping manuel

5. **Import avec doublons**
   - Tester la fusion champ par champ
   - Tester le skip

6. **Import avec erreur**
   - Vérifier le rollback complet

### Commandes utiles

```bash
# Backend - vérifier la compilation
cd back && npx tsc --noEmit

# Backend - lancer les tests (à créer)
cd back && npm test

# Frontend - vérifier la compilation
cd front && npm run check

# Frontend - build
cd front && npm run build
```

## 📝 Traductions

### Français
Fichier de référence : `front/messages/propositions_import_export_fr.json`

À intégrer dans `front/messages/fr.json` dans la section `admin.propositions`

### Anglais
À créer : `front/messages/propositions_import_export_en.json`

## 🔧 Maintenance

### Sessions d'import
Les sessions sont stockées en mémoire avec expiration automatique (1h).

**Production :** Implémenter un stockage persistant (Redis, DB) pour les clusters multi-instances.

### Taille des fichiers
Actuellement limité à **50 MB** par le validator.

Ajuster si nécessaire dans `back/app/validators/proposition_import_validator.ts`

### Performance
Pour de gros volumes (>100 propositions), considérer :
- Import par batches
- Workers background (Bull/Bee Queue)
- Pagination du rapport

## 🚀 Améliorations futures

1. **Support Excel** - Export/import XLSX en plus de JSON
2. **Import incrémental** - Synchronisation des changements uniquement
3. **Audit détaillé** - Logs de toutes les actions d'import/export
4. **Prévisualisation** - Aperçu des propositions avant import
5. **Rollback manuel** - Possibilité d'annuler un import
6. **Planification** - Import différé ou récurrent
7. **API publique** - Endpoint pour automatisation CI/CD

## 🐛 Dépannage

### Erreur "Session not found"
La session a expiré (>1h). Recommencer l'upload.

### Erreur "Transaction failed"
Vérifier les logs backend pour l'erreur SQL spécifique.

### Fichiers non importés
Vérifier les permissions du dossier `storage/` et les quotas disque.

### Conflit non résolvable
Vérifier que l'utilisateur/catégorie existe ou créer manuellement puis réessayer.

## 📚 Ressources

- [Documentation AdonisJS - Transactions](https://docs.adonisjs.com/guides/database/transactions)
- [Documentation SvelteKit - Form Actions](https://kit.svelte.dev/docs/form-actions)
- [Paraglide - i18n](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

---

**Auteur :** Claude Code
**Date :** 2025-10-19
**Version :** 1.0
