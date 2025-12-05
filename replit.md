# Evolution API - Replit Setup

## Overview
Evolution API is a comprehensive WhatsApp REST API built on Baileys library with support for multiple messaging integrations including Typebot, Chatwoot, Dify, OpenAI, and more. This instance is configured to run on Replit with PostgreSQL database.

**Current Status:** Fully configured and running
**Version:** 2.3.6
**API Endpoint:** http://localhost:8080

## Project Architecture

### Tech Stack
- **Backend Framework:** Node.js with Express and TypeScript
- **WhatsApp Library:** Baileys 7.0.0-rc.6
- **Database:** PostgreSQL (Replit built-in)
- **ORM:** Prisma
- **Real-time:** Socket.io
- **Build Tool:** tsup with tsx for development

### Key Components
- **API Server:** Express-based REST API running on port 8080
- **Database:** PostgreSQL with 56 migrations applied
- **Caching:** Local cache enabled (Redis disabled)
- **WebSocket:** Socket.io for real-time events
- **Authentication:** API key-based authentication

## Configuration

### Environment Variables
All configuration is stored in Replit environment variables (shared environment):

**Server Configuration:**
- `SERVER_PORT=8080` - API server port
- `SERVER_TYPE=http` - Protocol type
- `SERVER_URL=http://localhost:8080` - Base URL

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
- **Port:** 8080
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
- Development: `http://localhost:8080`
- Documentation: Available at `/manager` endpoint
- Official Docs: https://doc.evolution-api.com

### Health Check
```bash
curl http://localhost:8080/
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

## Recent Setup (Dec 5, 2025)

### What Was Done
1. ✅ Installed all npm dependencies (1150 packages)
2. ✅ Created and configured PostgreSQL database
3. ✅ Generated Prisma client
4. ✅ Applied 56 database migrations successfully
5. ✅ Configured environment variables
6. ✅ Set up development workflow
7. ✅ Verified API is running and accessible

### Verified Working
- Server starts successfully on port 8080
- Database connection established
- Prisma repository initialized
- Socket.io working
- API responds to HTTP requests
- All migrations applied without errors

## Support & Documentation
- Official Documentation: https://doc.evolution-api.com
- GitHub: https://github.com/EvolutionAPI/evolution-api
- WhatsApp Group: https://evolution-api.com/whatsapp
- Discord: https://evolution-api.com/discord
