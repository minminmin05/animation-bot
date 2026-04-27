# Docker Setup for School Management App

## Prerequisites

- Docker Desktop installed and running
- `.env` file with your Supabase credentials

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Stop the container
docker-compose down
```

### 2. Access the Application

Open your browser and go to: http://localhost:3000

## Docker Commands

### Build only (without running)
```bash
docker build -t school-management-app .
```

### Run the container
```bash
docker run -p 3000:80 --env-file .env school-management-app
```

### View running containers
```bash
docker ps
```

### Stop a running container
```bash
docker stop <container-id>
```

### Remove a container
```bash
docker rm <container-id>
```

### View container logs
```bash
docker logs <container-id>
docker logs -f <container-id>  # Follow logs
```

### Execute commands in the container
```bash
docker exec -it <container-id> sh
```

## Production Deployment

### Using Docker Compose
```bash
docker-compose -f docker-compose.yml up -d
```

### Using Docker directly
```bash
# Build the image
docker build -t school-management-app:latest .

# Tag for registry
docker tag school-management-app:latest your-registry/school-management-app:latest

# Push to registry
docker push your-registry/school-management-app:latest

# Run on production server
docker run -d -p 80:80 --env-file .env.production your-registry/school-management-app:latest
```

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGc...` |

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs frontend

# Rebuild without cache
docker-compose build --no-cache
```

### Port already in use
Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change 3000 to 8080
```

### Environment variables not loading
Make sure your `.env` file exists and contains the required variables.

## Development with Docker

For development, it's better to run the Vite dev server directly:

```bash
npm install
npm run dev
```

Docker is recommended for production deployments only.
