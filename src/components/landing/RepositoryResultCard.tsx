import type { RepositoryMetadata } from "@/types/repository.types";
import { formatCompactNumber, formatRelativeDate } from "@/utils/format";

interface RepositoryResultCardProps {
  repository: RepositoryMetadata;
}

export function RepositoryResultCard({ repository }: RepositoryResultCardProps) {
  return (
    <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {repository.name}
          </h3>
          {repository.description && (
            <p className="mt-1 text-sm text-gray-600">
              {repository.description}
            </p>
          )}
        </div>
        {repository.language && (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {repository.language}
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 text-center">
        <div>
          <dt className="text-xs text-gray-500">Stars</dt>
          <dd className="mt-0.5 text-sm font-semibold text-gray-900">
            {formatCompactNumber(repository.stars)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Forks</dt>
          <dd className="mt-0.5 text-sm font-semibold text-gray-900">
            {formatCompactNumber(repository.forks)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Last Updated</dt>
          <dd className="mt-0.5 text-sm font-semibold text-gray-900">
            {formatRelativeDate(repository.lastUpdated)}
          </dd>
        </div>
      </dl>
    </div>
  );
}