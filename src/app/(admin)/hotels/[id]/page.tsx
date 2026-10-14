"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Hotel, type Rating, type Review } from "@/lib/api";
import DeleteButton from "@/components/delete-button";
import { useAdmin } from "../../admin-context";
import HotelForm from "../hotel-form";
import MenuBoard from "./menu-board";

const TABS = ["Details", "Menu", "Ratings & reviews"] as const;
type TabName = (typeof TABS)[number];

function Feedback({ hotelId, onChange }: { hotelId: string; onChange: () => void }) {
  const { notify } = useAdmin();
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([
      api<Rating[]>(`/hotel/admin/hotels/${hotelId}/ratings`),
      api<Review[]>(`/hotel/admin/hotels/${hotelId}/reviews`),
    ])
      .then(([r, v]) => {
        setRatings(r);
        setReviews(v);
      })
      .catch((err) => setError(err.message));
  }, [hotelId]);

  useEffect(load, [load]);

  if (error) return <p className="text-chilli">{error}</p>;
  if (!ratings || !reviews) return <p className="text-muted">Loading ratings and reviews…</p>;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="grid max-w-5xl gap-6 py-6 lg:grid-cols-[1fr_2fr]">
      <section className="rounded-xl border border-line bg-plate p-5">
        <h2 className="condensed text-xl font-bold">
          Ratings <span className="price font-normal text-muted">{ratings.length}</span>
        </h2>
        {ratings.length === 0 ? (
          <p className="mt-2 text-muted">No one has rated this hotel yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {ratings.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <span className="w-16 shrink-0 tracking-tight text-turmeric" aria-label={`${r.rating_count} out of 5`}>
                  {"★".repeat(r.rating_count)}
                  <span className="text-line">{"★".repeat(5 - r.rating_count)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate">{r.user.username}</span>
                <DeleteButton
                  label="Remove"
                  onDelete={async () => {
                    await api(`/hotel/admin/ratings/${r.id}`, { method: "DELETE" });
                    notify("Rating removed");
                    load();
                    onChange();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-plate p-5">
        <h2 className="condensed text-xl font-bold">
          Reviews <span className="price font-normal text-muted">{reviews.length}</span>
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-muted">No reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {reviews.map((v) => (
              <li key={v.id} className="py-4">
                <p className="max-w-prose whitespace-pre-line">{v.review_text}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                  <span>
                    {v.user.username}, {date(v.created_at)}
                  </span>
                  <DeleteButton
                    label="Remove review"
                    onDelete={async () => {
                      await api(`/hotel/admin/reviews/${v.id}`, { method: "DELETE" });
                      notify("Review removed");
                      load();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function HotelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refreshHotels, bulkVersion, notify } = useAdmin();
  const [loaded, setLoaded] = useState<Hotel | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const [tab, setTab] = useState<TabName>("Details");
  const [switching, setSwitching] = useState(false);
  // The page is reused when switching hotels, so ignore data for a different id
  const hotel = loaded && String(loaded.id) === id ? loaded : null;
  const error = failure?.id === id ? failure.message : "";

  const load = useCallback(() => {
    api<Hotel>(`/hotel/admin/hotels/${id}`)
      .then(setLoaded)
      .catch((err) => setFailure({ id, message: err.message }));
  }, [id]);

  useEffect(load, [load, bulkVersion]);

  if (error) {
    return (
      <div className="px-4 py-10 md:px-10">
        <p className="text-chilli">{error}</p>
        <Link href="/" className="btn btn-quiet mt-4">
          Back to hotels
        </Link>
      </div>
    );
  }
  if (!hotel) return <p className="px-4 py-10 text-muted md:px-10">Loading hotel…</p>;

  async function setVisible(is_active: boolean) {
    setSwitching(true);
    try {
      const saved = await api<Hotel>(`/hotel/admin/hotels/${id}`, { method: "PATCH", body: { is_active } });
      setLoaded((h) => (h ? { ...h, ...saved } : h));
      refreshHotels();
      notify(is_active ? "Hotel is now visible in the app" : "Hotel is now hidden from the app");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setSwitching(false);
    }
  }

  const rating =
    hotel.rating_count && hotel.average_rating != null
      ? `★ ${hotel.average_rating.toFixed(1)} from ${hotel.rating_count} rating${hotel.rating_count === 1 ? "" : "s"}`
      : "No ratings yet";

  return (
    <div className="px-4 md:px-10">
      <div className="pt-4 md:hidden">
        <Link href="/" className="text-sm font-semibold text-leaf">
          ‹ All hotels
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-5 pt-6 md:pt-8">
        {hotel.avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hotel.avatar} alt="" className="size-16 rounded-full border border-line object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="signboard text-[clamp(2.25rem,5vw,3.5rem)] break-words">{hotel.name}</h1>
          <p className="mt-1.5 truncate text-muted">
            {hotel.address}
            {hotel.address && hotel.city ? ", " : ""}
            {hotel.city}
          </p>
          <p className="mt-0.5 text-sm text-muted">{rating}</p>
        </div>

        <button
          role="switch"
          aria-checked={hotel.is_active}
          disabled={switching}
          onClick={() => setVisible(!hotel.is_active)}
          className={`flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 font-semibold disabled:opacity-60 ${hotel.is_active ? "border-leaf/30 bg-leaf-soft text-leaf" : "border-chilli/30 bg-chilli-soft text-chilli"}`}
        >
          <span
            aria-hidden
            className={`relative h-6 w-10 rounded-full transition-colors ${hotel.is_active ? "bg-leaf" : "bg-chilli/50"}`}
          >
            <span
              className={`absolute top-1 size-4 rounded-full bg-white transition-[left] ${hotel.is_active ? "left-5" : "left-1"}`}
            />
          </span>
          {hotel.is_active ? "Visible in app" : "Hidden from app"}
        </button>
      </header>

      <div role="tablist" aria-label="Hotel sections" className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`-mb-px shrink-0 border-b-[3px] px-3 pt-1 pb-2.5 font-semibold ${tab === name ? "border-turmeric text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pb-16">
        {tab === "Details" && (
          <>
            <HotelForm
              key={bulkVersion}
              hotel={hotel}
              onSaved={(saved) => {
                setLoaded({ ...hotel, ...saved });
                refreshHotels();
              }}
            />
            <section className="mt-10 grid gap-3 rounded-xl border border-chilli/30 bg-plate p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="condensed text-lg font-bold text-chilli">Delete this hotel</h3>
                <p className="text-sm text-muted">
                  Removes the hotel with its menus, ratings and reviews. This can’t be undone. To take it off the app
                  for now, switch it to hidden instead.
                </p>
              </div>
              <DeleteButton
                label="Delete hotel"
                variant="button"
                onDelete={async () => {
                  await api(`/hotel/admin/hotels/${hotel.id}`, { method: "DELETE" });
                  notify(`Deleted ${hotel.name}`);
                  refreshHotels();
                  router.replace("/");
                }}
              />
            </section>
          </>
        )}
        {tab === "Menu" && <MenuBoard hotelId={id} />}
        {tab === "Ratings & reviews" && <Feedback hotelId={id} onChange={load} />}
      </div>
    </div>
  );
}
