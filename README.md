# Vidyarthi Mitra

A full-stack MERN application for students exploring universities, courses, exams, and community Q&A.

## Project structure

```text
vidyarthi-mitra/
|-- backend/
|   |-- src/
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   `-- utils/
|   |-- scripts/
|   |   `-- seedData.js
|   |-- .env
|   |-- .env.example
|   `-- package.json
|-- frontend/
|   |-- src/
|   |-- public/
|   `-- package.json
`-- package.json
```

## Development setup

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your MongoDB connection string and secrets.

### 3. Run the app

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Optional seed command:

```bash
npm run seed:backend
```

## Backend startup behavior

- The backend now waits for MongoDB to connect before it starts listening on the HTTP port.
- Startup logs clearly tell you whether MongoDB is connected, whether Google OAuth is configured, and where to find the health check endpoint.
- Health checks are available at `http://localhost:5000/health` and `http://localhost:5000/api/v1/health`.

## Tech stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + Google OAuth (Passport.js)

## Features

- University search, filters, and comparison
- Courses, exams, and news modules
- Community Q&A
- JWT-based authentication
- Admin APIs and seeded development data
