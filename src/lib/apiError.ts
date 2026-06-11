function formatUnknownDetail(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (Array.isArray(value)) {
        return value
            .map(formatUnknownDetail)
            .filter(Boolean)
            .join(", ");
    }

    if (typeof value === "object" && value !== null) {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, nestedValue]) => {
                const formatted = formatUnknownDetail(nestedValue);
                return formatted ? `${key}: ${formatted}` : "";
            })
            .filter(Boolean)
            .join("; ");
    }

    if (value === null || value === undefined) {
        return "";
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

function getErrorText(error: unknown): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const axiosLikeError = error as {
            response?: {
                data?: unknown;
            };
        };

        return formatUnknownDetail(axiosLikeError.response?.data);
    }

    if (error instanceof Error) {
        return error.message;
    }

    return formatUnknownDetail(error);
}

export function isMissingResourceError(error: unknown): boolean {
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

        if (axiosLikeError.response?.status === 404) {
            return true;
        }
    }

    const lower = getErrorText(error).toLowerCase();

    return [
        "not found",
        "no longer exists",
        "already updated or deleted",
        "objectoptimisticlockingfailureexception",
        "staleobjectstateexception",
    ].some((pattern) => lower.includes(pattern));
}

function formatEntityName(entityName: string): string {
    return entityName.charAt(0).toUpperCase() + entityName.slice(1);
}

export function getMissingResourceMessage(
    entityName: string,
    ids: number | number[],
): string {
    const idList = Array.isArray(ids) ? ids : [ids];
    const entityLabel = formatEntityName(entityName);
    const idLabel = idList.length === 1 ? `id ${idList[0]}` : `ids ${idList.join(", ")}`;

    return `${entityLabel} with ${idLabel} no longer exists. Refreshing the list.`;
}

export function getDeleteErrorMessage(
    error: unknown,
    entityName: string,
    ids: number | number[],
): string {
    if (isMissingResourceError(error)) {
        return getMissingResourceMessage(entityName, ids);
    }

    return getDeleteRelatedRecordsMessage(entityName, ids);
}

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
                errors?: unknown;
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

            const formattedDetails = formatUnknownDetail(body.details);

            if (formattedDetails) {
                return typeof body.message === "string" && body.message.trim()
                    ? `${body.message}: ${formattedDetails}`
                    : formattedDetails;
            }

            const formattedErrors = formatUnknownDetail(body.errors);

            if (formattedErrors) {
                return typeof body.message === "string" && body.message.trim()
                    ? `${body.message}: ${formattedErrors}`
                    : formattedErrors;
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

export function getDeleteRelatedRecordsMessage(
    entityName: string,
    ids: number | number[],
): string {
    const idList = Array.isArray(ids) ? ids : [ids];

    return `Cannot delete ${entityName} with id ${idList.join(", ")} because it has related records`;
}

export function getDeleteSuccessMessage(entityName: string, selected = false): string {
    return selected ? `Selected ${entityName}s deleted` : `${entityName} deleted`;
}
