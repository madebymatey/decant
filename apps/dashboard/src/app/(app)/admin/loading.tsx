import { Skeleton } from "@/components/ui"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  )
}
