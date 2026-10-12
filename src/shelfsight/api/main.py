"""FastAPI application factory."""

from __future__ import annotations

import logging

from fastapi import FastAPI

from shelfsight import __version__
from shelfsight.api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> FastAPI:
    app = FastAPI(
        title="GapX",
        description=(
            "AI-powered retail shelf intelligence for empty-shelf detection, stockout alerts, "
            "product placement monitoring, and planogram compliance scoring."
        ),
        version=__version__,
    )
    app.include_router(router)
    return app


app = create_app()
