# Production Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Firebase credentials configured
- MongoDB password set

## Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd kusernew
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Build and start services**
```bash
docker-compose up -d
```

4. **Check service status**
```bash
docker-compose ps
docker-compose logs -f
```

## Environment Variables

### Required Variables
- `MONGO_PASSWORD`: MongoDB root password
- `FIREBASE_*`: Firebase configuration (see .env.example)

### Optional Variables
- `BACKEND_URL`: Backend URL (default: http://localhost:8000)
- `FRONTEND_URL`: Frontend URL (default: http://localhost:3000)
- `SOCKET_URL`: Socket.IO URL (default: http://localhost:8000)

## Production Deployment

### For Production Servers

1. Update `.env` with production URLs:
```env
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

2. Use production MongoDB:
```env
MONGODB_URI=mongodb://user:password@your-mongo-host:27017/kusernew
```

3. Build and deploy:
```bash
docker-compose -f docker-compose.yml up -d --build
```

## Useful Commands

### View logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Stop all services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Troubleshooting

### Backend can't connect to MongoDB
- Check MongoDB container is running: `docker-compose ps`
- Verify MONGODB_URI in backend environment
- Check MongoDB logs: `docker-compose logs mongodb`

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_BACKEND_URL is set correctly
- Check backend is running: `docker-compose ps`
- Check CORS configuration in backend

### Extension upload fails
- Ensure uploads directory exists and has proper permissions
- Check backend logs for errors
- Verify multer is installed: `docker-compose exec backend npm list multer`
