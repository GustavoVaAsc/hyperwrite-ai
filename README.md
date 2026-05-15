# Hyperwrite AI

An Agentic AI document editor! (we're trying lol)

## Architecture

![architecture](readme-media/hyperwritev1.png)

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Linux/macOS:
     ```bash
     source venv/bin/activate
     ```
   - Windows:
     ```bash
     venv\Scripts\activate
     ```

4. Install dependencies (all required packages are already listed in `requirements.txt`):
   ```bash
   pip install -r requirements.txt
   ```

5. Create your environment file:
   ```bash
   cp .env.example .env
   ```

6. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend

#### Installing Node.js and npm

**Windows:**
1. Download the installer from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nodejs npm
```

**Fedora:**
```bash
sudo dnf install nodejs npm
```

#### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
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
