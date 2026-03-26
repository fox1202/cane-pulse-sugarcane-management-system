# Crop Monitoring Management System - React Web Application

A production-ready React web application for crop monitoring and management, built with React 18, TypeScript, and Supabase.

## 📋 Overview

This application provides a comprehensive platform for managing crop observation data, visualizing analytics, and monitoring fields on an interactive map. It integrates with a Supabase backend and supports offline functionality through IndexedDB.

## 🛠 Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **State Management**: TanStack Query (React Query)
- **UI Library**: Material UI (MUI)
- **Charts**: Recharts
- **Maps**: Leaflet + React Leaflet
- **Offline Storage**: IndexedDB (via idb)
- **Routing**: React Router DOM
- **Date Utilities**: date-fns

## 📦 Features

### Authentication & Authorization
- Supabase Auth integration
- Role-based access control (Collector, Supervisor, Admin)
- Protected routes
- Persistent sessions

### Data Management
- Comprehensive observation data table
- Search and filter capabilities
- Server-side pagination
- Detailed observation modal
- Role-based edit/delete (Admin only)

### Analytics Dashboard
- Crop growth trends (canopy cover over time)
- Fertilizer performance analysis
- Soil moisture trends
- Interactive filters (crop type, field, date range)

### Map View
- Interactive Leaflet map
- Field location markers
- Popup details with field information
- Latest observation images in popups
- Crop type filtering

### Offline Support
- IndexedDB caching for read-only data
- Graceful offline mode handling
- Automatic sync when online
- Offline indicator

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account with a configured project

### Installation

1. Clone the repository and navigate to the web app:

```bash
cd /home/nelson-murerwa/Desktop/crop-monitoring-management-system/web/crop_monitoring_web
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

Start the development server:

```bash
npm start
# or
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Layout/        # Layout components (AppLayout, Navigation)
│   └── ProtectedRoute.tsx
├── contexts/          # React contexts (AuthContext)
├── hooks/             # Custom React hooks (useObservations)
├── lib/               # Library configurations (Supabase client)
├── pages/             # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── DataManagementPage.tsx
│   ├── DashboardPage.tsx
│   └── MapViewPage.tsx
├── services/          # Service layer (database, offline)
├── theme/             # MUI theme configuration
├── types/             # TypeScript type definitions
├── App.tsx            # Main app component
└── main.tsx           # Application entry point
```

## 🗄 Database Schema Reference

The application connects to the following Supabase tables:

- `observations` - Core observation records
- `crop_information` - Crop details
- `crop_monitoring` - Monitoring metrics
- `soil_characteristics` - Soil data
- `irrigation_management` - Irrigation details
- `nutrient_management` - Fertilizer application
- `crop_protection` - Pest, disease, weed data
- `control_methods` - Control strategies
- `harvest` - Harvest information
- `residual_management` - Residue management
- `images` - Observation images

## 🏗 Architectural Decisions

### "Fetch All, Filter Later" Strategy
The dashboard currently employs a client-side data processing strategy:
1.  **Centralized Fetching**: Raw observation data is fetched once and cached via **React Query**.
2.  **Reactive Filtering**: Users can filter by crop type, field, or date range instantly without triggering new network requests.
3.  **Client-Side Analytics**: Metrics (Health Index, Averages) and chart datasets are derived in-browser using `useMemo`.

**Justification**: This maximizes interactivity and responsiveness for moderate datasets typical of regional monitoring, ensuring a "no-wait" experience for analysts.

## 📈 Scalability & Future Roadmap

While the current architecture is optimized for performance at its current scale, the following pathways are designed for future high-volume deployments:
- **Server-Side Aggregation**: Implement PostgreSQL **Views** or **RPC functions** to perform heavy aggregation (averages, counts) at the database level.
- **Paginated Analytics**: Move from "Fetch All" to windowed time-series fetching for datasets spanning multiple years.
- **Edge Caching**: Utilize Supabase's global edge infrastructure to cache static data closer to field offices.

## 👥 User Roles

### Collector (View-Only)
- View observation data
- Access dashboard and map
- No edit/delete permissions

### Supervisor / Agronomist (Full Data Access)
- All Collector permissions
- Full access to dashboard analytics
- Advanced filtering and analysis

### Admin (Manage Users & Data)
- All Supervisor permissions
- Edit and delete observations
- User management capabilities

## 🔧 Configuration

### Supabase Setup

Ensure your Supabase database includes:

1. All required tables (see Database Schema Reference)
2. Row Level Security (RLS) policies configured
3. User metadata with `role` field:
   - `collector`
   - `supervisor`
   - `admin`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## 🌐 Deployment

The application can be deployed to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Build and deploy the `dist` folder

Remember to configure environment variables in your hosting platform.

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🔒 Security

- All API keys are environment variables
- Row Level Security enforced at database level
- Role-based access control throughout the app
- Protected routes prevent unauthorized access

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Follow Material UI design patterns
4. Test on mobile and desktop viewports

## 📄 License

This project is part of the Crop Monitoring Management System.

## 🆘 Support

For issues or questions, contact your system administrator.

---

**Built with ❤️ for sustainable agriculture**
