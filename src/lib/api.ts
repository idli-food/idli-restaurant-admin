// Thin client for the Django admin endpoints, proxied through /api (see next.config.ts).

const TOKEN_KEY = "idli-admin-token";
const REFRESH_KEY = "idli-admin-refresh";

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  fields: FieldErrors;

  constructor(message: string, status: number, fields: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch {}
}

export function setRefreshToken(token: string) {
  try {
    localStorage.setItem(REFRESH_KEY, token);
  } catch {}
}

// Swaps the stored refresh token for a new access token; false if the session is over
async function refreshAccessToken() {
  let refresh: string | null = null;
  try {
    refresh = localStorage.getItem(REFRESH_KEY);
  } catch {}
  if (!refresh) return false;

  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  }).catch(() => null);
  const json = await res?.json().catch(() => null);
  if (!res?.ok || !json?.access) return false;

  setToken(json.access);
  return true;
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const send = () => {
    const token = getToken();
    return fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await send();

  if (res.status === 401 && path !== "/hotel/admin/login") {
    if (await refreshAccessToken()) {
      res = await send();
    }
    if (res.status === 401) {
      setToken(null);
      window.location.href = "/login";
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const errors = json?.errors;
    const fields = errors && typeof errors === "object" && !Array.isArray(errors) ? errors : {};
    const message =
      res.status === 403
        ? "This account isn't a staff account. Sign in with a staff user."
        : (json?.message ?? json?.detail ?? `Request failed (${res.status})`);
    throw new ApiError(message, res.status, fields);
  }

  return json.data as T;
}

export type GeoPoint = { type: "Point"; coordinates: [number, number] };

// day: 0 = Monday … 6 = Sunday; times are "HH:MM" (end before start = past midnight)
export type HotelSession = { day: number; start_time: string; end_time: string };

export type Hotel = {
  id: number;
  name: string;
  address: string;
  city: string;
  phone_number: string | null;
  email: string | null;
  description: string | null;
  location: GeoPoint | null;
  location_link: string | null;
  place_id: string | null;
  avatar: string | null;
  is_active: boolean;
  phone_verified: boolean;
  tags: number[];
  price_min: string | null;
  price_max: string | null;
  sessions: HotelSession[];
  atmosphere: string | null;
  best_for: string | null;
  cuisines: string[];
  services: string[];
  facilities: string[];
  dishes: string[];
  created_at: string;
  updated_at: string;
  average_rating?: number | null;
  rating_count?: number;
};

export type HotelPage = {
  results: Hotel[];
  count: number;
  page: number;
  num_pages: number;
};

export type Tag = { id: number; name: string };

export type FoodType = "veg" | "non_veg" | "egg";

export type Variant = {
  id: number;
  portion_name: string;
  price: string;
  is_available: boolean;
};

export type FoodItem = {
  id: number;
  name: string;
  description: string;
  image: string | null;
  food_type: FoodType;
  is_active: boolean;
  display_order: number;
  variants: Variant[];
};

export type Category = {
  id: number;
  name: string;
  display_order: number;
  items: FoodItem[];
};

export type MenuSummary = {
  id: number;
  name: string;
  is_active: boolean;
  category_count: number;
  item_count: number;
};

export type MenuDetail = {
  id: number;
  hotel: number;
  name: string;
  is_active: boolean;
  categories: Category[];
};

export type ReviewUser = { id: number; username: string; avatar: string | null };

export type Rating = { id: number; user: ReviewUser; rating_count: number; created_at: string };

export type Review = { id: number; user: ReviewUser; review_text: string; created_at: string };
