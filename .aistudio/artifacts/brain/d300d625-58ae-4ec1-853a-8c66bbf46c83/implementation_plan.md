# Implementation Plan: Super Admin Billing & Payments Overhaul

This plan outlines the steps to complete the Billing & Payments Management dashboard for Dine Master Pro.

## Phase 1: Data Aggregation & Infrastructure (High Priority)
- **Objective**: Move from mocked/hardcoded metrics to live database calculations.
- **Tasks**:
  - Implement a backend handler (via Firestore/Cloud SQL as appropriate) to aggregate total revenue, MRR, active subs, outstanding balances, and failed payments directly from the `invoices`, `subscriptions`, and `transactions` collections.
  - Update `SuperAdminBilling.tsx` metrics hook to fetch and utilize these aggregated results.

## Phase 2: Billing Overview & Charts
- **Objective**: Create a professional, data-driven billing overview.
- **Tasks**:
  - Build a `RevenueChart` component (using Recharts) to visualize monthly revenue.
  - Add interactive filtering by date range (7d, 30d, custom), restaurant, and status.
  - Ensure all summary cards support interactive "drill-down" behavior (e.g., clicking "Unpaid Invoices" takes you directly to that filtered list).

## Phase 3: Invoice Management & Creation
- **Objective**: Implement robust invoice administration.
- **Tasks**:
  - Build the dedicated "Invoice Management" sub-tab with:
    - Searchable/filterable table (invoice #, restaurant, period, status, total).
    - Pagination and sorting capabilities.
  - Implement the **Create Invoice** workflow:
    - Modal/Page for selecting restaurant, billing period, and line items.
    - Server-side validation of line item totals and taxes (never trust client-side calculations).
    - Database check to prevent duplicate invoices for the same restaurant/period.

## Phase 4: Subscription & Transaction Refinements
- **Objective**: Polish existing management features.
- **Tasks**:
  - Ensure subscription management allows plan changes with strict validation against available platform plans.
  - Verify transaction management respects provider API capabilities (e.g., only attempt refunds if supported).

## Phase 5: Security, Validation & Polish
- **Objective**: Production-grade stability.
- **Tasks**:
  - Implement strict RBAC (Role-Based Access Control) to ensure only Super Admins can perform sensitive billing/invoicing actions.
  - Ensure consistent loading states, empty states (e.g., "No invoices found for this month"), and error handling across all tabs.
  - Conduct final QA and TypeScript type safety audit.

---
*Please review this plan. I am ready to begin with Phase 1 upon your approval.*
