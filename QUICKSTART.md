# Quick Start Guide

## Start the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **MongoDB**: localhost:27017

## Configuration

The application is configured to work with MongoDB **without authentication** by default.

If you need to customize URLs, create a `.env` file:

```env
# Optional - only if you need different URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

## Rebuild After Code Changes

```bash
docker-compose up -d --build
```

## Troubleshooting

### Check service status
```bash
docker-compose ps
```

### View specific service logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart a service
```bash
docker-compose restart backend
```
