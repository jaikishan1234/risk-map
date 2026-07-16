"use client";

import { useForm } from "react-hook-form";
import {
  analyzeRequestSchema,
  type AnalyzeRequest,
} from "@/lib/validation/analyze-request.schema";

const EXAMPLE_REPOS = [
  "https://github.com/facebook/react",
  "https://github.com/vercel/next.js",
];

interface RepoUrlInputProps {
  /** Called with the validated URL once the form passes validation. */
  onSubmit: (repositoryUrl: string) => void;
  isSubmitting?: boolean;
}

export function RepoUrlInput({ onSubmit, isSubmitting }: RepoUrlInputProps) {
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isValidating },
  } = useForm<AnalyzeRequest>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { repositoryUrl: "" },
  });

  const submitHandler = handleSubmit((data) => {
    // Re-parse defensively; register() validation below already guarantees
    // this passes, but this keeps the schema as the single source of truth.
    const result = analyzeRequestSchema.safeParse(data);
    if (result.success) {
      onSubmit(result.data.repositoryUrl);
    }
  });

  const handleExampleClick = (url: string) => {
    setValue("repositoryUrl", url, { shouldDirty: true });
    void trigger("repositoryUrl");
  };

  return (
    <form onSubmit={submitHandler} noValidate className="w-full max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="repositoryUrl" className="sr-only">
            GitHub repository URL
          </label>
          <input
            id="repositoryUrl"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://github.com/owner/repo"
            aria-invalid={errors.repositoryUrl ? "true" : "false"}
            aria-describedby={
              errors.repositoryUrl ? "repositoryUrl-error" : undefined
            }
            className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2 ${
              errors.repositoryUrl
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-blue-200"
            }`}
            {...register("repositoryUrl", {
              validate: (value) => {
                const result = analyzeRequestSchema.shape.repositoryUrl.safeParse(
                  value
                );
                return result.success || result.error.issues[0].message;
              },
            })}
          />
          {errors.repositoryUrl && (
            <p
              id="repositoryUrl-error"
              role="alert"
              className="mt-1.5 text-sm text-red-600"
            >
              {errors.repositoryUrl.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isValidating}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="pt-1">Try:</span>
        {EXAMPLE_REPOS.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => handleExampleClick(url)}
            className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-50"
          >
            {url.replace("https://github.com/", "")}
          </button>
        ))}
      </div>
    </form>
  );
}