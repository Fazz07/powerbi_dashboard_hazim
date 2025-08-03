# Use an official, slim Node.js image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# --- Dependency Caching ---
# Copy package.json and lock files for both frontend and backend first.
# This leverages Docker's layer caching. If these files don't change,
# Docker won't re-run the lengthy npm install step on subsequent builds.
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package-lock.json* ./backend/

# Install dependencies for both the root (frontend) and the backend
# Using --prefix tells npm to run the command in that specific subdirectory
RUN npm install && npm install --prefix backend

# --- Code & Configuration ---
# Copy the rest of the application code
COPY . .

# --- Environment Variables ---
# Define a build-time argument for the backend API URL
ARG VITE_API_URL=http://localhost:3000

# Set the corresponding environment variable that Vite will use
ENV VITE_API_URL=${VITE_API_URL}

# Backend environment variables
# Note: For production, sensitive values like secrets should be passed at runtime,
# not hardcoded in the Dockerfile. We'll use a .env file for the `docker run` command.
# This just copies the example .env for reference.
COPY backend/.env ./backend/.env

# --- Security & Permissions ---
# Create a non-root user and group for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Grant ownership of the app directory to the new user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# --- Networking ---
# Expose the ports for the backend and frontend services
EXPOSE 3000 # Backend
EXPOSE 8080 # Frontend (as defined in vite.config.ts)

# --- Execution ---
# Copy the entrypoint script and make it executable
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Set the entrypoint script as the command to run when the container starts
ENTRYPOINT ["./entrypoint.sh"]