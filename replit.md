# Evolution API - Replit Setup

## Overview
Evolution API is a comprehensive WhatsApp REST API built on Baileys library with support for multiple messaging integrations including Typebot, Chatwoot, Dify, OpenAI, and more. This instance is configured to run on Replit with PostgreSQL database.

**Current Status:** Fully configured and running
**Version:** 2.3.6
**API Endpoint:** http://localhost:5000

## Project Architecture

### Tech Stack
- **Backend Framework:** Node.js with Express and TypeScript
- **WhatsApp Library:** Baileys 7.0.0-rc.6
- **Database:** PostgreSQL (Replit built-in)
- **ORM:** Prisma
- **Real-time:** Socket.io
- **Build Tool:** tsup with tsx for development

### Key Components
- **API Server:** Express-based REST API running on port 5000
- **Database:** PostgreSQL with 56 migrations applied
- **Caching:** Local cache enabled (Redis disabled)
- **WebSocket:** Socket.io for real-time events
- **Authentication:** API key-based authentication

## Configuration

### Environment Variables
All configuration is stored in Replit environment variables (shared environment):

**Server Configuration:**
- `SERVER_PORT=5000` - API server port
- `SERVER_TYPE=http` - Protocol type
- `SERVER_URL=http://localhost:5000` - Base URL

**Database:**
- `DATABASE_PROVIDER=postgresql` - Database type
- `DATABASE_CONNECTION_URI` - PostgreSQL connection string (auto-configured)
- All data persistence features enabled

**Integrations:**
- All integrations (Typebot, Chatwoot, OpenAI, etc.) disabled by default
- Can be enabled by setting respective ENV variables

**Security:**
- `AUTHENTICATION_API_KEY=CHANGE_THIS_KEY_IN_PRODUCTION` - **IMPORTANT:** Change this in production!

## Running the Project

### Development Server
The project runs automatically via the configured workflow:
- **Workflow Name:** Evolution API Server
- **Command:** `npm run dev:server`
- **Port:** 5000
- **Auto-restart:** Enabled on file changes

### Available Scripts
```bash
npm run dev:server    # Start development server with watch mode
npm run build         # Build TypeScript code
npm run start:prod    # Run production build
npm run db:generate   # Generate Prisma client
npm run db:deploy     # Deploy database migrations
npm run db:studio     # Open Prisma Studio
```

## Database Setup

### Prisma Configuration
- **Schema:** `prisma/postgresql-schema.prisma`
- **Migrations:** 56 migrations applied successfully
- **Tables:** Instances, Messages, Contacts, Chats, Labels, Media, Integration settings, and more

### Database Commands
```bash
npm run db:generate   # Regenerate Prisma client
npm run db:deploy     # Apply new migrations
npm run db:studio     # Visual database browser
```

## API Endpoints

### Base URL
- Development: `http://localhost:5000`
- Documentation: Available at `/manager` endpoint
- Official Docs: https://doc.evolution-api.com

### Health Check
```bash
curl http://localhost:5000/
```

Response includes:
- API status
- Version number
- WhatsApp Web version
- Links to manager and documentation

## Integrations Available

The API supports multiple integrations (currently disabled, can be enabled):
- **Typebot** - Conversational bot builder
- **Chatwoot** - Customer service platform
- **Dify** - AI integration
- **OpenAI** - AI capabilities and audio-to-text
- **Flowise** - AI workflows
- **N8N** - Workflow automation
- **EvoAI** - Evolution's AI service

### Event Brokers
- RabbitMQ
- Apache Kafka
- Amazon SQS
- NATS
- Pusher
- WebSocket (enabled)

## File Structure

```
├── src/
│   ├── api/              # API controllers, routes, DTOs
│   ├── cache/            # Caching implementations
│   ├── config/           # Configuration and environment
│   ├── utils/            # Utility functions
│   ├── validate/         # Validation schemas
│   └── main.ts           # Application entry point
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Important Notes

### Security
1. **Change the API key** in production - currently set to default
2. Database credentials are managed by Replit
3. All integrations require their own API keys/credentials

### Limitations in Replit
- Redis disabled (using local cache instead)
- External integrations require additional configuration
- Webhook URLs need to be configured for production

### Next Steps
To use the API:
1. Change the `AUTHENTICATION_API_KEY` to a secure value
2. Configure any integrations you need
3. Set up webhook endpoints if required
4. Review security settings before production use

## SaaS Platform Features (Dec 5, 2025)

### Multi-Tenancy System
The API has been transformed into a complete SaaS platform with:

**User Authentication:**
- Replit Auth integration for user registration/login
- JWT-based session management
- Role-based access control (SUPER_ADMIN/ADMIN/USER)

**Database Tables:**
- `SaasUser` - User accounts with API keys
- `Subscription` - User subscription plans
- `Instance.userId` - Links WhatsApp instances to users
- `AuditLog` - Comprehensive audit logging for all actions

**Authentication Types:**
- `global` - Admin API key (full access)
- `saas_user` - User API key (evo_* prefix, tenant-scoped)
- `instance_token` - Instance-specific tokens (single instance access)

**Frontend Pages:**
- `/landing` - Landing page with login/register
- `/dashboard` - User dashboard for managing instances
- `/admin` - Admin panel for managing users and platform

### SaaS API Endpoints
```
POST /saas/auth/session    # Start auth session
GET  /saas/auth/callback   # Auth callback
GET  /saas/auth/me         # Get current user
POST /saas/auth/logout     # Logout user
GET  /saas/users           # List all users (admin)
GET  /saas/users/:id       # Get user details
PUT  /saas/users/:id       # Update user
DELETE /saas/users/:id     # Delete user
```

### Audit Log System (SUPER_ADMIN only)
```
GET  /api/admin/audit       # Get audit logs with filters (action, severity, dates)
GET  /api/admin/audit/stats # Get audit statistics (total, today, warnings, errors)
GET  /api/admin/audit/recent # Get recent audit logs
```

**Tracked Actions:**
- LOGIN/LOGOUT - User authentication events
- CREATE_INSTANCE/DELETE_INSTANCE - Instance management
- CONNECT_INSTANCE/DISCONNECT_INSTANCE - WhatsApp connections
- UPDATE_ROLE - User role changes
- DELETE_USER - User deletions
- REGENERATE_API_KEY - API key regenerations
- SYSTEM_ERROR - System errors

**Severity Levels:** INFO, WARNING, ERROR, CRITICAL

### Key Files
- `src/api/saas/auth/replitAuth.ts` - Replit Auth integration
- `src/api/saas/auth/storage.ts` - User storage/management
- `src/api/saas/routes/saas.router.ts` - SaaS API routes
- `src/api/saas/audit/audit.service.ts` - Audit logging service
- `src/api/guards/auth.guard.ts` - Authentication guard
- `public/landing.html` - Landing page
- `public/dashboard/index.html` - User dashboard
- `public/admin/index.html` - Admin panel with audit log viewer

## Recent Setup (Dec 5, 2025)

### What Was Done
1. ✅ Installed all npm dependencies (1150 packages)
2. ✅ Created and configured PostgreSQL database
3. ✅ Generated Prisma client
4. ✅ Applied 57 database migrations successfully
5. ✅ Configured environment variables
6. ✅ Set up development workflow
7. ✅ Verified API is running and accessible
8. ✅ Implemented SaaS multi-tenancy system
9. ✅ Added Replit Auth for user authentication
10. ✅ Created landing page, dashboard, and admin panel
11. ✅ Linked users to WhatsApp instances
12. ✅ Fixed security issue with instance token scoping
13. ✅ Implemented three-tier role system (SUPER_ADMIN/ADMIN/USER)
14. ✅ Added comprehensive audit logging system
15. ✅ Created audit log viewer in admin panel (SUPER_ADMIN only)

### Verified Working
- Server starts successfully on port 5000
- Database connection established
- Prisma repository initialized
- Socket.io working
- API responds to HTTP requests
- All migrations applied without errors
- SaaS authentication system working
- User-to-instance linking working
- Admin panel accessible
- Audit log system functional with filters and statistics

## Support & Documentation
- Official Documentation: https://doc.evolution-api.com
- GitHub: https://github.com/EvolutionAPI/evolution-api
- WhatsApp Group: https://evolution-api.com/whatsapp
- Discord: https://evolution-api.com/discord
