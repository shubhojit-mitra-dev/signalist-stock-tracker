'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { fetchJSON } from './finnhub.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

export async function addToWatchlist(symbol: string, company: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    await connectToDatabase();

    // Check if already in watchlist
    const existing = await Watchlist.findOne({ userId: session.user.id, symbol: symbol.trim().toUpperCase() });
    if (existing) {
      return { success: false, error: 'Stock already in watchlist' };
    }

    // Add to watchlist
    await Watchlist.create({
      userId: session.user.id,
      symbol: symbol.trim().toUpperCase(),
      company: company.trim(),
      addedAt: new Date(),
    });

    // Revalidate relevant pages
    revalidatePath('/watchlist');
    revalidatePath('/stocks/[symbol]', 'page');
    
    return { success: true };
  } catch (err) {
    console.error('addToWatchlist error:', err);
    return { success: false, error: 'Failed to add to watchlist' };
  }
}

export async function removeFromWatchlist(symbol: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    await connectToDatabase();

    // Remove from watchlist
    const result = await Watchlist.deleteOne({ 
      userId: session.user.id, 
      symbol: symbol.trim().toUpperCase() 
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Stock not found in watchlist' };
    }

    // Revalidate relevant pages
    revalidatePath('/watchlist');
    revalidatePath('/stocks/[symbol]', 'page');
    
    return { success: true };
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}

export async function isInWatchlist(symbol: string): Promise<boolean> {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return false;
    }

    await connectToDatabase();

    const item = await Watchlist.findOne({ 
      userId: session.user.id, 
      symbol: symbol.trim().toUpperCase() 
    });

    return !!item;
  } catch (err) {
    console.error('isInWatchlist error:', err);
    return false;
  }
}

export async function getWatchlistWithData(): Promise<StockWithData[]> {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return [];
    }

    await connectToDatabase();

    // Get watchlist items
    const watchlistItems = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (watchlistItems.length === 0) {
      return [];
    }

    // Fetch current stock data for each item
    const stocksWithData = await Promise.allSettled(
      watchlistItems.map(async (item) => {
        try {
          const [quoteData, profileData] = await Promise.all([
            fetchJSON<QuoteData>(`${FINNHUB_BASE_URL}/quote?symbol=${item.symbol}&token=${FINNHUB_API_KEY}`, 300),
            fetchJSON<ProfileData>(`${FINNHUB_BASE_URL}/stock/profile2?symbol=${item.symbol}&token=${FINNHUB_API_KEY}`, 1800)
          ]);

          const currentPrice = quoteData?.c;
          const changePercent = quoteData?.dp;
          const marketCap = profileData?.marketCapitalization;

          return {
            userId: item.userId,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice,
            changePercent,
            priceFormatted: currentPrice ? `$${currentPrice.toFixed(2)}` : 'N/A',
            changeFormatted: changePercent ? 
              `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%` : 'N/A',
            marketCap: marketCap ? 
              marketCap > 1000 ? `$${(marketCap / 1000).toFixed(1)}T` : `$${marketCap.toFixed(1)}B` 
              : 'N/A',
            peRatio: 'N/A' // Can be added later if needed
          };
        } catch (error) {
          console.error(`Error fetching data for ${item.symbol}:`, error);
          return {
            userId: item.userId,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice: undefined,
            changePercent: undefined,
            priceFormatted: 'N/A',
            changeFormatted: 'N/A',
            marketCap: 'N/A',
            peRatio: 'N/A'
          };
        }
      })
    );

    // Filter successful results and cast properly
    return stocksWithData
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<StockWithData>).value);

  } catch (err) {
    console.error('getWatchlistWithData error:', err);
    return [];
  }
}
