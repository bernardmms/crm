import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { validationErrorResponseSchema } from "@repo/api-contract";
import type z from "zod";

type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;

export function mapTsRestErrorsToFormErrors<T extends FieldValues>(
  errorResponse: ValidationErrorResponse,
  setError: UseFormSetError<T>
) {
  const results = [
    errorResponse.bodyResult,
    errorResponse.queryResult,
    errorResponse.paramsResult,
  ];

  for (const result of results) {
    if (result?.issues) {
      for (const issue of result.issues) {
        const fieldPath = issue.path.join(".") as Path<T>;
        if (fieldPath) {
          setError(fieldPath, {
            type: issue.code,
            message: issue.message,
          });
        }
      }
    }
  }
}
