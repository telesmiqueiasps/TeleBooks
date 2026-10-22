import React from "react";
import { cn } from "../utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#e8e4dc] dark:bg-[#252a35]",
        className
      )}
      {...props}
    />
  );
}

export function BookCoverSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "aspect-[2/3] w-full rounded-lg bg-[#e8e4dc] dark:bg-[#252a35] animate-pulse shadow-inner relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-y-0 left-0 w-2.5 bg-black/5 dark:bg-white/5" />
    </div>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col space-y-1.5 sm:space-y-2">
      <BookCoverSkeleton className="rounded-md sm:rounded-lg" />
      <div className="space-y-1 pt-0.5">
        <Skeleton className="h-2.5 sm:h-3 w-5/6 rounded" />
        <Skeleton className="h-2 sm:h-2.5 w-1/2 rounded" />
      </div>
      <div className="flex items-center gap-1 pt-0.5">
        <Skeleton className="h-3 sm:h-3.5 w-10 sm:w-12 rounded-full" />
      </div>
    </div>
  );
}
