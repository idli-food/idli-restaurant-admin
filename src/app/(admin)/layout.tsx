"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, getToken, setToken, type HotelPage, type Tag } from "@/lib/api";
import { AdminContext } from "./admin-context";

const noopSubscribe = () => () => {};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // false during server render and hydration, true once running in the browser
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const ready = hydrated && !!getToken();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<HotelPage | null>(null);
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const [toast, setToast] = useState<{ id: number; text: string; tone: "ok" | "error" } | null>(null);
  // Bulk tagging: selection survives searching and paging
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkVersion, setBulkVersion] = useState(0);

  useEffect(() => {
    if (hydrated && !getToken()) router.replace("/login");
  }, [hydrated, router]);

  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      api<HotelPage>(`/hotel/admin/hotels?${params}`)
        .then((data) => {
          setList(data);
          setListError("");
        })
        .catch((err) => setListError(err.message));
    }, 250);
    return () => clearTimeout(handle);
  }, [ready, query, page, reloadKey]);

  const refreshTags = useCallback(() => {
    api<Tag[]>("/hotel/admin/tags").then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) refreshTags();
  }, [ready, refreshTags]);

  // Press "/" anywhere outside a field to jump to the hotel search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(handle);
  }, [toast]);

  const refreshHotels = useCallback(() => setReloadKey((k) => k + 1), []);
  const notify = useCallback(
    (text: string, tone: "ok" | "error" = "ok") => setToast({ id: Date.now(), text, tone }),
    [],
  );

  async function signOut() {
    setToken(null);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected([]);
  }

  async function addTagToSelected() {
    setBulkBusy(true);
    try {
      const data = await api<{ tag: Tag; hotel_count: number }>(`/hotel/admin/tags/${bulkTagId}/hotels`, {
        method: "POST",
        body: { hotel_ids: selected },
      });
      notify(`Added “${data.tag.name}” to ${data.hotel_count} hotel${data.hotel_count === 1 ? "" : "s"}`);
      setSelected([]);
      setBulkVersion((v) => v + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBulkBusy(false);
    }
  }

  if (!ready) return null;

  const activeId = pathname.match(/^\/hotels\/(\d+)/)?.[1];
  const pageIds = list?.results.map((h) => h.id) ?? [];
  const wholePageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const inHotels = pathname === "/" || pathname.startsWith("/hotels");
  // On small screens the list is the home screen; a hotel page takes the full width
  const onHome = pathname === "/";

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 font-semibold ${active ? "bg-white/15 text-white" : "text-white/75 hover:text-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <AdminContext.Provider value={{ refreshHotels, tags, refreshTags, bulkVersion, notify }}>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-leaf px-4 text-white md:px-6">
        <Link href="/" className="signboard text-[28px] text-white">
          Idli admin
        </Link>
        <nav aria-label="Sections" className="flex gap-1">
          {navLink("/", "Hotels", inHotels)}
          {navLink("/tags", "Tags", pathname === "/tags")}
        </nav>
        <button onClick={signOut} className="ml-auto text-sm font-semibold text-white/75 hover:text-white">
          Sign out
        </button>
      </header>

      <div className="flex">
        {inHotels && (
          <aside
            aria-label="Hotels"
            className={`${onHome ? "flex" : "hidden"} h-[calc(100vh-3.5rem)] w-full flex-col border-r border-line bg-plate md:sticky md:top-14 md:flex md:w-[22rem] md:shrink-0`}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <h2 className="condensed text-2xl font-bold">
                Hotels
                {list && (
                  <span className="price ml-2 text-base font-normal text-muted">
                    {list.count.toLocaleString("en-IN")}
                  </span>
                )}
              </h2>
              <Link href="/hotels/new" className="btn btn-primary">
                Add hotel
              </Link>
            </div>

            <div className="px-4 pt-3">
              <label htmlFor="hotel-search" className="sr-only">
                Search hotels
              </label>
              <div className="relative">
                <input
                  id="hotel-search"
                  ref={searchRef}
                  type="search"
                  className="field pr-9"
                  placeholder="Search by name, area or phone"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {!query && (
                  <kbd
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted"
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex min-h-10 items-center justify-between px-4 pt-2 text-sm">
              {selecting ? (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--leaf)]"
                      checked={wholePageSelected}
                      onChange={() =>
                        setSelected((s) =>
                          wholePageSelected
                            ? s.filter((id) => !pageIds.includes(id))
                            : [...s, ...pageIds.filter((id) => !s.includes(id))],
                        )
                      }
                    />
                    Select all on this page
                  </label>
                  <button onClick={stopSelecting} className="font-semibold text-leaf hover:underline">
                    Done
                  </button>
                </>
              ) : (
                <button onClick={() => setSelecting(true)} className="font-semibold text-leaf hover:underline">
                  Select hotels to tag
                </button>
              )}
            </div>

            {listError && <p className="px-4 pt-2 text-sm text-chilli">{listError}</p>}

            <ul className="mt-1 flex-1 overflow-y-auto border-t border-line">
              {list?.results.map((hotel) => {
                const status = !hotel.is_active && (
                  <span className="shrink-0 rounded-full bg-chilli-soft px-2 text-xs font-semibold text-chilli">
                    Hidden
                  </span>
                );
                if (selecting) {
                  const checked = selected.includes(hotel.id);
                  return (
                    <li key={hotel.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${checked ? "bg-leaf-soft" : "hover:bg-rice"}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-[var(--leaf)]"
                          checked={checked}
                          onChange={() => toggle(hotel.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="condensed truncate text-[17px] font-semibold">{hotel.name}</span>
                            {status}
                          </span>
                          <span className="block truncate text-sm text-muted">{hotel.city}</span>
                        </span>
                      </label>
                    </li>
                  );
                }
                const active = String(hotel.id) === activeId;
                return (
                  <li key={hotel.id}>
                    <Link
                      href={`/hotels/${hotel.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`block border-l-4 py-2.5 pr-4 pl-3 ${active ? "border-turmeric bg-turmeric-soft" : "border-transparent hover:bg-rice"}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="condensed truncate text-[17px] font-semibold">{hotel.name}</span>
                        {status}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {hotel.city}
                        {hotel.phone_number ? `, ${hotel.phone_number}` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {list && list.results.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted">
                  No hotels match “{query}”. Try a shorter search, or add the hotel.
                </li>
              )}
            </ul>

            {list && list.num_pages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-quiet btn-sm"
                >
                  Previous
                </button>
                <span className="price text-muted">
                  Page {list.page} of {list.num_pages}
                </span>
                <button
                  disabled={page >= list.num_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-quiet btn-sm"
                >
                  Next
                </button>
              </div>
            )}

            {selecting && (
              <div className="rise border-t-2 border-leaf bg-leaf-soft px-4 py-3">
                <p className="text-sm font-semibold" aria-live="polite">
                  {selected.length === 0
                    ? "Tick the hotels you want to tag"
                    : `${selected.length} hotel${selected.length === 1 ? "" : "s"} selected`}
                  {selected.length > 0 && (
                    <button onClick={() => setSelected([])} className="ml-3 font-normal text-muted hover:text-ink">
                      Clear
                    </button>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <label htmlFor="bulk-tag" className="sr-only">
                    Tag to add
                  </label>
                  <select
                    id="bulk-tag"
                    className="field min-w-0 flex-1"
                    value={bulkTagId}
                    onChange={(e) => setBulkTagId(e.target.value)}
                  >
                    <option value="">Choose a tag</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addTagToSelected}
                    disabled={!bulkTagId || selected.length === 0 || bulkBusy}
                    className="btn btn-primary"
                  >
                    {bulkBusy ? "Adding…" : "Add tag"}
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        <main className={`${inHotels && onHome ? "hidden md:block" : "block"} min-w-0 flex-1`}>{children}</main>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.id}
            role="status"
            className={`rise pointer-events-auto rounded-lg px-4 py-2.5 font-semibold text-white shadow-lg ${toast.tone === "ok" ? "bg-ink" : "bg-chilli"}`}
          >
            {toast.text}
          </p>
        )}
      </div>
    </AdminContext.Provider>
  );
}
