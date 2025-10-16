import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import WatchlistTable from "@/components/WatchlistTable";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const watchlistData = await getWatchlistWithData();

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Watchlist
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your favorite stocks and monitor their performance
            {watchlistData.length > 0 && ` • ${watchlistData.length} stock${watchlistData.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {/* Watchlist Content */}
        <WatchlistTable watchlist={watchlistData} />
      </div>
    </div>
  );
}
