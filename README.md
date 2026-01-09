# Chess Multiplayer

Application d'échecs multijoueur en temps réel.

**Stack technique :** Angular 21 · Spring Boot 4 · PostgreSQL · WebSocket

---

## Installation

### Prérequis

- Java 21+
- Node.js 22+
- PostgreSQL 15+ (ou Docker)

### Base de données

# PostgreSQL local

sudo -u postgres psql
CREATE DATABASE chess_db;
CREATE USER chess WITH PASSWORD 'chess';
GRANT ALL PRIVILEGES ON DATABASE chess_db TO chess;

````

### Lancement

**Backend**

```bash
cd backend
./mvnw spring-boot:run
````

**Frontend**

```bash
cd frontend
npm install
ng serve
```

Application disponible sur http://localhost:4200

---

## Fonctionnalités

- Authentification JWT
- Liste des joueurs en ligne
- Invitation à jouer
- Synchronisation en temps réel des coups
- Historique des parties
- Replay des parties

---

## Configuration

Backend (`backend/src/main/resources/application.yml`) :

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/chess_db
    username: chess
    password: chess
```

---

## Structure

```
├── backend/           # Spring Boot 4
│   └── src/main/java/com/chess/
│       ├── controller/
│       ├── service/
│       ├── model/
│       └── websocket/
│
└── frontend/          # Angular 21
    └── src/app/
        ├── core/services/
        └── features/
            ├── lobby/
            └── game/
```

---

## API

| Endpoint                  | Description          |
| ------------------------- | -------------------- |
| `POST /api/auth/register` | Inscription          |
| `POST /api/auth/login`    | Connexion            |
| `GET /api/games/{id}`     | Détails d'une partie |
| `GET /api/players`        | Joueurs connectés    |

WebSocket : `/ws` (STOMP/SockJS)
