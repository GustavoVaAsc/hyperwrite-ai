# Hyperwrite AI

An Agentic AI document editor! (we're trying lol)

## Architecture

![architecture](readme-media/hyperwritev1.png)

## Setup

### 1. Docker Configuration

1. Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Create your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Important:** Update the following values in `.env` with secure credentials:
   - `POSTGRES_PASSWORD` - Set a strong password for the database
   - `DATABASE_URL` - Update the password in the connection string to match

   Your `.env` should look like:
   ```env
   # CORS Configuration
   CORS_ORIGINS=http://localhost:5173
   CORS_CREDENTIALS=true
   CORS_METHODS=*
   CORS_HEADERS=*

   # Database credentials
   POSTGRES_USER=hyperwrite
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=hyperwrite
   DATABASE_URL=postgresql+asyncpg://hyperwrite:your_secure_password@db:5432/hyperwrite
   ```

5. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

6. Verify the services are running:
   ```bash
   docker-compose ps
   ```

### 2. Backend Setup (Optional - Docker recommended)

The backend runs via Docker by default. Use local setup only when:

- **Debugging** - Step-through debugging with an IDE
- **Without Docker** - If Docker is not available
- **Understanding the stack** - Useful for learning the backend architecture

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Linux/macOS:
     ```bash
     source venv/bin/activate
     ```
   - Windows:
     ```bash
     venv\Scripts\activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Setup

#### Installing Node.js and pnpm

**Windows:**
1. Download the installer from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Install pnpm:
   ```bash
   npm install -g pnpm
   ```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nodejs npm
npm install -g pnpm
```

**Fedora:**
```bash
sudo dnf install nodejs npm
npm install -g pnpm
```

#### Running the Frontend

> **Note:** This project uses [Tanstack Router](frontend/README.md#tanstack-router) for routing.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   pnpm run dev
   ```

## Contributing

### Branch Naming

Work on a separate branch for each feature or fix. Use the format:
```
type/part-of-project/what-you-are-doing
```

Examples:
- `feat/backend/user-authentication`
- `fix/frontend/editor-crash`
- `docs/api/endpoints`

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): brief summary

Detailed description (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring

Examples:
```
feat/backend: add user login endpoint
fix/frontend: resolve editor crash on save
docs(api): update authentication docs
```

### Pull Requests

1. Submit a pull request to the `main` branch
2. Wait for review and approval from another contributor
3. Resolve any feedback before merging
