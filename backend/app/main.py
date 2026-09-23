import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.seed.seed_data import seed_database
from app.api import auth, analysis, agent, incidents, dashboard, knowledge, audit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sentri_ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed data
    logger.info("Initializing SentriAI database tables...")
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
            conn.commit()
        except Exception:
            pass
    db = SessionLocal()
    try:
        logger.info("Running automatic seed data verification...")
        await seed_database(db)
        logger.info("Database ready and primed with knowledge base and demo scenarios.")
    except Exception as e:
        logger.error(f"Error during startup seeding: {e}", exc_info=True)
    finally:
        db.close()
    yield
    logger.info("Shutting down SentriAI...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SentriAI - Your Intelligent Digital Security Companion",
    lifespan=lifespan
)

# CORS Configuration
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS if origin.strip() and origin.strip() != "*"]
if not cors_origins:
    cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers with standard /api/v1 prefix
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(agent.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(knowledge.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

# Direct /api mounts and aliases for prompt compatibility
app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(knowledge.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

# AI direct aliases: /api/ai/chat & /api/ai/investigate
ai_router = APIRouter(prefix="/api/ai", tags=["AI SOC Agent Aliases"])
ai_router.add_api_route("/chat", agent.agent_chat, methods=["POST"], response_model=agent.AgentChatResponse)
ai_router.add_api_route("/investigate", agent.run_investigation, methods=["POST"])
app.include_router(ai_router)

# Analyze direct aliases: /api/analyze/...
analyze_router = APIRouter(prefix="/api/analyze", tags=["Security Analysis Aliases"])
analyze_router.add_api_route("/email", analysis.analyze_email, methods=["POST"])
analyze_router.add_api_route("/message", analysis.analyze_message, methods=["POST"])
analyze_router.add_api_route("/url", analysis.analyze_url, methods=["POST"])
analyze_router.add_api_route("/file", analysis.analyze_file, methods=["POST"])
analyze_router.add_api_route("/compromise", analysis.report_compromise, methods=["POST"])
app.include_router(analyze_router)

# SOC direct aliases: /api/soc/...
soc_router = APIRouter(prefix="/api/soc", tags=["SOC Operations Aliases"])
soc_router.add_api_route("/dashboard", dashboard.get_soc_dashboard, methods=["GET"])
soc_router.add_api_route("/incidents", incidents.list_incidents, methods=["GET"])
soc_router.add_api_route("/analytics", dashboard.get_threat_trends, methods=["GET"])
app.include_router(soc_router)


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SentriAI API"}
