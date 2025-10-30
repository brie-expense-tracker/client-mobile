export enum ApiErrorType {
	NETWORK_ERROR = 'NETWORK_ERROR',
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	SERVER_ERROR = 'SERVER_ERROR',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	OFFLINE_ERROR = 'OFFLINE_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ApiError extends Error {
	constructor(
		message: string,
		public type: ApiErrorType,
		public status?: number,
		public response?: any
	) {
		super(message);
		this.name = 'ApiError';
	}
}
