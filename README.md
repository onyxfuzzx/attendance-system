# Chronos Attendance System

A production-grade, full-stack employee attendance management system built with geospatial verification, role-based access control, and real-time shift scheduling. Designed for organizations that require location-verified attendance tracking with administrative oversight.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [Core Features](#core-features)
7. [API Reference](#api-reference)
8. [Frontend Pages](#frontend-pages)
9. [Geofence Verification Engine](#geofence-verification-engine)
10. [Project Structure](#project-structure)
11. [Prerequisites](#prerequisites)
12. [Installation and Setup](#installation-and-setup)
13. [Configuration](#configuration)
14. [Running the Application](#running-the-application)
15. [Default Credentials](#default-credentials)
16. [Security Considerations](#security-considerations)

---

## Project Overview

Chronos is a web-based attendance management platform that replaces traditional paper-based or card-swipe attendance systems with a geographically-verified, QR code-driven solution. Employees mark their attendance by scanning a location-specific QR code from within a defined geofence radius. The system validates the employee's GPS coordinates against the registered location's center point and radius, ensuring physical presence at the designated workplace.

The platform supports two distinct user roles: administrators who manage the entire workforce, locations, shifts, and audit trails; and employees who can scan for attendance, view their own records, and manage their profile. Data visibility is strictly enforced at the backend level: employees can only ever access their own attendance records, while administrators have unrestricted access to the complete organizational dataset.

---

## System Architecture

The application follows a classic three-tier architecture:

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|   React SPA       | <---> |   Express API     | <---> |   MS SQL Server   |
|   (Frontend)      |  HTTP |   (Backend)       |  ODBC |   (Database)      |
|   Port 5173       |       |   Port 3000       |       |   SQLExpress      |
|                   |       |                   |       |                   |
+-------------------+       +-------------------+       +-------------------+
```

The frontend is a single-page application built with React 18 and TypeScript. It communicates with the backend exclusively through RESTful HTTP calls, with authentication tokens managed via HTTP-only cookies. The backend is a stateless Express.js server that handles all business logic, authentication, and database operations. The database layer uses Microsoft SQL Server accessed through the msnodesqlv8 native ODBC driver with Windows Authentication (Trusted Connection).

---

## Technology Stack

### Backend

| Component        | Technology                              |
|------------------|-----------------------------------------|
| Runtime          | Node.js                                 |
| Framework        | Express.js 4.18                         |
| Language         | TypeScript 5.3                          |
| Database Driver  | msnodesqlv8 (native ODBC)               |
| Authentication   | JSON Web Tokens (jsonwebtoken 9.x)      |
| Password Hashing | bcryptjs 2.4                            |
| Validation       | Zod 4.3                                 |
| File Uploads     | Multer 1.4                              |
| Rate Limiting    | express-rate-limit 7.x                  |
| Unique IDs       | uuid v4                                 |

### Frontend

| Component        | Technology                              |
|------------------|-----------------------------------------|
| Framework        | React 18.2                              |
| Language         | TypeScript 5.3                          |
| Build Tool       | Vite 5.0                                |
| Routing          | React Router DOM 6.21                   |
| HTTP Client      | Axios 1.15                              |
| State Management | TanStack React Query 5.x               |
| CSS Framework    | Tailwind CSS 3.4                        |
| Charts           | Recharts 3.8                            |
| Icons            | Lucide React 1.12                       |
| Maps             | Google Maps API (@react-google-maps/api)|

### Database

| Component        | Technology                              |
|------------------|-----------------------------------------|
| RDBMS            | Microsoft SQL Server (SQL Express)      |
| Connection       | Windows Authentication (Trusted)        |
| ODBC Driver      | ODBC Driver 18 for SQL Server           |

---

## Database Schema

The database named `AttendanceDB` consists of seven tables:

### Users
Stores all user accounts, both administrators and employees. Each user has a UUID primary key, a unique email address, a bcrypt-hashed password, a role field (either `admin` or `employee`), and an `is_active` flag used for account suspension. Profile pictures are stored as URL references pointing to uploaded files on the server.

### Locations
Represents physical workplace sites. Each location stores a name, GPS coordinates (latitude and longitude with 10 decimal places of precision), a geofence radius in meters, a JSON blob for QR code data, and an activation status flag.

### Shifts
Defines work schedules tied to a specific location. Each shift has a name, a start time, an end time, and a `days_mask` integer that encodes which days of the week the shift is active using a bitmask (bit 0 = Sunday, bit 1 = Monday, ..., bit 6 = Saturday; a value of 127 means all seven days). Shifts reference the Locations table via a foreign key.

### UserShifts
A junction table that assigns employees to shifts. It records which user is assigned to which shift, along with an `effective_from` date. A composite unique constraint on `(user_id, shift_id, effective_from)` prevents duplicate assignments.

### AttendanceLogs
The core transactional table. Each row represents a single attendance scan event. It records the user who scanned, the location they scanned at, their exact GPS coordinates at the time of scan, the calculated distance from the location center, whether the scan fell within the geofence, an optional face photo URL, device information, the associated shift, a status string (e.g., `in_on_time`, `in_late`, `out_on_time`, `out_early_departure`), and the precise scan timestamp.

### CorrectionRequests
Allows employees to submit requests to correct attendance records. Each request references the attendance log entry in question, includes a reason and request type, and tracks review status (pending, approved, or rejected) along with reviewer notes.

### AuditTrail
An append-only log that records every significant action performed in the system. Each entry captures the actor (user who performed the action), the action type, the target entity, and a JSON details payload. This table is critical for compliance and forensic review.

---

## Authentication and Authorization

### Authentication Flow

1. A user submits their email and password to the `/api/auth/login` endpoint.
2. The backend verifies the credentials against the bcrypt-hashed password stored in the Users table.
3. If valid, the server generates two JSON Web Tokens:
   - An access token (expires in 1 hour) containing the user's ID, email, and role.
   - A refresh token (expires in 7 days) with the same payload.
4. Both tokens are set as HTTP-only, SameSite=Lax cookies on the response. The access token is also returned in the response body for clients that need it.
5. On every subsequent request, the `authenticate` middleware extracts the access token from the `accessToken` cookie (or the `Authorization: Bearer` header) and verifies it.
6. When the access token expires, the client can call `/api/auth/refresh` with the refresh token cookie to obtain a new access token without requiring the user to log in again.
7. Logging out clears both cookies.

### Role-Based Access Control

The system enforces two roles:

- **admin**: Full access to all endpoints. Can manage employees, locations, shifts, view all attendance records, review correction requests, and access audit trails.
- **employee**: Restricted access. Can only scan for attendance, view their own attendance records, manage their own profile, and submit correction requests.

Authorization is enforced at two levels:
- **Middleware level**: The `authorizeAdmin` and `authorize(roles)` middleware functions block unauthorized users from accessing admin-only endpoints entirely, returning a 403 error.
- **Data level**: Even on shared endpoints like `/api/attendance`, the backend checks the user's role. If the role is not `admin`, the query is automatically filtered to return only that user's own records. This prevents any possibility of data leakage regardless of how the frontend is modified.

---

## Core Features

### 1. Dashboard Analytics
- Admin view: Total employees, active locations, attendance entries today, on-time percentage, weekly attendance chart, and recent activity feed.
- Employee view: Personal attendance statistics, current shift information, and individual performance metrics.

### 2. Geofenced QR Attendance Scanner
- Employees scan a QR code displayed at their assigned location.
- The scanner captures the employee's real-time GPS coordinates via the browser's Geolocation API.
- The backend validates the scan by calculating the Haversine distance between the employee's position and the registered location center.
- If the distance exceeds the location's configured radius, the scan is rejected with a detailed error message.
- Anti-spam protection: A 30-second cooldown prevents duplicate scans.
- Automatic scan-type detection: The system toggles between check-in and check-out based on the employee's last scan for the day.

### 3. Attendance Status Algorithm
- For check-ins: If the employee scans within a 15-minute grace period after the shift start time, the status is `in_on_time`. Otherwise, it is `in_late`.
- For check-outs: If the employee scans before the shift end time, the status is `out_early_departure`. Otherwise, it is `out_on_time`.

### 4. Attendance Ledger
- Displays all attendance logs in a paginated, sortable table.
- Filters: target month (month and year selectors), exact date, geofence node (location), validation status, and employee name (admin only).
- CSV export functionality with all active filters applied.
- Admin users see all records; employees see only their own.

### 5. Location Management (Geofence Nodes)
- Admin-only CRUD interface for managing physical locations.
- Interactive Google Maps integration for visually pinning coordinates.
- Configurable geofence radius per location.
- Auto-generated QR code data for each location.

### 6. Shift Management (Shift Protocol)
- Admin-only interface for creating and managing work shifts.
- Each shift is tied to a specific location with configurable start/end times.
- Day-of-week selection using a bitmask system.
- Employee assignment: Bulk-assign employees to shifts with an effective date.
- Constraint enforcement: Employees with active shift assignments cannot be deleted.

### 7. Employee Management (Workforce Hub)
- Admin-only interface for provisioning and managing employee accounts.
- Create new employee accounts (admin role is excluded from the creation form to prevent privilege escalation).
- Suspend employees (soft disable via `is_active` flag) or permanently delete them (hard delete from database).
- Hard deletion requires the administrator to re-enter their own password for confirmation.
- Hard deletion is blocked if the employee has active shift assignments; the admin must remove the shifts first.
- Admin accounts are hidden from the employee list to prevent accidental modification.

### 8. User Profile
- Both admins and employees can view and edit their own profile.
- Profile picture upload with server-side file storage.
- Password change functionality with current password verification.

### 9. Correction Requests
- Employees can submit correction requests for attendance anomalies.
- Admins can review, approve, or reject requests with reviewer notes.
- Status tracking: pending, approved, rejected.

### 10. Audit Trail
- Admin-only read access to a chronological log of all significant system events.
- Captures attendance scans, geofence denials, employee management actions, and settings changes.
- Searchable and sortable by date, action type, and actor.

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication (`/api/auth`)

| Method | Endpoint    | Auth | Description                          |
|--------|-------------|------|--------------------------------------|
| POST   | /register   | No   | Register a new user account          |
| POST   | /login      | No   | Authenticate and receive tokens      |
| POST   | /refresh    | No   | Exchange refresh token for new access token |
| POST   | /logout     | No   | Clear authentication cookies         |

### Profile (`/api/profile`)

| Method | Endpoint    | Auth     | Description                          |
|--------|-------------|----------|--------------------------------------|
| GET    | /           | Required | Get current user profile             |
| PUT    | /           | Required | Update profile details               |
| PUT    | /password   | Required | Change password                      |
| POST   | /picture    | Required | Upload profile picture               |

### Locations (`/api/locations`)

| Method | Endpoint    | Auth  | Description                          |
|--------|-------------|-------|--------------------------------------|
| GET    | /           | Required | List all locations                |
| GET    | /:id        | Required | Get location by ID                |
| POST   | /           | Admin    | Create a new location             |
| PUT    | /:id        | Admin    | Update a location                 |
| DELETE | /:id        | Admin    | Delete a location                 |

### Shifts (`/api/shifts`)

| Method | Endpoint               | Auth  | Description                     |
|--------|------------------------|-------|---------------------------------|
| GET    | /                      | Required | List all shifts              |
| GET    | /:id                   | Required | Get shift by ID              |
| POST   | /                      | Admin    | Create a new shift           |
| PUT    | /:id                   | Admin    | Update a shift               |
| DELETE | /:id                   | Admin    | Delete a shift               |
| GET    | /:id/employees         | Admin    | List employees in a shift    |
| POST   | /:id/employees         | Admin    | Assign employees to shift    |
| DELETE | /:id/employees/:userId | Admin    | Remove employee from shift   |

### Employees (`/api/employees`)

| Method | Endpoint          | Auth  | Description                       |
|--------|-------------------|-------|-----------------------------------|
| GET    | /                 | Admin | List all employees                |
| POST   | /                 | Admin | Create a new employee             |
| PUT    | /:id/suspend      | Admin | Suspend/reactivate an employee    |
| DELETE | /:id              | Admin | Hard delete an employee           |

### Attendance (`/api/attendance`)

| Method | Endpoint    | Auth     | Description                          |
|--------|-------------|----------|--------------------------------------|
| GET    | /           | Required | List attendance logs (filtered by role) |
| GET    | /export     | Required | Export attendance logs as CSV        |
| POST   | /scan       | Employee | Submit an attendance scan            |

### Corrections (`/api/corrections`)

| Method | Endpoint         | Auth     | Description                        |
|--------|------------------|----------|------------------------------------|
| GET    | /                | Required | List correction requests           |
| POST   | /                | Required | Submit a correction request        |
| PUT    | /:id/review      | Admin    | Review a correction request        |

### Audit (`/api/audit`)

| Method | Endpoint    | Auth  | Description                          |
|--------|-------------|-------|--------------------------------------|
| GET    | /           | Admin | List audit trail entries             |

### Analytics (`/api/analytics`)

| Method | Endpoint    | Auth     | Description                          |
|--------|-------------|----------|--------------------------------------|
| GET    | /employee   | Required | Get personal attendance statistics   |
| GET    | /admin      | Admin    | Get organization-wide analytics      |

### Health Check

| Method | Endpoint    | Auth | Description                          |
|--------|-------------|------|--------------------------------------|
| GET    | /api/health | No   | Server health and status check       |

---

## Frontend Pages

| Page              | Route          | Access   | Description                                      |
|-------------------|----------------|----------|--------------------------------------------------|
| Login             | /login         | Public   | Authentication form with email and password      |
| Dashboard         | /              | All      | Role-aware analytics dashboard with charts       |
| QR Scanner        | /scanner       | Admin    | QR code display and employee scan interface      |
| Attendance Ledger | /attendance    | All      | Paginated attendance log viewer with filters     |
| Geofence Nodes    | /locations     | Admin    | Location CRUD with Google Maps integration       |
| Shift Protocol    | /shifts        | Admin    | Shift management and employee assignment         |
| Workforce Hub     | /employees     | Admin    | Employee provisioning, suspension, and deletion  |
| Corrections       | /corrections   | All      | Correction request submission and review         |
| Profile           | /profile       | All      | User profile management and password change      |

---

## Geofence Verification Engine

The geofence system uses the Haversine formula to calculate the great-circle distance between two points on the Earth's surface:

```
a = sin^2(delta_lat / 2) + cos(lat1) * cos(lat2) * sin^2(delta_lon / 2)
c = 2 * atan2(sqrt(a), sqrt(1 - a))
distance = R * c
```

Where R is the Earth's radius (6,371,000 meters). The calculated distance is compared against the location's configured radius. If the employee's distance from the location center exceeds the radius, the attendance scan is rejected and an audit trail entry is created with the action `ATTENDANCE_GEOFENCE_DENIED`.

---

## Project Structure

```
attendance-system/
|
|-- database/
|   |-- setup.sql                    # Complete SQL Server schema (7 tables)
|
|-- backend/
|   |-- .env                         # Environment configuration
|   |-- .env.example                 # Template environment file
|   |-- package.json                 # Backend dependencies and scripts
|   |-- tsconfig.json                # TypeScript configuration
|   |-- src/
|   |   |-- index.ts                 # Application entry point, server bootstrap, admin seeding
|   |   |-- config/
|   |   |   |-- index.ts             # Centralized configuration loader
|   |   |   |-- db.ts                # MS SQL Server connection via msnodesqlv8
|   |   |-- middleware/
|   |   |   |-- auth.ts              # JWT authentication and role authorization
|   |   |   |-- error.ts             # Global error handler and AppError class
|   |   |   |-- upload.ts            # Multer file upload configuration
|   |   |   |-- validate.ts          # Zod schema validation middleware
|   |   |-- repositories/
|   |   |   |-- UserRepository.ts    # User CRUD operations
|   |   |   |-- LocationRepository.ts# Location CRUD operations
|   |   |   |-- ShiftRepository.ts   # Shift and employee assignment operations
|   |   |   |-- AttendanceRepository.ts # Attendance log queries with IST formatting
|   |   |   |-- CorrectionRepository.ts # Correction request operations
|   |   |   |-- AuditRepository.ts   # Audit trail queries
|   |   |   |-- AnalyticsRepository.ts  # Statistical aggregation queries
|   |   |-- routes/
|   |   |   |-- auth.ts              # Login, register, refresh, logout
|   |   |   |-- profile.ts           # Profile view and update
|   |   |   |-- locations.ts         # Location management endpoints
|   |   |   |-- shifts.ts            # Shift management endpoints
|   |   |   |-- employees.ts         # Employee management endpoints
|   |   |   |-- attendance.ts        # Attendance scan and ledger endpoints
|   |   |   |-- corrections.ts       # Correction request endpoints
|   |   |   |-- audit.ts             # Audit trail endpoint
|   |   |   |-- analytics.ts         # Analytics endpoints
|   |   |-- schemas/                 # Zod validation schemas
|   |   |-- services/
|   |   |   |-- audit.ts             # Audit trail creation service
|   |   |-- utils/
|   |       |-- jwt.ts               # JWT sign and verify helpers
|   |       |-- geofence.ts          # Haversine distance calculation
|   |-- uploads/                     # Server-stored uploaded files
|       |-- profiles/                # Profile pictures
|       |-- attendance/              # Face verification photos
|
|-- frontend/
|   |-- .env                         # Frontend environment (Google Maps API key)
|   |-- package.json                 # Frontend dependencies and scripts
|   |-- index.html                   # HTML entry point
|   |-- vite.config.ts               # Vite build configuration
|   |-- tailwind.config.js           # Tailwind CSS theme configuration
|   |-- tsconfig.json                # TypeScript configuration
|   |-- src/
|   |   |-- main.tsx                 # React application mount point
|   |   |-- App.tsx                  # Root component with routing and navigation
|   |   |-- index.css                # Global styles and design system tokens
|   |   |-- components/
|   |   |   |-- DataTable.tsx        # Reusable paginated table component
|   |   |-- hooks/
|   |   |   |-- useAuth.tsx          # Authentication context and hook
|   |   |   |-- useGeolocation.ts    # Browser geolocation hook
|   |   |-- pages/
|   |   |   |-- Login.tsx            # Login page
|   |   |   |-- Dashboard.tsx        # Analytics dashboard
|   |   |   |-- QRScanner.tsx        # QR code scanner page
|   |   |   |-- Attendance.tsx       # Attendance ledger page
|   |   |   |-- Locations.tsx        # Location management page
|   |   |   |-- Shifts.tsx           # Shift management page
|   |   |   |-- Employees.tsx        # Employee management page
|   |   |   |-- Corrections.tsx      # Correction requests page
|   |   |   |-- Profile.tsx          # User profile page
|   |   |-- services/
|   |   |   |-- api.ts               # Axios HTTP client and API method definitions
|   |   |-- utils/
|   |       |-- datetime.ts          # IST date and time formatting utilities
|   |       |-- geofence.ts          # Client-side distance calculation
|-- start.bat                        # Windows batch script to start both servers
|-- stop.bat                         # Windows batch script to stop all instances
|-- README.md                        # This file
```

---

## Prerequisites

Before running the application, ensure the following software is installed on your system:

1. **Node.js** (version 18 or higher): Required to run both the backend and frontend development servers.
2. **Microsoft SQL Server** (SQL Express or higher): The application uses SQL Server as its primary database. SQL Server Express is free and sufficient for development and small deployments.
3. **ODBC Driver 18 for SQL Server**: The backend uses the msnodesqlv8 package which requires this ODBC driver to be installed on the host machine. Download it from the official Microsoft website.
4. **SQL Server Management Studio (SSMS)** (optional but recommended): Useful for running the initial database setup script and inspecting data.
5. **Google Maps API Key** (optional): Required for the interactive map on the Locations management page. Without it, the map will not render, but all other functionality works normally.

---

## Installation and Setup

### Step 1: Create the Database

Open SQL Server Management Studio (or any SQL client connected to your SQL Server instance) and execute the contents of `database/setup.sql`. This script will:
- Create the `AttendanceDB` database if it does not already exist.
- Create all seven tables with appropriate columns, data types, constraints, foreign keys, and indexes.

Note: The script uses `IF NOT EXISTS` checks, making it safe to run multiple times without duplicating tables.

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Backend Environment

Copy the example environment file and adjust the values:

```bash
cp .env.example .env
```

Edit `backend/.env` with your specific configuration:

```
PORT=3000
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=AttendanceDB
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
UPLOAD_PROFILE_DIR=./uploads/profiles
UPLOAD_ATTENDANCE_DIR=./uploads/attendance
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

The `DB_SERVER` value should match your SQL Server instance name. For a default SQL Express installation on Windows, this is typically `localhost\SQLEXPRESS`. The connection uses Windows Authentication (Trusted Connection), so no database username or password is needed.

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 5: Configure Frontend Environment (Optional)

If you have a Google Maps API key, create or edit `frontend/.env`:

```
VITE_GOOGLE_MAPS_KEY=your-google-maps-api-key-here
```

---

## Configuration

### Backend Environment Variables

| Variable              | Required | Default                  | Description                          |
|-----------------------|----------|--------------------------|--------------------------------------|
| PORT                  | No       | 3000                     | Port the Express server listens on   |
| DB_SERVER             | No       | localhost\SQLEXPRESS      | SQL Server instance name             |
| DB_NAME               | No       | AttendanceDB             | Database name                        |
| JWT_SECRET            | Yes      | -                        | Secret key for signing access tokens |
| JWT_REFRESH_SECRET    | Yes      | -                        | Secret key for signing refresh tokens|
| UPLOAD_PROFILE_DIR    | No       | ./uploads/profiles       | Directory for profile picture uploads|
| UPLOAD_ATTENDANCE_DIR | No       | ./uploads/attendance     | Directory for attendance photo uploads|
| FRONTEND_URL          | No       | http://localhost:5173     | Allowed CORS origin for the frontend |
| NODE_ENV              | No       | development              | Environment mode                     |

### Frontend Environment Variables

| Variable              | Required | Description                          |
|-----------------------|----------|--------------------------------------|
| VITE_GOOGLE_MAPS_KEY  | No       | Google Maps JavaScript API key       |

---

## Running the Application

### Using Batch Scripts (Windows)

The simplest way to run the entire system on Windows:

**Start:**
```bash
start.bat
```
This script automatically stops any previously running instances (by killing processes on ports 3000 and 5173), then opens two new terminal windows running the backend and frontend development servers.

**Stop:**
```bash
stop.bat
```
This script terminates all running instances by closing the terminal windows and forcefully killing any processes listening on ports 3000 and 5173.

### Manual Start

**Backend:**
```bash
cd backend
npm run dev
```
The backend server will start on `http://localhost:3000`.

**Frontend (in a separate terminal):**
```bash
cd frontend
npm run dev
```
The frontend development server will start on `http://localhost:5173`.

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

The frontend production build output is written to `frontend/dist/` and can be served by any static file server.

---

## Default Credentials

The system automatically seeds a default administrator account on first startup. This is handled programmatically in `backend/src/index.ts` during the server bootstrap process. The password is hashed using bcrypt before being stored in the database.

| Field    | Value          |
|----------|----------------|
| Email    | admin@system.com   |
| Password | 12345678       |
| Role     | admin          |

It is strongly recommended to change the default administrator password immediately after the first login in a production environment.

---

## Security Considerations

1. **Password Storage**: All passwords are hashed using bcrypt with a salt round of 10 before being stored in the database. Plaintext passwords are never stored or logged.

2. **Token Security**: JWT access tokens and refresh tokens are stored in HTTP-only cookies, preventing client-side JavaScript from accessing them and mitigating XSS-based token theft.

3. **CORS Policy**: The backend enforces a strict CORS policy, only allowing requests from the configured frontend origin.

4. **Rate Limiting**: All API endpoints are protected by a rate limiter configured to allow a maximum of 1000 requests per 15-minute window per client.

5. **Input Validation**: All incoming request bodies are validated against Zod schemas before processing. Invalid payloads are rejected with descriptive error messages.

6. **Role-Based Data Isolation**: Employee data visibility is enforced at the database query level, not just the UI level. Even if an employee manipulates frontend code or API calls, the backend will only ever return their own records.

7. **Administrative Action Verification**: Destructive operations such as permanently deleting an employee require the administrator to re-enter their password, providing a second factor of confirmation.

8. **Audit Logging**: All significant actions are recorded in the AuditTrail table, providing a tamper-evident log for compliance review and forensic analysis.

9. **File Upload Restrictions**: Uploaded files are limited to 5 MB and are stored in dedicated server directories. File type validation is enforced by Multer.

---

## License

This project is developed for internal organizational use. All rights reserved.