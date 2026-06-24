interface ApiErrorOptions {
    status: number;
    code: string;
    details: any;
}


export class ApiError extends Error {
    status: number;
    code: string;
    details: any;

    constructor(message: string, { status, code, details }: ApiErrorOptions = {} as ApiErrorOptions) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

