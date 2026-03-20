# The Invisible Agent - PRD

## Problem Statement
A specialized ERP for trade agents managing "back-to-back" international orders where the agent's name is not on official documents. Tracks official billed amounts vs. actual total cost and sale price, managing "cash-split" commissions.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (with Fernet field-level encryption)
- **Auth**: JWT (email/password)

## User Personas
- International trade agents who manage back-to-back orders discreetly
- Need mobile-responsive access on the go
- Require secure storage of sensitive financial data

## Core Requirements
1. Triple-Ledger Calculator (Trade entry with auto-calculations)
2. Smart Payment Reminders (30/20/7-day triggers, Collection Heatmap)
3. Analysis Dashboard (Supplier ranking, Customer trust, Cash flow forecast)
4. JWT Authentication
5. Field-level encryption for sensitive "black ledger" fields
6. Demo data seeding without interfering with new accounts

## What's Been Implemented (March 20, 2026)
- [x] JWT auth (register, login, session management)
- [x] Full Trade CRUD with Triple-Ledger Calculator
- [x] Fernet encryption for sensitive financial fields
- [x] Collection Heatmap (Green/Yellow/Red coded)
- [x] In-app notification system with 30/20/7-day triggers
- [x] Dashboard with summary stats, heatmap, quick overview
- [x] Supplier Ranking with quality scores
- [x] Customer Trust Scores with delay tracking
- [x] Cash Flow Forecast with 30-day chart
- [x] Demo data seeding
- [x] Dark theme professional UI
- [x] Mobile-responsive design
- [x] Search and filter on trades
- [x] **Monthly Commission Report** with FY selector + CSV export
- [x] **Best Customer Leaderboard** ranked by commission (FY filtered)
- [x] **Close Trade Dialog** with claims + notes prompt
- [x] **Claims Analysis** with FY comparison (current vs previous year trends)
- [x] **FY Date Filters** on all analytics tabs (Suppliers, Customers, Best Customers, Claims)

## Prioritized Backlog
### P0 (Critical)
- None remaining for MVP

### P1 (High)
- WhatsApp notification integration (user deferred)
- Export trades to CSV/PDF
- Trade status workflow (active → in-transit → completed)

### P2 (Medium)
- Multi-currency support
- Supplier/Customer contact management
- Trade document attachments (LC, invoice uploads)
- Advanced filtering and date range queries

### P3 (Nice to have)
- Dashboard customization (drag/arrange cards)
- Bulk trade import from Excel
- Profit/Loss trend charts over time
- Settings page (profile, preferences)

## Next Tasks
1. WhatsApp message integration for payment reminders
2. Trade export functionality (CSV/PDF)
3. Settings/Profile page
4. Advanced search with date range filters
