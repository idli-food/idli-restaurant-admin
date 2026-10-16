"use client";

import { useState } from "react";
import { api, ApiError, type FieldErrors, type GeoPoint, type Hotel, type HotelSession } from "@/lib/api";
import { useAdmin } from "../admin-context";

type Props = {
  hotel?: Hotel;
  onSaved: (hotel: Hotel) => void;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Backend returns "HH:MM:SS"; time inputs work in "HH:MM"
const toFormSessions = (sessions: HotelSession[]) =>
  sessions.map((s) => ({ ...s, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }));

function initialForm(hotel?: Hotel) {
  return {
    name: hotel?.name ?? "",
    address: hotel?.address ?? "",
    city: hotel?.city ?? "Trivandrum",
    phone_number: hotel?.phone_number ?? "",
    email: hotel?.email ?? "",
    description: hotel?.description ?? "",
    location_link: hotel?.location_link ?? "",
    place_id: hotel?.place_id ?? "",
    avatar: hotel?.avatar ?? "",
    is_active: hotel?.is_active ?? true,
    tags: hotel?.tags ?? [],
    price_min: hotel?.price_min ?? "",
    price_max: hotel?.price_max ?? "",
    sessions: toFormSessions(hotel?.sessions ?? []),
    atmosphere: hotel?.atmosphere ?? "",
    best_for: hotel?.best_for ?? "",
    // Lists are edited as comma-separated text
    cuisines: (hotel?.cuisines ?? []).join(", "),
    services: (hotel?.services ?? []).join(", "),
    facilities: (hotel?.facilities ?? []).join(", "),
    dishes: (hotel?.dishes ?? []).join(", "),
    lat: hotel?.location ? String(hotel.location.coordinates[1]) : "",
    lon: hotel?.location ? String(hotel.location.coordinates[0]) : "",
    password: "",
  };
}

// A titled group of fields: title and help on the left, fields on the right
function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line py-7 md:grid-cols-[13rem_1fr] md:gap-8">
      <div>
        <h3 className="condensed text-lg font-bold">{title}</h3>
        {help && <p className="mt-1 text-sm text-muted">{help}</p>}
      </div>
      <div className="grid max-w-2xl content-start items-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function HotelForm({ hotel, onSaved }: Props) {
  const { tags, notify } = useAdmin();
  const [saved, setSaved] = useState(() => initialForm(hotel));
  const [form, setForm] = useState(saved);
  const [avatarPreview, setAvatarPreview] = useState(hotel?.avatar ?? "");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (key: keyof typeof form, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const { upload_url, key } = await api<{ upload_url: string; key: string }>(
        "/hotel/admin/avatar-upload-url",
        { method: "POST", body: { file_name: file.name, content_type: file.type } },
      );
      const res = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error(`S3 rejected the upload (${res.status})`);
      set("avatar", key);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (err) {
      notify(`Photo upload failed: ${(err as Error).message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  async function fetchFromLink() {
    setFetching(true);
    try {
      const place = await api<{
        place_id: string;
        name: string;
        address: string;
        city: string;
        phone_number: string | null;
        location: GeoPoint;
        location_link: string;
        sessions: HotelSession[];
        description: string | null;
      }>("/hotel/admin/hotels/from-link", { method: "POST", body: { link: form.location_link } });
      setForm((f) => ({
        ...f,
        place_id: place.place_id,
        name: place.name,
        address: place.address,
        city: place.city,
        phone_number: place.phone_number ?? "",
        lat: String(place.location.coordinates[1]),
        lon: String(place.location.coordinates[0]),
        location_link: place.location_link,
        sessions: toFormSessions(place.sessions ?? []),
        description: place.description ?? "",
      }));
      notify("Filled in from Google Maps");
    } catch (err) {
      notify(`Couldn't fetch from link: ${(err as Error).message}`, "error");
    } finally {
      setFetching(false);
    }
  }

  function discard() {
    setForm(saved);
    setAvatarPreview(hotel?.avatar ?? "");
    setErrors({});
    setFormError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");

    const list = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const hasLocation = form.lat.trim() !== "" && form.lon.trim() !== "";
    const body: Record<string, unknown> = {
      name: form.name,
      address: form.address,
      city: form.city,
      phone_number: form.phone_number || null,
      email: form.email || null,
      description: form.description || null,
      location_link: form.location_link || null,
      place_id: form.place_id || null,
      avatar: form.avatar || null,
      tags: form.tags,
      price_min: form.price_min || null,
      price_max: form.price_max || null,
      sessions: form.sessions,
      atmosphere: form.atmosphere || null,
      best_for: form.best_for || null,
      cuisines: list(form.cuisines),
      services: list(form.services),
      facilities: list(form.facilities),
      dishes: list(form.dishes),
      location: hasLocation ? { type: "Point", coordinates: [Number(form.lon), Number(form.lat)] } : null,
    };
    // Visibility on an existing hotel is switched from the page header
    if (!hotel) body.is_active = form.is_active;
    if (form.password) body.password = form.password;

    try {
      const result = hotel
        ? await api<Hotel>(`/hotel/admin/hotels/${hotel.id}`, { method: "PATCH", body })
        : await api<Hotel>("/hotel/admin/hotels", { method: "POST", body });
      const next = { ...initialForm(result) };
      setSaved(next);
      setForm(next);
      notify(hotel ? "Changes saved" : "Hotel added");
      onSaved(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? "Fix the fields marked in red, then save again." : err.message);
      } else {
        setFormError("Couldn't reach the backend. Check that it's running.");
      }
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (key: string) =>
    errors[key] ? <p className="mt-1 text-sm text-chilli">{errors[key].join(" ")}</p> : null;

  const text = (
    key: keyof typeof form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { wide?: boolean } = {},
  ) => {
    const { wide, ...inputProps } = props;
    return (
      <div className={wide ? "sm:col-span-2" : ""}>
        <label htmlFor={`f-${key}`} className="block text-sm font-semibold">
          {label}
        </label>
        <input
          id={`f-${key}`}
          className="field mt-1"
          value={form[key] as string}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={!!errors[key]}
          {...inputProps}
        />
        {fieldError(key)}
      </div>
    );
  };

  return (
    <form onSubmit={save}>
      <Group title="Basics" help="What diners see on the hotel's page.">
        {text("name", "Name", { required: true, wide: true })}
        <div className="sm:col-span-2">
          <label htmlFor="f-description" className="block text-sm font-semibold">
            Description
          </label>
          <textarea
            id="f-description"
            rows={3}
            className="field mt-1"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        {text("phone_number", "Phone", { placeholder: "+91…", type: "tel" })}
        {text("email", "Email", { type: "email" })}
      </Group>

      <Group title="Location" help="Coordinates decide which nearby lists the hotel shows up in.">
        <div className="sm:col-span-2">
          <label htmlFor="f-address" className="block text-sm font-semibold">
            Address
          </label>
          <textarea
            id="f-address"
            rows={2}
            className="field mt-1"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            aria-invalid={!!errors.address}
            required
          />
          {fieldError("address")}
        </div>
        {text("city", "City", { required: true })}
        <div className="sm:col-span-2">
          <label htmlFor="f-location_link" className="block text-sm font-semibold">
            Google Maps link
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="f-location_link"
              type="url"
              className="field"
              value={form.location_link}
              onChange={(e) => set("location_link", e.target.value)}
              aria-invalid={!!errors.location_link}
              placeholder="https://maps.app.goo.gl/…"
            />
            <button
              type="button"
              className="btn btn-quiet shrink-0"
              disabled={fetching || !form.location_link.trim()}
              onClick={fetchFromLink}
            >
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          {fieldError("location_link")}
        </div>
        {text("place_id", "Google place ID")}
        {text("lat", "Latitude", { inputMode: "decimal", placeholder: "8.5241" })}
        {text("lon", "Longitude", { inputMode: "decimal", placeholder: "76.9366" })}
        {errors.location && <div className="sm:col-span-2">{fieldError("location")}</div>}
      </Group>

      <Group title="Details" help="Separate list items with commas.">
        {text("price_min", "Min price (₹)", { type: "number", min: 0, step: "0.01" })}
        {text("price_max", "Max price (₹)", { type: "number", min: 0, step: "0.01" })}
        <div className="sm:col-span-2">
          <span className="block text-sm font-semibold">Working hours</span>
          {form.sessions.map((session, i) => {
            const update = (patch: Partial<HotelSession>) =>
              set("sessions", form.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s)));
            return (
              <div key={i} className="mt-1 flex items-center gap-2">
                <select
                  aria-label="Day"
                  className="field"
                  value={session.day}
                  onChange={(e) => update({ day: Number(e.target.value) })}
                >
                  {DAYS.map((day, d) => (
                    <option key={day} value={d}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  aria-label="Opens"
                  className="field"
                  required
                  value={session.start_time}
                  onChange={(e) => update({ start_time: e.target.value })}
                />
                <input
                  type="time"
                  aria-label="Closes"
                  className="field"
                  required
                  value={session.end_time}
                  onChange={(e) => update({ end_time: e.target.value })}
                />
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-muted hover:text-chilli"
                  onClick={() => set("sessions", form.sessions.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-quiet mt-2"
            onClick={() =>
              set("sessions", [
                ...form.sessions,
                { day: form.sessions.at(-1)?.day ?? 0, start_time: "", end_time: "" },
              ])
            }
          >
            Add session
          </button>
          {errors.sessions && (
            <p className="mt-1 text-sm text-chilli">Each session needs a day, an opening and a closing time.</p>
          )}
        </div>
        {text("atmosphere", "Atmosphere", { placeholder: "Casual, family-friendly" })}
        {text("best_for", "Best for", { placeholder: "Breakfast" })}
        {text("cuisines", "Cuisines", { placeholder: "South Indian, Chinese", wide: true })}
        {text("services", "Services", { placeholder: "Dine-in, Delivery", wide: true })}
        {text("facilities", "Facilities", { placeholder: "Parking, AC", wide: true })}
        {text("dishes", "Dishes", { placeholder: "Idli, Dosa", wide: true })}
      </Group>

      <Group title="Photo" help="Shown as the hotel's profile picture.">
        <div className="flex items-center gap-4 sm:col-span-2">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" className="size-16 rounded-full border border-line object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-rice text-xs text-muted">No photo</div>
          )}
          <label className="btn btn-quiet cursor-pointer focus-within:outline-2 focus-within:outline-turmeric">
            {uploading ? "Uploading…" : avatarPreview ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
          {form.avatar && (
            <button
              type="button"
              className="text-sm font-semibold text-muted hover:text-chilli"
              onClick={() => {
                set("avatar", "");
                setAvatarPreview("");
              }}
            >
              Remove
            </button>
          )}
        </div>
        {errors.avatar && <div className="sm:col-span-2">{fieldError("avatar")}</div>}
      </Group>

      <Group title="Tags" help="Tap a tag to add or remove it. Create new tags on the Tags page.">
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {tags.length === 0 && <p className="text-sm text-muted">No tags exist yet.</p>}
          {tags.map((tag) => {
            const on = form.tags.includes(tag.id);
            return (
              <button
                type="button"
                key={tag.id}
                aria-pressed={on}
                onClick={() => set("tags", on ? form.tags.filter((t) => t !== tag.id) : [...form.tags, tag.id])}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? "border-leaf bg-leaf text-white" : "border-line bg-plate text-ink hover:border-muted"}`}
              >
                {on && <span aria-hidden>✓ </span>}
                {tag.name}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Hotel app sign-in" help="The owner signs in to the hotel app with the phone number and this password.">
        {text("password", hotel ? "New password" : "Password", {
          type: "password",
          autoComplete: "new-password",
          minLength: 6,
          placeholder: hotel ? "Leave blank to keep the current one" : "Optional, at least 6 characters",
        })}
        {!hotel && (
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-[var(--leaf)]"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            Show in the app right away
          </label>
        )}
      </Group>

      {hotel ? (
        (dirty || busy || formError) && (
          <div className="rise sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t-2 border-turmeric bg-turmeric-soft px-4 py-3 md:-mx-10 md:px-10">
            <p className={`mr-auto font-semibold ${formError ? "text-chilli" : ""}`}>
              {formError || "You have unsaved changes"}
            </p>
            <button type="button" onClick={discard} disabled={busy} className="btn btn-quiet">
              Discard
            </button>
            <button disabled={busy || uploading || !dirty} className="btn btn-primary">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-4 pt-6">
          <button disabled={busy || uploading} className="btn btn-primary">
            {busy ? "Adding…" : "Add hotel"}
          </button>
          {formError && <p className="text-sm text-chilli">{formError}</p>}
        </div>
      )}
    </form>
  );
}
