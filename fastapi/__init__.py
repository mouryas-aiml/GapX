"""Minimal local compatibility layer for FastAPI.

The real project code only needs a very small subset of FastAPI's API surface:
an application object, a router with GET/POST decorators, UploadFile, and an
HTTPException type. Starlette provides the HTTP runtime underneath.
"""

from __future__ import annotations

import inspect
from dataclasses import dataclass
from typing import Any, Callable, Coroutine, get_type_hints

from starlette.applications import Starlette
from starlette.datastructures import UploadFile
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route


class HTTPException(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass(slots=True)
class _RouteDefinition:
    method: str
    path: str
    endpoint: Callable[..., Any]


class APIRouter:
    def __init__(self) -> None:
        self.routes: list[_RouteDefinition] = []

    def get(self, path: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        return self._register("GET", path)

    def post(self, path: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        return self._register("POST", path)

    def _register(self, method: str, path: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(endpoint: Callable[..., Any]) -> Callable[..., Any]:
            self.routes.append(_RouteDefinition(method=method, path=path, endpoint=endpoint))
            return endpoint

        return decorator


class FastAPI:
    def __init__(self, *, title: str = "", description: str = "", version: str = "") -> None:
        self.title = title
        self.description = description
        self.version = version
        self._routes: list[_RouteDefinition] = []
        self._app = Starlette(debug=False, routes=[])

    def include_router(self, router: APIRouter) -> None:
        self._routes.extend(router.routes)
        self._rebuild()

    def _rebuild(self) -> None:
        routes: list[Route] = []
        for route in self._routes:
            routes.append(Route(route.path, self._wrap(route.endpoint), methods=[route.method]))
        self._app = Starlette(debug=False, routes=routes)

    def _wrap(self, endpoint: Callable[..., Any]) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        async def handler(request: Request) -> Response:
            try:
                kwargs = await _build_kwargs(request, endpoint)
                result = endpoint(**kwargs)
                if inspect.isawaitable(result):
                    result = await result
                return _coerce_response(result)
            except HTTPException as exc:
                return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

        return handler

    async def __call__(self, scope: dict[str, Any], receive: Callable[..., Any], send: Callable[..., Any]) -> None:
        await self._app(scope, receive, send)


async def _build_kwargs(request: Request, endpoint: Callable[..., Any]) -> dict[str, Any]:
    signature = inspect.signature(endpoint)
    hints = get_type_hints(endpoint, globalns=getattr(endpoint, "__globals__", None))
    kwargs: dict[str, Any] = {}
    form = None
    query = request.query_params

    for name, param in signature.parameters.items():
        annotation = hints.get(name, param.annotation)
        default = param.default

        if annotation is UploadFile:
            if form is None:
                form = await request.form()
            if name not in form:
                if default is inspect._empty:
                    raise HTTPException(status_code=422, detail=f"Missing required file: {name}")
                kwargs[name] = default
                continue
            kwargs[name] = form[name]
            continue

        source_value = query.get(name)
        if source_value is None:
            if default is inspect._empty:
                raise HTTPException(status_code=422, detail=f"Missing required parameter: {name}")
            kwargs[name] = default
            continue
        kwargs[name] = _coerce_value(source_value, annotation, default)

    return kwargs


def _coerce_value(value: str, annotation: Any, default: Any) -> Any:
    target = annotation if annotation is not inspect._empty else type(default)
    if target is bool or isinstance(default, bool):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if target is int or isinstance(default, int):
        return int(value)
    if target is float or isinstance(default, float):
        return float(value)
    return value


def _coerce_response(result: Any) -> Response:
    if isinstance(result, Response):
        return result
    return JSONResponse(result)
