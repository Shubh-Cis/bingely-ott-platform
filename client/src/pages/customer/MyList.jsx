import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import TitleCard from "../../components/TitleCard";

// "My List" — the viewer's saved favourites (like Netflix My List / Prime Watchlist).
export default function MyList() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    accountApi.favourites().then(setItems).catch((e) => setError(apiError(e)));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">My List</h1>
      {error && <p className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</p>}

      {items === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/2] rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface/60 py-20 text-center">
          <p className="text-lg font-semibold">Your list is empty</p>
          <p className="mt-1 text-gray-500">Tap “+ My List” on any title to save it here.</p>
          <Link to="/" className="btn-primary mt-5 inline-flex">Browse titles</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((t) => <TitleCard key={t.id} title={t} full />)}
        </div>
      )}
    </div>
  );
}
