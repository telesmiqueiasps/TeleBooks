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
    <div className="flex flex-col space-y-3">
      <BookCoverSkeleton />
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}
