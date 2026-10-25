# Implementation Plan: Restaurant Assistance Requests System

This plan outlines the implementation of a comprehensive assistance request system for restaurants.

## Phase 1: Database & API Foundation (High Priority)
- **Objective**: Ensure the backend can handle new request status workflows.
- **Tasks**:
  - Update `SupportRequestStatus` in `src/types/support.ts` to include required statuses: `pending` (default), `in_progress`, `waiting_for_restaurant`, `resolved`, `closed`.
  - Create/Update backend handler for `createSupportRequest` (to submit requests).
  - Create/Update backend handler for `updateSupportRequestStatus` (to manage status and replies).
  - Ensure real-time updates via Firestore snapshot listeners in the dashboard.

## Phase 2: Restaurant-Side UI (Assistance Request)
- **Objective**: Enable restaurants to submit and track requests.
- **Tasks**:
  - Add "Request Assistance" button in `AdminSettings.tsx` (top).
  - Create `AssistanceRequestModal` for submitting request descriptions.
  - Create `RestaurantAssistancePage` (e.g., `/r/:slug/admin/assistance`) to manage submitted requests and view super admin replies.

## Phase 3: Super Admin-Side UI (Request Management)
- **Objective**: Enable Super Admins to manage and resolve requests.
- **Tasks**:
  - Create `SuperAdminAssistanceRequests.tsx` (manage requests by restaurant).
  - Implement status update UI (Pending, In Progress, Waiting for Restaurant, Resolved, Closed) with colored badges.
  - Implement a reply interface in the request details view.

## Phase 4: Integration & UX Polish
- **Objective**: Seamless experience and multi-language support.
- **Tasks**:
  - Implement Portuguese (PT) and English (EN) translations for all UI labels.
  - Ensure smooth loading/error states.
  - Final QA on the status change lifecycle.

---
*Please review this plan. I am ready to begin with Phase 1 upon your approval.*
