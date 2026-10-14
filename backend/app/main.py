from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.services.errors import ConflictError, InvalidDataError, NotFoundError, ServiceError

ERROR_STATUS: dict[type[ServiceError], int] = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
    InvalidDataError: status.HTTP_422_UNPROCESSABLE_CONTENT,
}


async def service_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ServiceError)
    code = ERROR_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
    return JSONResponse(status_code=code, content={"detail": exc.detail})


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CoffeeMetrics API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(ServiceError, service_error_handler)
    app.include_router(api_router)
    return app


app = create_app()
