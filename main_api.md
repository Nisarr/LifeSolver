# LiveSolver Main Website API Documentation

This document outlines all the backend API endpoints exposed by the new `LiveSolver Main Website` architecture. The backend is split into microservices, primarily the `auth-service` and `data-service`.

## 1. Auth Service (`/api/auth/*`)
Handles user authentication and account management.

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/verify` - Verify user email/account
- `POST /api/auth/login` - Authenticate user and return a token
- `POST /api/auth/forgot-password` - Initiate password recovery
- `POST /api/auth/reset-password` - Complete password recovery
- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/auth/me` - Get current authenticated user profile (Protected)

*(Note: The `request-detox-otp` and `verify-detox-otp` endpoints from the old system are currently missing in the new Auth Service and need to be implemented).*

## 2. Data Service (`/api/data/*`)
Handles all user data. Requires `Authorization: Bearer <token>`.

- `GET /api/data/all` - Unified sync endpoint that returns ALL user data in one request.
- `GET/POST/PUT/DELETE /api/data/tasks` - Manage tasks
- `GET/POST/PUT/DELETE /api/data/budgets/savings/tx` - Manage savings transactions
- `GET/POST/PUT/DELETE /api/data/budgets/savings/add` - Add savings
- `POST /api/data/habits/complete` - Complete a habit
- `GET /api/data/habits/all` - Fetch all habits

**Generic CRUD Endpoints:**
The data service also provides dynamic CRUD endpoints mapped to the following tables under `/api/data/[table]`:
- `expenses`, `budgets`, `finance`, `habits`
- `inventory`, `inventory_items`, `inventory_categories`
- `notes`, `settings`
- `study_sessions`, `study_topics`, `study_subjects`, `study_chapters_v2`, `study_parts`, `study_goals`, `study_common_presets`
- `savings_transactions`

## 3. AI Service (`/api/ai/*`)
Handles AI interactions.

- `POST /api/ai/enhance` - Process text or chat history with AI

## 4. Health Checks
- `GET /api/health` - Check data service health
- `GET /health` - Service status
