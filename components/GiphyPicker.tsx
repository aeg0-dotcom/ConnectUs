
import React, { useState, useEffect } from 'react';
import { TENOR_API_KEY } from '../constants';
import { Search, Loader2, AlertCircle } from 'lucide-react';

interface GiphyPickerProps {
  onSelect: (gifUrl: string, title: string) => void;
  onClose: () => void;
}

interface TenorResult {
  id: string;
  title: string;
  media: {
    nanogif?: { url: string; dims: number[] };
    tinygif?: { url: string; dims: number[] };
    gif?: { url: string; dims: number[] };
    mediumgif?: { url: string; dims: number[] };
  }[];
}

// Robust fallback library in case API fails
const FALLBACK_GIFS = [
    { title: "Excited", url: "https://media.tenor.com/images/1c8f773c09c6460773d226a978508a0d/tenor.gif" },
    { title: "Thumbs Up", url: "https://media.tenor.com/images/84100d110f0d2c003cb63a4365851493/tenor.gif" },
    { title: "Laughing", url: "https://media.tenor.com/images/40538a798533b3531b65e9401765c924/tenor.gif" },
    { title: "Applause", url: "https://media.tenor.com/images/30376b885834d852aa40510563456e7e/tenor.gif" },
    { title: "Mind Blown", url: "https://media.tenor.com/images/0d68625946dc39999a463a8e998858db/tenor.gif" },
    { title: "Cat", url: "https://media.tenor.com/images/2202651152df85b67a544df886b72a44/tenor.gif" },
    { title: "Party", url: "https://media.tenor.com/images/4c022e3e536555194451996515285749/tenor.gif" },
    { title: "Cool", url: "https://media.tenor.com/images/43204961e6992d2948c2690d7945d81b/tenor.gif" },
    { title: "Crying", url: "https://media.tenor.com/images/58e235e128cc15525c35b892a012a953/tenor.gif" },
    { title: "Thinking", url: "https://media.tenor.com/images/e991cb45508ce8995325c11090332d43/tenor.gif" },
    { title: "No", url: "https://media.tenor.com/images/273618683391742468205f257a468d6f/tenor.gif" },
    { title: "Yes", url: "https://media.tenor.com/images/7e040f7d5c5897072a47291a826477e7/tenor.gif" },
    { title: "Facepalm", url: "https://media.tenor.com/images/6358359b36056b0d91295988e0b96879/tenor.gif" },
    { title: "Waiting", url: "https://media.tenor.com/images/9dcc04473855a9018c1b333796d11e9f/tenor.gif" },
    { title: "Hello", url: "https://media.tenor.com/images/7a68884968a35e72d25087796d494916/tenor.gif" }
];

export const GiphyPicker: React.FC<GiphyPickerProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TenorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    setIsFallback(false);
    try {
      // Removed media_filter=minimal to get more robust format options
      const res = await fetch(`https://g.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=20`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.warn("Tenor API failed, using fallback.", error);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return fetchTrending();

    setLoading(true);
    setIsFallback(false);
    try {
      const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.warn("Tenor Search failed, using fallback.", error);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-16 right-4 w-72 md:w-80 h-96 bg-nexus-800 rounded-lg shadow-2xl border border-nexus-600 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-nexus-700 flex gap-2 shrink-0">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <input
            type="text"
            className="w-full bg-nexus-900 text-white text-sm rounded px-3 py-1.5 pl-8 focus:outline-none focus:ring-1 focus:ring-nexus-accent placeholder-gray-500 border border-nexus-700"
            placeholder="Search Tenor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Search className="absolute left-2 top-2 text-gray-500 w-4 h-4" />
        </form>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-nexus-900/50">
        {loading ? (
          <div className="flex h-full items-center justify-center text-nexus-accent flex-col gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs text-gray-400">Loading GIFs...</span>
          </div>
        ) : (
          <>
            {isFallback ? (
                <div className="space-y-2">
                    <div className="mb-2 px-1 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-center">
                        <p className="text-[10px] text-yellow-500">Offline Mode: Showing popular GIFs.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {FALLBACK_GIFS.map((gif, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSelect(gif.url, gif.title)}
                                className="relative group aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-nexus-accent transition-all bg-nexus-900"
                            >
                                <img 
                                    src={gif.url} 
                                    alt={gif.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : results.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                    No GIFs found.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {results.map((gif) => {
                        // Safe access to media formats
                        const media = gif.media?.[0];
                        // Try nanogif first (fastest), then tinygif, then standard gif
                        const previewUrl = media?.nanogif?.url || media?.tinygif?.url || media?.gif?.url;
                        // For sending, prefer standard gif or mediumgif
                        const fullUrl = media?.gif?.url || media?.mediumgif?.url || previewUrl;

                        if (!previewUrl || !fullUrl) return null;

                        return (
                            <button
                                key={gif.id}
                                onClick={() => onSelect(fullUrl, gif.title)}
                                className="relative group aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-nexus-accent transition-all bg-nexus-900"
                            >
                                <img 
                                    src={previewUrl} 
                                    alt={gif.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                        );
                    })}
                </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-1 bg-nexus-900 text-[10px] text-center text-gray-500 border-t border-nexus-700 shrink-0">
        Powered by Tenor
      </div>
    </div>
  );
};
