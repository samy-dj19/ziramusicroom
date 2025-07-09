# Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Python 3.11+ (for AI service development)

## Quick Start with Docker

1. **Clone and navigate to the project:**
   ```bash
   cd music-app
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - AI Service: http://localhost:8000

## Local Development Setup

### Backend Setup
```bash
cd backend
npm install
# Copy env.example to .env and configure
cp env.example .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
# Copy env.example to .env and configure
cp env.example .env
npm start
```

### AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Configuration

### Backend (.env)
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_AI_SERVICE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## Production Deployment

### 1. Environment Variables
Set production environment variables:
- `JWT_SECRET`: Use a strong, random secret
- `NODE_ENV=production`
- Update URLs to production domains

### 2. Docker Deployment
```bash
# Build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or with custom environment
docker-compose --env-file .env.production up -d
```

### 3. Cloud Deployment Options

#### Heroku
```bash
# Create Heroku app
heroku create your-music-app

# Add buildpacks
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python

# Deploy
git push heroku main
```

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker build -t music-app .
docker tag music-app:latest your-account.dkr.ecr.us-east-1.amazonaws.com/music-app:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/music-app:latest
```

#### Google Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy music-app --source . --platform managed --region us-central1 --allow-unauthenticated
```

## Health Checks

Test the deployment:
- Backend: `GET /api/health`
- AI Service: `GET /health`
- Frontend: Should load the React app

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, and 8000 are available
2. **CORS errors**: Check that backend CORS is configured for your frontend domain
3. **JWT errors**: Verify JWT_SECRET is set correctly
4. **YouTube streaming issues**: ytdl-core may need updates for YouTube changes

### Logs
```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ai-service
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret in production
2. **CORS**: Configure CORS to only allow your frontend domain
3. **Rate Limiting**: Consider adding rate limiting for API endpoints
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Never commit .env files to version control

## Performance Optimization

1. **Caching**: Add Redis for session storage
2. **Database**: Replace in-memory storage with PostgreSQL/MongoDB
3. **CDN**: Use a CDN for static assets
4. **Load Balancing**: Use multiple instances behind a load balancer

## Monitoring

1. **Health Checks**: Implement health check endpoints
2. **Logging**: Add structured logging
3. **Metrics**: Add application metrics
4. **Error Tracking**: Integrate error tracking (Sentry, etc.) 