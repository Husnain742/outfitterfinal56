export default function ProductSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-3xl p-4 flex flex-col justify-between animate-pulse">
      <div>
        {/* Image Skeleton */}
        <div className="w-full h-52 bg-canvas border border-line rounded-2xl mb-4" />
        
        {/* Title Skeleton */}
        <div className="h-4 bg-canvas rounded-full w-3/4 mb-2" />
        
        {/* Description Skeleton */}
        <div className="h-3 bg-canvas rounded-full w-full mb-1" />
        <div className="h-3 bg-canvas rounded-full w-5/6 mb-4" />
      </div>

      {/* Price & Button Skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <div className="h-4 bg-canvas rounded-full w-20" />
        <div className="h-8 bg-canvas rounded-full w-16" />
      </div>
    </div>
  );
}