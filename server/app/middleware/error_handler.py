from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import psycopg2
from app.core.exceptions import AppException

def add_exception_handler(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request,
        exc: AppException,
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.message,
                "status_code": exc.status_code,
            },
        )

    @app.exception_handler(psycopg2.Error)
    async def psycopg2_exception_handler(
        request: Request,
        exc: psycopg2.Error,
    ):
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "A database error occurred",
                "status_code": 500,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception,
    ):
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "An unexpected error occurred",
                "status_code": 500,
            },
        )