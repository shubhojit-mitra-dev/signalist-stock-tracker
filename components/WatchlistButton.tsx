"use client";
import React, { useMemo, useState, useTransition } from "react";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const [isPending, startTransition] = useTransition();

  const label = useMemo(() => {
    if (type === "icon") return added ? "" : "";
    if (isPending) return added ? "Removing..." : "Adding...";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type, isPending]);

  const handleClick = () => {
    if (isPending) return;

    const previousState = added;
    const nextState = !added;
    
    // Optimistic update
    setAdded(nextState);
    onWatchlistChange?.(symbol, nextState);

    startTransition(async () => {
      try {
        const result = nextState 
          ? await addToWatchlist(symbol, company)
          : await removeFromWatchlist(symbol);

        if (!result.success) {
          // Revert optimistic update on failure
          setAdded(previousState);
          onWatchlistChange?.(symbol, previousState);
          toast.error(result.error || "Operation failed");
        } else {
          // Success feedback
          toast.success(
            nextState 
              ? `${symbol} added to watchlist` 
              : `${symbol} removed from watchlist`
          );
        }
      } catch (error) {
        // Revert optimistic update on error
        setAdded(previousState);
        onWatchlistChange?.(symbol, previousState);
        toast.error("Something went wrong. Please try again.");
        console.error("Watchlist operation error:", error);
      }
    });
  };

  if (type === "icon") {
    return (
      <button
        disabled={isPending}
        title={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        aria-label={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:bg-gray-700 ${added ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"} ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={handleClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={added ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button 
      disabled={isPending}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        added 
          ? "border border-red-600 text-red-400 bg-red-600/10 hover:bg-red-600/20 hover:border-red-500" 
          : "border border-blue-600 text-blue-400 bg-blue-600/10 hover:bg-blue-600/20 hover:border-blue-500"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`} 
      onClick={handleClick}
    >
      {showTrashIcon && added ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 mr-1"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      ) : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
