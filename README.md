# Node.js University Projects

This repository contains multiple projects and assignments for a university Node.js course. Each project is located in its own folder. Below is an overview of the main projects:

---

## Clask (Slack Clone)

A simple, team-oriented messaging platform inspired by Slack. Built with Node.js, Hono, Drizzle ORM, and EJS templates.

### Features
- User authentication (register, login, session management)
- Channel management (create, edit, delete channels)
- Channel-based messaging (real-time chat)
- Admin controls for channels
- SQLite database with Drizzle ORM
- Database seeding and migration scripts
- E2E and unit tests
- Modern UI with EJS and CSS

### Getting Started
1. `cd semestralka`
2. `npm install`
3. Run migrations and seed the database:
   ```sh
   node src/utils/seed.js
   ```
4. Start the server:
   ```sh
   npm start
   ```
   or
   ```sh
   node src/index.js
   ```
5. Visit [http://localhost:3000](http://localhost:3000)

### Default Admin User
- Username: `admin`
- Password: `admin123`

---

## Todo App

A simple todo list application with Node.js, SQLite, and EJS.

### Features
- Add, edit, and delete todos
- Mark todos as complete
- Simple UI
- Database migrations and tests

### Getting Started
1. `cd todo app`
2. `npm install`
3. Run migrations (see `drizzle/` and `migrations/` folders)
4. Start the server:
   ```sh
   node index.js
   ```
5. Visit [http://localhost:3000](http://localhost:3000)

---

## Other Assignments

- `ukol_0.js`, `ukol_1/`, `ukol_2/`, `ukol_3/`: Various smaller assignments and exercises for the course.

---

## Project Structure

```
semestralka/                # Slack clone project (Clask)
  drizzle.config.js         # Drizzle ORM config
  package.json              # Project dependencies
  playwright.config.cjs     # Playwright E2E config
  slack_clone.db            # Main SQLite database
  test.db                   # Test database
  drizzle/                  # Database migration files
    0000_nostalgic_kitty_pryde.sql
    0001_perfect_leader.sql
    meta/                   # Drizzle migration metadata
      _journal.json
      0000_snapshot.json
      0001_snapshot.json
  e2e/                      # Playwright E2E tests
    channels.spec.js
  public/                   # Static assets
    css/
      style.css
    js/
      chat.js
  src/
    index.js                # App entry point
    controllers/            # Route handlers (auth, channel, home, message)
      authController.js
      channelController.js
      homeController.js
      messageController.js
    db/                     # Database schema and connection
      index.js
      schema.js
    middleware/             # Authentication middleware
      authMiddleware.js
    utils/                  # Helpers (auth, migration, renderer, seed)
      auth.js
      migration.js
      renderer.js
      seed.js
    views/                  # EJS templates
      home.ejs
      layout.ejs
      auth/
        login.ejs
        register.ejs
      channels/
      home/
  tests/                    # Unit/integration tests
    db.test.js

todo app/                   # Todo list project
  ...
ukol_0.js                   # Assignment 0
ukol_1/                     # Assignment 1
ukol_2/                     # Assignment 2
ukol_3/                     # Assignment 3
```

---

## Requirements
- Node.js 18+
- npm

