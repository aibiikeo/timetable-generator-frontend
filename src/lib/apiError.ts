export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const axiosLikeError = error as {
            response?: {
                data?: unknown;
                status?: number;
            };
        };

        const data = axiosLikeError.response?.data;

        if (typeof data === "string" && data.trim()) {
            return data;
        }

        if (typeof data === "object" && data !== null) {
            const body = data as {
                message?: unknown;
                error?: unknown;
                details?: unknown;
            };

            if (typeof body.message === "string" && body.message.trim()) {
                return body.message;
            }

            if (typeof body.error === "string" && body.error.trim()) {
                return body.error;
            }

            if (typeof body.details === "string" && body.details.trim()) {
                return body.details;
            }
        }

        if (axiosLikeError.response?.status === 400) {
            return "Invalid data. Please check the form fields.";
        }

        if (axiosLikeError.response?.status === 401) {
            return "Your session has expired. Please log in again.";
        }

        if (axiosLikeError.response?.status === 403) {
            return "You do not have permission to perform this action.";
        }

        if (axiosLikeError.response?.status === 404) {
            return "The requested resource was not found.";
        }

        if (axiosLikeError.response?.status === 409) {
            return "This action conflicts with existing data.";
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}