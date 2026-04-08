# MathBuddy 🧮

> Fun math practice app for primary school students

A full-stack web application that helps primary school students practice addition, subtraction, multiplication, and division through interactive exercises.

## Features

### For Students
- 🎯 **Practice Mode** — Solve math problems step by step
- 📊 **Progress Tracking** — Track your score and accuracy
- ⭐ **Star Ratings** — Earn stars based on your performance
- 🎨 **Kid-Friendly UI** — Colorful, encouraging interface

### For Teachers/Admins
- 👥 **User Management** — Add, view, and manage student accounts
- 📝 **Problem Management** — Create and manage math problems
- 🏆 **Stats Overview** — Monitor student progress

## Tech Stack

**Backend**
- Python 3.10+ with FastAPI 0.135.3
- SQLAlchemy 2.0 (async) with SQLite
- JWT Authentication with python-jose + passlib

**Frontend**
- React 19 with TypeScript
- Vite 8 for build tooling
- React Router DOM 7

## Project Structure

```
math-buddy/
├── app/
│   ├── config.py          # Settings and configuration
│   ├── database.py        # SQLAlchemy async setup
│   ├── models/
│   │   └── models.py      # Database models (User, MathProblem, PracticeSession)
│   ├── routers/
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── users.py       # User management
│   │   ├── problems.py    # Math problem CRUD
│   │   └── practice.py    # Practice session management
│   ├── schemas/           # Pydantic request/response models
│   ├── services/          # Business logic
│   └── utils/
│       └── security.py    # Password hashing, JWT utilities
├── frontend/
│   └── src/
│       ├── components/    # React components
│       ├── pages/        # Page components (Auth, Dashboard, Practice, Admin)
│       ├── services/      # API client
│       ├── store/         # React context (auth state)
│       └── types/         # TypeScript interfaces
├── tests/                # Unit tests (26 tests)
├── main.py               # FastAPI application entry point
└── requirements.txt      # Python dependencies
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to project directory
cd math-buddy

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd math-buddy/frontend

# Install dependencies
npm install

# Run the frontend dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (student or admin) |
| POST | `/api/auth/login` | Login and get JWT tokens |
| GET | `/api/auth/me` | Get current user info |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user stats |
| GET | `/api/users` | List all users (admin only) |
| DELETE | `/api/users/{id}` | Delete user (admin only) |

### Math Problems
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/problems` | List all problems |
| GET | `/api/problems/{id}` | Get specific problem |
| POST | `/api/problems` | Create problem (admin only) |
| DELETE | `/api/problems/{id}` | Delete problem (admin only) |

### Practice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/practice/sessions` | Start new practice session |
| POST | `/api/practice/sessions/{id}/answer` | Submit answer |
| GET | `/api/practice/sessions` | List user's sessions |
| GET | `/api/practice/sessions/{id}/stats` | Get session stats |

## Math Operations

| Operation | Symbol | Difficulty | Examples |
|-----------|--------|------------|----------|
| Addition | + | Easy: single digit, Medium: double digit, Hard: triple digit | 7+5=12, 34+89=123, 456+789=1245 |
| Subtraction | − | Easy: single digit, Medium: double digit, Hard: triple digit | 9-4=5, 72-38=34, 851-276=575 |
| Multiplication | × | Easy: single digit, Medium: double digit, Hard: triple digit | 6×4=24, 12×8=96, 34×21=714 |
| Division | ÷ | Easy: single digit, Medium: double digit, Hard: triple digit | 12÷3=4, 56÷7=8, 144÷12=12 |

## Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --cov
```

## User Roles

### Student
- Practice math problems
- Track personal progress
- View own stats

### Admin
- All student capabilities
- Manage users (view, delete)
- Manage math problems (create, delete)
- Access admin panel

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=sqlite+aiosqlite:///./math_buddy.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## License

MIT License
