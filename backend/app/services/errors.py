class ServiceError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(ServiceError):
    pass


class ConflictError(ServiceError):
    pass


class InvalidDataError(ServiceError):
    pass
