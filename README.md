# School Management System

A modular, scalable school management platform built with React, Vite, and Supabase. Adapted from lubit-nexus with a focus on clean architecture and separation of concerns.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Module Overview](#module-overview)
- [Development](#development)
- [Production Deployment](#production-deployment)

## ✨ Features

### Core Modules
- **Central System**: Core school administration and configuration
- **Student Management**: Complete student record management
- **Teacher Management**: Teacher profiles, assignments, and schedules
- **Parent Management**: Parent portal with child monitoring

### Planned Features
- Attendance Tracking
- Grade Management
- Class Scheduling
- Announcements System
- Payment Collection
- SMS/Email Notifications

## 🏗️ Architecture

The application follows a modular architecture with clear separation of concerns:

```
school-management-app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── central/       # Central system components
│   │   ├── student/       # Student-specific components
│   │   ├── teacher/       # Teacher-specific components
│   │   └── parent/        # Parent-specific components
│   ├── config/            # Configuration files
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # Layout components
│   ├── pages/             # Page components
│   ├── services/          # API service layer
│   │   └── api/           # API endpoints and configuration
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Utility functions
│   └── App.jsx            # Main app component
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library

### Backend & Database
- **Supabase** - Backend as a Service (PostgreSQL, Auth, Storage)
- **REST API** - Custom API endpoints (pluggable)

### State Management
- **React Context** - Global state (auth)
- **Zustand** - Client state (optional)

### Form Handling
- **React Hook Form** - Form management
- **Zod** - Schema validation

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account (or equivalent backend)

### Steps

1. **Clone or navigate to the project**
   ```bash
   cd C:/lumaid/Internship/school-management-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install additional dependencies**
   ```bash
   npm install lucide-react @tanstack/react-query date-fns react-hook-form zod
   ```

4. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit .env with your credentials
   # See Configuration section below
   ```

## ⚙️ Configuration

### 1. Supabase Setup (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run the database migrations (if provided):
   ```bash
   # Using Supabase CLI
   supabase db push
   ```

### 2. Custom Backend API

If using a custom backend, update `src/services/api/config.js`:

```javascript
export const API_CONFIG = {
  baseURL: process.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
}
```

### 3. Feature Flags

Enable/disable features in `.env`:

```env
VITE_ENABLE_ATTENDANCE=true
VITE_ENABLE_GRADING=true
VITE_ENABLE_SCHEDULING=true
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
Open http://localhost:5173 in your browser

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

### Key Files and Their Purpose

| File/Directory | Purpose |
|----------------|---------|
| `src/App.jsx` | Main app with routing configuration |
| `src/main.jsx` | Application entry point |
| `src/services/api/` | API service layer with base classes |
| `src/services/api/config.js` | **IMPORTANT**: API configuration and placeholders |
| `src/hooks/` | Custom React hooks (useAuth, useStudents, etc.) |
| `src/utils/` | Utility functions (date, validation, formatting) |
| `src/types/` | TypeScript type definitions |
| `src/layouts/` | Layout components (CentralLayout, DashboardLayout) |
| `src/components/` | Reusable UI components |
| `.env.example` | Template for environment variables |

## 🔌 API Integration

### Service Layer Architecture

The application uses a service-based architecture for clean API integration:

```javascript
// Example: Using the Student Service
import { StudentService } from '@/services/api'

// Get all students
const students = await StudentService.getStudents({ grade: '10' })

// Create a new student
const newStudent = await StudentService.createStudent({
  firstName: 'John',
  lastName: 'Doe',
  gradeLevel: '10',
  // ... other fields
})
```

### API Configuration

All API endpoints and credentials are configured in `src/services/api/config.js`.

**IMPORTANT**: Before deploying, update these placeholders:
- `YOUR_SUPABASE_URL_HERE` → Your Supabase project URL
- `YOUR_SUPABASE_ANON_KEY_HERE` → Your Supabase anon key
- Any external service API keys

### Available Services

- `AuthService` - Authentication operations
- `StudentService` - Student CRUD and queries
- `TeacherService` - Teacher CRUD and assignments
- `ParentService` - Parent CRUD and child links
- `ClassService` - Class management

## 📚 Module Overview

### Central System
**Location**: `src/components/central/`, `src/pages/central/`

Core school administration features:
- Dashboard with overview statistics
- User management
- School configuration
- System settings

### Student Management
**Location**: `src/components/student/`, `src/pages/student/`

Student-related features:
- Student profiles and records
- Grade viewing
- Schedule viewing
- Attendance tracking

### Teacher Management
**Location**: `src/components/teacher/`, `src/pages/teacher/`

Teacher-related features:
- Teacher profiles
- Class assignments
- Grade submission
- Schedule management

### Parent Management
**Location**: `src/components/parent/`, `src/pages/parent/`

Parent portal features:
- Child monitoring
- Grade viewing
- Attendance tracking
- Communication with school

## 🔧 Development

### Code Style
- ESLint for linting
- Prettier for formatting (optional)

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Adding New Features

1. **Create a new service** in `src/services/api/`
2. **Create a custom hook** in `src/hooks/`
3. **Create components** in appropriate `src/components/` subdirectory
4. **Create pages** in `src/pages/`
5. **Add routes** in `src/App.jsx`

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deployment Options

1. **Vercel/Netlify** - Deploy the `dist/` folder
2. **Docker** - Use the provided Dockerfile (if available)
3. **Traditional Server** - Serve `dist/` with Nginx/Apache

### Environment Variables
Ensure all required environment variables are set in production:

```env
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_ANON_KEY=your_production_key
NODE_ENV=production
```

## 🔐 Security Notes

- **NEVER** commit `.env` files
- **NEVER** expose service role keys in frontend code
- Use Row Level Security (RLS) in Supabase
- Validate all inputs on the backend
- Implement rate limiting for API endpoints

## 📝 TODO / Roadmap

- [ ] Complete student management UI
- [ ] Complete teacher management UI
- [ ] Implement attendance tracking
- [ ] Implement grade management
- [ ] Add class scheduling
- [ ] Create announcements system
- [ ] Add SMS notification support
- [ ] Add payment collection
- [ ] Create comprehensive admin panel
- [ ] Add reporting and analytics

## 🤝 Contributing

This is a migrated and adapted system from lubit-nexus. When contributing:

1. Follow the existing code structure
2. Use the service layer for all API calls
3. Implement proper error handling
4. Add appropriate TypeScript types
5. Update documentation as needed

## 📄 License

This project is part of the Internship/School Management System.

## 🆘 Support

For issues or questions:
1. Check the documentation
2. Review `src/services/api/config.js` for API configuration
3. Check `.env.example` for required environment variables

---

**Last Updated**: 2026-04-27
**Version**: 1.0.0
**Source**: Adapted from lubit-nexus
