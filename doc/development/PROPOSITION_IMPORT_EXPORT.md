# Proposition Import/Export System

This documentation describes the complete import/export system for propositions, enabling migration of propositions between different application environments.

## 📋 Overview

The system allows administrators to:
- **Export** one or more propositions with all their associated data
- **Import** propositions into a new environment with intelligent conflict resolution
- **Manage mappings** between source and destination entities
- **Merge** existing propositions with imported data

## 🏗️ Architecture

### Backend (AdonisJS)

#### Created Services

1. **PropositionExportService** (`back/app/services/proposition_export_service.ts`)
   - Exports propositions in JSON format
   - Includes all relations (users, categories, files, votes, mandates, etc.)
   - Encodes files in base64
   - Supports partial exports (with options)

2. **PropositionImportAnalyzerService** (`back/app/services/proposition_import_analyzer_service.ts`)
   - Analyzes the imported file
   - Detects conflicts (missing users, missing categories, duplicates)
   - Generates resolution suggestions
   - Manages temporary import sessions (1h)

3. **PropositionImportExecutorService** (`back/app/services/proposition_import_executor_service.ts`)
   - Executes the import with defined resolutions
   - Creates missing entities
   - Merges existing propositions
   - Manages DB transactions
   - Imports files

#### API Routes

```
POST   /api/admin/propositions/export
POST   /api/admin/propositions/import/analyze
POST   /api/admin/propositions/import/configure
POST   /api/admin/propositions/import/execute
GET    /api/admin/propositions/import/:importId/session
```

#### TypeScript Types

All types are defined in `back/app/types/import_export_types.ts`:
- `ExportData` - Complete export format
- `ExportedProposition` - Exported proposition structure
- `ConflictReport` - Analysis report
- `ImportConflict` - Conflict detail
- `ConflictResolution` - Conflict resolution
- `ImportResult` - Execution result

### Frontend (SvelteKit)

#### Created Pages

1. **Export page** (`front/src/routes/admin/propositions/export/+page.svelte`)
   - Multiple proposition selection with DataTable
   - Export options (history, votes, mandates, etc.)
   - Direct JSON file download

2. **Import page** (`front/src/routes/admin/propositions/import/+page.svelte`)
   - 4-step workflow with progress indicator
   - Visual stepper

3. **Import Components**
   - `ImportStepUpload.svelte` - File upload with drag & drop
   - `ImportStepResolve.svelte` - Conflict resolution
   - `ImportStepExecute.svelte` - Confirmation and execution
   - `ImportStepComplete.svelte` - Final report
   - `ConflictItem.svelte` - Conflict resolution widget

#### Svelte Store

**PropositionImportExportStore** (`front/src/lib/stores/propositionImportExportStore.svelte.ts`)
- Manages import state (step, conflicts, resolutions, result)
- Step navigation methods
- Critical resolution validation

## 🔄 Usage Workflow

### Exporting Propositions

1. Access `/admin/propositions/export`
2. Select propositions to export (via checkboxes)
3. Choose export options (votes, mandates, comments, etc.)
4. Click "Export Selection"
5. The JSON file is automatically downloaded

**File format:** `propositions-export-YYYY-MM-DDTHH-mm-ss.json`

### Importing Propositions

#### Step 1: Upload
1. Access `/admin/propositions/import`
2. Drag-and-drop or select the JSON file
3. Click "Analyze File"

#### Step 2: Conflict Resolution
After analysis, the application automatically detects:

**Conflict Types:**
- **MISSING_USER** (ERROR): User not found
  - Create a new user
  - Map to an existing user
  - Skip the proposition

- **MISSING_CATEGORY** (WARNING): Category not found
  - Create the category
  - Map to an existing category
  - Do not associate a category

- **DUPLICATE_PROPOSITION** (WARNING): Proposition already exists
  - Merge with existing (with field-by-field choice)
  - Create a duplicate
  - Skip

- **MISSING_ASSOCIATED_PROPOSITION** (WARNING): Associated proposition not found
  - Map to an existing proposition
  - Do not create association

**Resolution Interface:**
- Critical conflicts (ERROR) must be resolved
- Warnings (WARNING) are optional
- Each conflict offers multiple strategies
- For merges, field-by-field choice (KEEP_INCOMING, KEEP_CURRENT, MERGE_BOTH)

#### Step 3: Execution
1. Review the summary
2. Click "Start Import"
3. The import executes within a DB transaction

#### Step 4: Report
Result display:
- Number of propositions created
- Number of propositions merged
- Number of users/categories created
- Imported files
- Details per proposition with direct links
- Any errors

## 📊 Export Format

### JSON Structure

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
      "title": "My proposition",
      "summary": "Summary...",
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
      "statusHistory": [...],  // optional
      "votes": [...],          // optional
      "mandates": [...],       // optional
      "comments": [...],       // optional
      "events": [...],         // optional
      "reactions": [...]       // optional
    }
  ]
}
```

### Export Options

```typescript
{
  includeStatusHistory?: boolean   // Status change history
  includeVotes?: boolean           // Configured votes
  includeBallots?: boolean         // Individual ballots
  includeMandates?: boolean        // Assigned mandates
  includeComments?: boolean        // Comments/clarifications
  includeEvents?: boolean          // Scheduled events
  includeReactions?: boolean       // Emoji reactions
}
```

## 🛡️ Security

- Routes accessible only to **administrators** (`isAdmin` middleware)
- Import sessions expire after **1 hour**
- All modifications within **DB transactions** with automatic rollback on error
- Complete data validation before import
- No git hook bypassing or forced commits

## 🧪 Recommended Tests

### Test Scenarios

1. **Basic Export**
   - Export 1 proposition without options
   - Verify generated JSON

2. **Complete Export**
   - Export with all options
   - Verify votes, mandates, comments

3. **Import Without Conflicts**
   - Import into an empty environment
   - Everything should be created automatically

4. **Import With Missing Users**
   - Test automatic creation
   - Test manual mapping

5. **Import With Duplicates**
   - Test field-by-field merge
   - Test skip

6. **Import With Error**
   - Verify complete rollback

### Useful Commands

```bash
# Backend - verify compilation
cd back && npx tsc --noEmit

# Backend - run tests (to be created)
cd back && npm test

# Frontend - verify compilation
cd front && npm run check

# Frontend - build
cd front && npm run build
```

## 📝 Translations

### French
Reference file: `front/messages/propositions_import_export_fr.json`

To be integrated into `front/messages/fr.json` in the `admin.propositions` section

### English
To be created: `front/messages/propositions_import_export_en.json`

## 🔧 Maintenance

### Import Sessions
Sessions are stored in memory with automatic expiration (1h).

**Production:** Implement persistent storage (Redis, DB) for multi-instance clusters.

### File Size
Currently limited to **50 MB** by the validator.

Adjust if needed in `back/app/validators/proposition_import_validator.ts`

### Performance
For large volumes (>100 propositions), consider:
- Batch imports
- Background workers (Bull/Bee Queue)
- Report pagination

## 🚀 Future Improvements

1. **Excel Support** - Export/import XLSX in addition to JSON
2. **Incremental Import** - Synchronization of changes only
3. **Detailed Audit** - Logs of all import/export actions
4. **Preview** - Preview propositions before import
5. **Manual Rollback** - Ability to cancel an import
6. **Scheduling** - Deferred or recurring imports
7. **Public API** - Endpoint for CI/CD automation

## 🐛 Troubleshooting

### Error "Session not found"
The session has expired (>1h). Restart the upload.

### Error "Transaction failed"
Check backend logs for specific SQL error.

### Files Not Imported
Check `storage/` folder permissions and disk quotas.

### Unresolvable Conflict
Verify that the user/category exists or create manually then retry.

## 📚 Resources

- [AdonisJS Documentation - Transactions](https://docs.adonisjs.com/guides/database/transactions)
- [SvelteKit Documentation - Form Actions](https://kit.svelte.dev/docs/form-actions)
- [Paraglide - i18n](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

---

**Author:** Claude Code
**Date:** 2025-10-19
**Version:** 1.0
