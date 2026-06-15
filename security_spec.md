# Security Specification: NayePankh Volunteer Management System

This specification outlines the data validation rules, security invariants, and test payload assertions for the Firestore security rules.

## Data Invariants

1. **Unauthenticated Registrations**: Unauthenticated clients can create volunteer records, but they must be strictly structured. They cannot read, list, update, or delete records.
2. **Admin-Only Reads**: Only authenticated admins (specifically `kawaresafa143@gmail.com` or users listed in the `/admins` collection) can read, search, list, update, or delete volunteer records.
3. **No Self-Registration as Admin**: Users cannot add themselves to the `/admins` collection. Only existing admins can write database records in `/admins`.
4. **Data Sanity**: Every registration must include valid fields. Field length limitations and types must be strictly enforced.
5. **No Direct Overwrites of ID**: Document IDs during writes must be well-formed strings.

---

## The "Dirty Dozen" Vulnerability Vectors (Payloads)

We verify that each of these malicious payloads is blocked and returns `PERMISSION_DENIED`.

### 1. Public Read/Scraping
- **Vector**: Attempt to fetch a list of volunteer profiles without logging in.
- **Payload/Query**: `getDocs(collection(db, 'volunteers'))` (unauthenticated)
- **Result**: `PERMISSION_DENIED`

### 2. Privilege Escalation (Self-Admin Registration)
- **Vector**: Creating a document in the `/admins` collection with the applicant's own UID to grant themselves administrative rights.
- **Payload**: Create `/admins/{user_uid}` with `{ "email": "hacker@evil.com", "role": "Administrator" }`
- **Result**: `PERMISSION_DENIED`

### 3. Ghost Field/Shadow Update Injection
- **Vector**: Attempt to store unauthorized arbitrary custom fields under a volunteer document.
- **Payload**: `{ "fullName": "Jane Doe", "email": "jane@example.com", "phone": "1234567890", "city": "Noida", "preferredCauses": ["Education"], "skills": ["Logistics"], "availability": ["Any"], "isVerifiedAdmin": true, "vipStatus": "unlocked" }`
- **Result**: `PERMISSION_DENIED` (Blocks unexpected keys)

### 4. Overly Large Payload Input (Denial of Wallet)
- **Vector**: Writing an astronomical text string in `fullName` or `city` to balloon storage size and exhaust the developer's quota.
- **Payload**: `{ "fullName": "A".repeat(100000), ... }`
- **Result**: `PERMISSION_DENIED` (Strict length limits: `fullName.size() <= 128` and `city.size() <= 128`)

### 5. False/Forged Timestamps
- **Vector**: Submitting registration with a `createdAt` value in the future or past.
- **Payload**: `{ ..., "createdAt": "2030-01-01T00:00:00Z" }`
- **Result**: `PERMISSION_DENIED` (Must match `request.time` exactly)

### 6. Bad Type Injection
- **Vector**: Submitting incorrect types (e.g. passing an object or integer for `fullName` or a number for `phone`).
- **Payload**: `{ "fullName": 12345, ... }`
- **Result**: `PERMISSION_DENIED` (Types must match `is string` / `is list`)

### 7. ID Poisoning Guard (Huge Document ID)
- **Vector**: Writing to a custom document ID with high character length or special injection characters to poison the database.
- **Payload**: Write to `/volunteers/admin_inject_delete_db_with_giant_id_string_...`
- **Result**: `PERMISSION_DENIED` (`isValidId` restricts ID length to <= 128 and matches alphanumeric/hyphen pattern)

### 8. Admin Impersonation via Spoofed Email Auth
- **Vector**: Sign-in using an unverified third-party account with the exact admin email name, hoping the rules solely verify the raw string `request.auth.token.email`.
- **Payload**: Attempt admin operations where `request.auth.token.email == "kawaresafa143@gmail.com"` but `request.auth.token.email_verified == false`.
- **Result**: `PERMISSION_DENIED` (Admin check requires `email_verified == true`)

### 9. Unauthorized Update (Vandalism)
- **Vector**: An unauthenticated user (or general user) attempting to modify another volunteer's information (e.g., changing their city or preferred causes).
- **Payload**: Update `/volunteers/some_volunteer_id` by changing their skills or phone number.
- **Result**: `PERMISSION_DENIED`

### 10. Empty Required Fields
- **Vector**: Registering a blank form to spam the database with empty entries.
- **Payload**: `{ "fullName": "", "email": "", "phone": "", "city": "" }`
- **Result**: `PERMISSION_DENIED` (Must have min size bounds on strings)

### 11. Malformed Lists in Skills or Availability
- **Vector**: Injecting an object or a long array of integers into `skills` or `availability`.
- **Payload**: `{ ... "skills": [9999, false, {}] }`
- **Result**: `PERMISSION_DENIED` (Lists must contain strings and have size bounds)

### 12. Deleting Registrations
- **Vector**: A user or malicious scraper triggering a delete command on a list of volunteer registrations.
- **Payload**: `deleteDoc(doc(db, 'volunteers', 'id'))`
- **Result**: `PERMISSION_DENIED` (Deletes restricted strictly to admin or blocked altogether)

---

## Conflict Report & Mitigation Design
All collections are hardened against the critical attacks:

- **Identity Spoofing**: Blocked by making registration documents non-updatable and non-readable by the client, and forcing administrative verification via `request.auth.token.email_verified == true`.
- **State Shortcutting**: Blocked by strict validation on document creation.
- **Resource Poisoning**: Prevented by validating document IDs via `isValidId()` and forcing size checks `<= 128` for string inputs.
