# TariffIQ Classification History & Persistence Architecture

## 1. Overview & Core Architecture

TariffIQ provides an immutable, audit-grade historical persistence layer backed by MongoDB. Every classification performed—whether through the manual step-by-step wizard or the natural language AI extraction flow—can be securely recorded for auditing, review, and reporting.

```
USER
 ↓
CLASSIFICATION WORKFLOW
 ↓
USER CONFIRMS PRODUCT FACTS
 ↓
DETERMINISTIC CLASSIFIER (classifyTea / classifyCoffee)
 ↓
FINAL CLASSIFICATION RESULT
 ↓
SERVER RE-VERIFICATION (verifyAndClassifyProduct)
 ↓
MONGODB PERSISTENCE
 ↓
CLASSIFICATION HISTORY AUDIT TRAIL
```

### Architectural Invariants

1. **Deterministic Classifier is the Single Authority**:
   MongoDB is purely a historical persistence store and never the source of truth for tariff classification logic. The tariff rules defined in `tea_rules.json` and `coffee_rules.json` executed by `classifyTea()` and `classifyCoffee()` remain the sole authority.
2. **Server-Side Authority**:
   The server never trusts client-supplied `hsCode`, `matchedRuleId`, `classificationPath`, `reasoning`, `description`, or `classification` objects. The backend always runs the deterministic classifier on the confirmed product attributes before persisting.
3. **Immutability of Historical Records**:
   Saved classification records represent the authoritative classification at the time of creation and preserve the decision trace, rule ID, and input attributes.

---

## 2. MongoDB Data Model

The `Classification` Mongoose model (`server/models/Classification.ts`) structures each record:

```typescript
interface IClassification extends Document {
  userId: mongoose.Types.ObjectId        // Scoped to user account
  productCategory: "tea" | "coffee"      // Product domain
  inputSource: "ai" | "manual"           // Input workflow method
  productDescription?: string            // Raw description (if AI)
  extraction?: ProductExtractionData     // Extracted facts & evidence
  confirmedInput: Record<string, unknown>// User-confirmed physical facts
  classification: StoredClassificationResult // Server-computed deterministic result
  createdAt: Date
  updatedAt: Date
}
```

### Database Indexes

To optimize high-volume queries, pagination, and multi-dimensional filtering, the collection defines compound indexes:
- `{ userId: 1, createdAt: -1 }` (Default newest-first history)
- `{ userId: 1, productCategory: 1, createdAt: -1 }` (Category-filtered history)
- `{ userId: 1, inputSource: 1, createdAt: -1 }` (Source-filtered history)
- `{ userId: 1, "classification.hsCode": 1, createdAt: -1 }` (HS code searches)

---

## 3. API Endpoints

All classification endpoints require authentication and scope operations strictly to `req.user.id`.

### `POST /api/classifications`
Saves a verified classification record.

- **Request Body**:
  ```json
  {
    "productCategory": "coffee",
    "inputSource": "ai",
    "productDescription": "Roasted Arabica plantation coffee beans, Grade A, bulk",
    "extraction": { ... },
    "confirmedInput": {
      "productCategory": "coffee",
      "productType": "coffee",
      "roasted": true,
      "decaffeinated": false,
      "presentation": "bulk",
      "form": "arabica_plantation",
      "grade": "A"
    }
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "status": "success",
    "item": { ... },
    "historyId": "65b9f...8a"
  }
  ```

### `GET /api/classifications`
Retrieves paginated classification history with optional filters.

- **Query Parameters**:
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `20`, maximum `100`)
  - `productCategory`: `"tea"` | `"coffee"`
  - `source` / `inputSource`: `"ai"` | `"manual"`
  - `search`: Search query string across HS code, description, and product text
- **Response** (`200 OK`):
  ```json
  {
    "items": [ ... ],
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
  ```

### `GET /api/classifications/export/csv`
Streams RFC-4180 compliant CSV export for the user's filtered classification records.

### `GET /api/classifications/:id`
Returns a single detailed classification record for the authenticated owner.

### `DELETE /api/classifications/:id`
Deletes a specific classification record from user history. Tariff rules and source schedules are never modified.

---

## 4. Security & Client Tampering Protection

TariffIQ implements defense-in-depth against client payload tampering:

1. **Client HS-Code Spoofing**: If a client sends an arbitrary `hsCode: "99999999"` or spoofed rule ID, `verifyAndClassifyProduct()` runs on the server and generates the authentic deterministic HS code, silently discarding any client-provided code.
2. **Category / Input Mismatch**: Submitting Coffee attributes under `productCategory: "tea"` or vice-versa is validated by the product schema and rejected with `400 INVALID_CLASSIFICATION_INPUT`.
3. **Unsupported Products**: Submitting non-supported categories (such as `"spices"`) returns `400` with supported categories listed.
4. **User Isolation**: Users can only query, view, and delete their own classifications. Attempting to access another user's classification returns `404 NOT_FOUND`.

---

## 5. Input Source Distinction

- **`inputSource: "manual"`**: Form fields selected via step-by-step wizard.
- **`inputSource: "ai"`**: Attributes extracted via Gemini and confirmed/edited by user.
- **Invariant**: Both entry paths use identical deterministic classification engines. The UI displays **"AI-assisted"** (never "AI classified") to maintain strict transparency.

---

## 6. Duplicate Protection & Error Resilience

1. **Frontend Duplicate Protection**: `ClassificationWizard` computes a hash of the confirmed input attributes and employs an active submission lock to prevent duplicate POST requests on rapid clicks.
2. **Retry Save Capability**: If network or database errors occur during persistence, the classification result remains visible on screen with a **Retry Save** action.

---

## 7. CSV Export & Reporting

The history interface allows users to export their filtered history records to CSV format with RFC-4180 escaping.
- **Columns**: `Date`, `Product Category`, `Source`, `HS Code`, `Description`, `Matched Rule`, `Product / Input Summary`.
- **Security**: No passwords, API keys, credentials, or internal MongoDB IDs are exported.
