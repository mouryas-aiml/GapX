"""FastAPI application factory."""

from __future__ import annotations

import logging

from fastapi import FastAPI

from shelfsight import __version__
from shelfsight.api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> FastAPI:
    app = FastAPI(
        title="shelfsight",
        description="Retail shelf analytics with classical computer vision: product-facing segmentation, share-of-shelf by brand color, gap detection, and planogram compliance scoring.",
        version=__version__,
    )
    app.include_router(router)
    return app


app = create_app()
