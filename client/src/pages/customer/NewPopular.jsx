import { useEffect, useState } from "react";
import { catalogApi } from "../../services/api";
import Rail from "../../components/Rail";
import { RailSkeleton } from "../../components/Skeleton";

// "New & Popular" — a curated set of rails built from search queries.
export default function NewPopular() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const grab = (params) => catalogApi.search({ pageSize: 18, ...params }).then((r) => r.data).catch(() => []);
    Promise.all([
      grab({ sort: "newest" }),
      grab({ sort: "rating" }),
      grab({ type: "MOVIE", sort: "rating" }),
      grab({ type: "SERIES", sort: "rating" }),
      grab({ type: "DOCUMENTARY", sort: "newest" }),
    ]).then(([newest, trending, movies, series, docs]) => setData({ newest, trending, movies, series, docs }));
  }, []);

  if (!data) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-black">New &amp; Popular</h1>
        <RailSkeleton title />
        <RailSkeleton title />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <h1 className="mb-6 text-3xl font-black">New &amp; Popular</h1>
      <Rail name="🆕 Newly Added" items={data.newest} />
      <Rail name="🔥 Trending Now" items={data.trending} ranked={data.trending.length > 2} />
      <Rail name="Popular Movies" items={data.movies} />
      <Rail name="Popular Series" items={data.series} />
      <Rail name="Documentaries" items={data.docs} />
    </div>
  );
}
