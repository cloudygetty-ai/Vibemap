# Vibemap Test Coverage Analysis

## Current State

**Test coverage: 0%.** The codebase has no test framework configured, no test files, and no test scripts. The `.gitignore` includes a `/coverage` entry suggesting testing was planned but never implemented.

### Source Files Inventory

| File | Type | Lines | Testable Logic |
|------|------|-------|----------------|
| `server/index.js` | Backend | 44 | Socket.io event handlers, Redis geo queries, PostgreSQL writes |
| `client/components/VibeMap.js` | Frontend | 42 | Map initialization, geolocation tracking, Socket.io emission |
| `client/components/VibeControl.js` | Frontend | 21 | View mode state management, conditional rendering |
| `schema.sql` | Database | 24 | Table definitions, spatial indexes |

---

## Recommended Test Areas (Priority Order)

### 1. Server Socket Event Handlers (Critical)

**File:** `server/index.js`

The server contains all backend business logic in three Socket.io event handlers with zero error handling or input validation. This is the highest-priority area for testing.

#### `update_location` handler (line 19-28)
- **What to test:**
  - Valid location updates are stored in Redis via `geoAdd`
  - `geoSearch` returns nearby users within 1km radius
  - The `nearby_update` event is emitted back to the calling socket with the correct IDs
  - Invalid/missing `userId`, `lat`, or `lng` values are handled gracefully
  - Non-numeric or out-of-range coordinates (lat > 90, lng > 180) are rejected
  - Redis connection failures don't crash the server

#### `set_vibe` handler (line 31-34)
- **What to test:**
  - Vibe logs are inserted into PostgreSQL with correct `ST_MakePoint` geometry
  - The `global_vibe_change` event is broadcast to all connected clients
  - Invalid `vibeType` values outside the expected set (`'chill'`, `'intense'`, `'busy'`) are rejected
  - SQL injection is prevented (parameterized queries are used, but this should be verified)
  - PostgreSQL connection failures are handled

#### `join_video_room` handler (line 37-40)
- **What to test:**
  - Socket joins the correct room
  - `user_joined_call` is emitted to other room members (not the joining socket)
  - Empty or missing `roomId` is handled

**Suggested approach:** Use Jest with `socket.io-client` for integration tests and mock Redis/PostgreSQL clients for unit tests.

---

### 2. Input Validation (Critical - Currently Missing)

No input validation exists anywhere in the codebase. Tests should be written alongside validation logic for:

- **Coordinates:** `lat` must be in [-90, 90], `lng` in [-180, 180], both must be numbers
- **userId:** Must be a non-empty string, should be sanitized
- **vibeType:** Must be one of the allowed enum values (`'chill'`, `'intense'`, `'busy'`)
- **roomId:** Must be a non-empty string

This is both a testing gap and a security gap. Writing tests here would force the creation of validation logic that currently doesn't exist.

---

### 3. Frontend Component Rendering (Moderate)

**File:** `client/components/VibeControl.js`

- **What to test:**
  - Default render shows street view mode
  - Clicking "360 View" button sets `viewMode` to `'street'`
  - Clicking "Live Video" button sets `viewMode` to `'video'` and renders `VideoRoom`
  - `activeLocation` prop is passed through to child components
  - Component renders without crashing when `activeLocation` is undefined (currently would throw accessing `.id`)

**Note:** `VibeControl.js` uses `useState` but doesn't import it - this is a bug that tests would catch.

**Suggested approach:** React Testing Library with Jest.

---

### 4. Frontend Map Component (Moderate)

**File:** `client/components/VibeMap.js`

- **What to test:**
  - Mapbox is initialized with the correct config (dark-v11 style, NYC center, pitch/bearing)
  - Geolocation watch is started on mount
  - Location updates are emitted via Socket.io with the correct payload shape
  - The 3D building layer is added after map load
  - Component cleans up on unmount (currently it does NOT - geolocation watch is never cleared, socket is never disconnected)

**Note:** The socket is initialized at module scope (line 6), which makes it hard to test and creates a shared singleton. Tests would likely require module mocking.

**Suggested approach:** Jest with module mocks for `mapbox-gl`, `socket.io-client`, and `navigator.geolocation`.

---

### 5. Database Schema Validation (Low)

**File:** `schema.sql`

- **What to test:**
  - Schema applies cleanly to a fresh PostgreSQL + PostGIS database
  - `profiles` table accepts valid geographic points
  - `vibe_logs` table enforces valid vibe types (currently it does not - `vibe_type` is unconstrained `TEXT`)
  - Spatial indexes are created and used by queries
  - `ST_MakePoint` queries used in the server work against the actual schema

**Suggested approach:** Use a test PostgreSQL container (via Docker or `pg-mem`) and run schema migrations + queries.

---

## Bugs and Issues Tests Would Catch

1. **Missing `useState` import in `VibeControl.js`** - The component uses `useState` but only imports `StreetViewer` and `VideoRoom`. This will crash at runtime.

2. **No cleanup in `VibeMap.js`** - The `useEffect` never returns a cleanup function. The geolocation watcher and socket connection leak on unmount.

3. **No error handling in server** - All three Socket.io handlers use `await` but have no `try/catch`. Any Redis or PostgreSQL failure will produce an unhandled promise rejection.

4. **Unconstrained `vibe_type`** - The schema defines `vibe_type` as `TEXT` with no `CHECK` constraint, so any string is accepted.

5. **Hardcoded `userId: 'me'`** in `VibeMap.js` (line 22) - Every user broadcasts with the same ID, so Redis geo-index only tracks one entry.

---

## Recommended Test Framework Setup

```
npm install --save-dev jest @testing-library/react @testing-library/jest-dom socket.io-client socket.io-mock
```

### Suggested directory structure:
```
server/
  __tests__/
    socket-handlers.test.js    # Socket.io event handler tests
    validation.test.js         # Input validation tests
client/
  components/
    __tests__/
      VibeMap.test.js          # Map component tests
      VibeControl.test.js      # Control panel tests
```

### Suggested `package.json` test script:
```json
{
  "scripts": {
    "test": "jest",
    "test:server": "jest --testPathPattern=server",
    "test:client": "jest --testPathPattern=client",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Summary

| Area | Priority | Current Coverage | Estimated Effort |
|------|----------|-----------------|-----------------|
| Server socket handlers | Critical | 0% | Medium |
| Input validation | Critical | 0% (validation doesn't exist) | Medium |
| VibeControl component | Moderate | 0% | Low |
| VibeMap component | Moderate | 0% | Medium (mocking) |
| Database schema | Low | 0% | Medium (needs container) |

The most impactful first step would be setting up Jest, extracting the server's socket handlers into testable functions, and writing unit tests with mocked Redis/PostgreSQL clients. This would cover the most complex logic in the codebase and catch the existing bugs listed above.
