import logging
import logging.handlers
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.database import init_db
from app.routers import auth, users, problems, practice
from app.routers.auth import limiter


def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Suppress known passlib/bcrypt version detection warning (passlib 1.7.4
    # uses _bcrypt.__about__.__version__ which bcrypt 4.x removed - harmless)
    class PasslibBcryptWarningFilter(logging.Filter):
        def filter(self, record):
            msg = record.getMessage()
            return not ("(trapped) error reading bcrypt version" in msg)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.addFilter(PasslibBcryptWarningFilter())
    console_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(console_formatter)

    # File handler (rotating, max 5MB per file, keep 5 files)
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
    )
    file_handler.setLevel(logging.INFO)
    file_handler.addFilter(PasslibBcryptWarningFilter())
    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s"
    )
    file_handler.setFormatter(file_formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MathBuddy API starting up...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("MathBuddy API shutting down...")


app = FastAPI(title="MathBuddy API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
logger = setup_logging()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(problems.router)
app.include_router(practice.router)


@app.get("/")
async def root():
    return {"message": "MathBuddy API is running!"}


@app.get("/health")
async def health():
    return {"status": "healthy"}