"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import {Button} from "@/components/ui/button";
import {Loader2,  TrendingUp} from "lucide-react";
import Link from "next/link";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {useDebounce} from "@/hooks/useDebounce";
import WatchlistButton from "./WatchlistButton";

export default function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleSearch = async () => {
    if(!isSearchMode) return setStocks(initialStocks);

    setLoading(true)
    try {
        const results = await searchStocks(searchTerm.trim());
        setStocks(results);
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
  }

  const handleWatchlistChange = (symbol: string, isAdded: boolean) => {
    // Update local state immediately for better UX
    setStocks(prev => 
      prev.map(stock => 
        stock.symbol === symbol 
          ? { ...stock, isInWatchlist: isAdded }
          : stock
      )
    );
  };

  return (
    <>
      {renderAs === 'text' ? (
          <span onClick={() => setOpen(true)} className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors">
            {label}
          </span>
      ): (
          <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg">
            {label}
          </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="max-w-2xl bg-gray-900 border-gray-700 shadow-2xl">
        <div className="flex items-center border-b border-gray-700 px-4 bg-gray-900">
          <CommandInput 
            value={searchTerm} 
            onValueChange={setSearchTerm} 
            placeholder="Search stocks..." 
            className="flex-1 py-4 text-white bg-gray-900 border-0 focus:ring-0 placeholder-gray-400" 
          />
          {loading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin ml-2" />}
        </div>
        <CommandList className="max-h-96 overflow-y-auto bg-gray-900">
          {loading ? (
              <CommandEmpty className="py-8 text-center text-gray-400">Loading stocks...</CommandEmpty>
          ) : displayStocks?.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                {isSearchMode ? 'No results found' : 'No stocks available'}
              </div>
            ) : (
            <div className="bg-gray-900">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 bg-gray-850">
                {isSearchMode ? 'Search results' : 'Popular stocks'}
                {` `}({displayStocks?.length || 0})
              </div>
              {displayStocks?.map((stock, i) => (
                  <div key={stock.symbol} className="flex items-center px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-b-0 transition-colors">
                    <Link
                        href={`/stocks/${stock.symbol}`}
                        onClick={handleSelectStock}
                        className="flex items-center flex-1 min-w-0"
                    >
                      <div className="flex-shrink-0 mr-3">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {stock.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {stock.symbol} | {stock.exchange } | {stock.type}
                        </div>
                      </div>
                    </Link>
                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-3">
                      <WatchlistButton
                        symbol={stock.symbol}
                        company={stock.name}
                        isInWatchlist={stock.isInWatchlist}
                        type="icon"
                        onWatchlistChange={handleWatchlistChange}
                      />
                    </div>
                  </div>
              ))}
            </div>
          )
          }
        </CommandList>
      </CommandDialog>
    </>
  )
}
