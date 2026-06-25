export enum ErrorCode {
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  PLATFORM_ERROR = "PLATFORM_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export class PlatformError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public platform?: string,
    public httpStatus?: number
  ) {
    super(message)
    this.name = "PlatformError"
  }
}
