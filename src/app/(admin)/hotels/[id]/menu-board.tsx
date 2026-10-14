"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  type Category,
  type FoodItem,
  type FoodType,
  type MenuDetail,
  type MenuSummary,
  type Variant,
} from "@/lib/api";
import DeleteButton from "@/components/delete-button";
import { useAdmin } from "../../admin-context";

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "egg", label: "Egg" },
];

// FSSAI-style mark: square outline with a dot (veg, egg) or triangle (non-veg)
function FoodMark({ type }: { type: FoodType }) {
  const color = type === "veg" ? "var(--veg)" : type === "egg" ? "var(--egg)" : "var(--nonveg)";
  const label = FOOD_TYPES.find((t) => t.value === type)?.label ?? type;
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" role="img" aria-label={label}>
      <title>{label}</title>
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="none" stroke={color} strokeWidth="1.6" />
      {type === "non_veg" ? <path d="M8 4 L12 11.5 H4 Z" fill={color} /> : <circle cx="8" cy="8" r="3.4" fill={color} />}
    </svg>
  );
}

function rupees(price: string) {
  const n = Number(price);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function errorText(err: unknown) {
  if (err instanceof ApiError && Object.keys(err.fields).length) {
    return Object.entries(err.fields)
      .map(([field, msgs]) => `${field.replace(/_/g, " ")}: ${msgs.join(" ")}`)
      .join(" ");
  }
  return (err as Error).message;
}

// Shared submit wrapper for the inline forms below
function useSubmit(onSubmit: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function NameForm({
  initial = "",
  initialOrder,
  label,
  placeholder,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial?: string;
  initialOrder?: number;
  label: string;
  placeholder?: string;
  submitLabel: string;
  onSave: (name: string, order?: number) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial);
  const [order, setOrder] = useState(String(initialOrder ?? 0));
  const { busy, error, submit } = useSubmit(async () => {
    await onSave(name.trim(), initialOrder === undefined ? undefined : Number(order));
    setName("");
  });
  return (
    <form onSubmit={submit} className="flex flex-1 flex-wrap items-center gap-2">
      <input
        className="field max-w-xs min-w-40 flex-1"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus={!!onCancel}
      />
      {initialOrder !== undefined && (
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Position
          <input
            type="number"
            min={0}
            className="field w-20"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </label>
      )}
      <button disabled={busy} className="btn btn-primary">
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="btn btn-quiet">
          Cancel
        </button>
      )}
      {error && <p className="w-full text-sm text-chilli">{error}</p>}
    </form>
  );
}

function ItemForm({
  item,
  submitLabel,
  onSave,
  onCancel,
}: {
  item?: FoodItem;
  submitLabel: string;
  onSave: (body: Partial<FoodItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    food_type: item?.food_type ?? ("veg" as FoodType),
    image: item?.image ?? "",
    display_order: String(item?.display_order ?? 0),
    is_active: item?.is_active ?? true,
  });
  const { busy, error, submit } = useSubmit(() =>
    onSave({ ...f, image: f.image || null, display_order: Number(f.display_order) }),
  );
  const id = item ? `item-${item.id}` : "item-new";

  return (
    <form
      onSubmit={submit}
      className="rise grid gap-4 rounded-lg border-2 border-turmeric bg-turmeric-soft/50 p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-name`} className="text-sm font-semibold">
          Dish name
        </label>
        <input
          id={`${id}-name`}
          className="field mt-1"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-desc`} className="text-sm font-semibold">
          Description
        </label>
        <input
          id={`${id}-desc`}
          className="field mt-1"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Type</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FOOD_TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-turmeric ${f.food_type === t.value ? "border-ink bg-plate font-semibold" : "border-line bg-plate/60"}`}
            >
              <input
                type="radio"
                name={`${id}-type`}
                className="sr-only"
                checked={f.food_type === t.value}
                onChange={() => setF({ ...f, food_type: t.value })}
              />
              <FoodMark type={t.value} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-order`} className="text-sm font-semibold">
          Position in section
        </label>
        <input
          id={`${id}-order`}
          type="number"
          min={0}
          className="field mt-1 max-w-28"
          value={f.display_order}
          onChange={(e) => setF({ ...f, display_order: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-image`} className="text-sm font-semibold">
          Image URL
        </label>
        <input
          id={`${id}-image`}
          type="url"
          className="field mt-1"
          value={f.image}
          onChange={(e) => setF({ ...f, image: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="size-4 accent-[var(--leaf)]"
          checked={f.is_active}
          onChange={(e) => setF({ ...f, is_active: e.target.checked })}
        />
        Show this dish on the menu
      </label>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-quiet">
          Cancel
        </button>
        <button disabled={busy} className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
      {error && <p className="text-sm text-chilli sm:col-span-2">{error}</p>}
    </form>
  );
}

function VariantForm({
  variant,
  submitLabel,
  onSave,
  onCancel,
  onRemove,
}: {
  variant?: Variant;
  submitLabel: string;
  onSave: (body: Partial<Variant>) => Promise<void>;
  onCancel: () => void;
  onRemove?: () => Promise<void>;
}) {
  const [f, setF] = useState({
    portion_name: variant?.portion_name ?? "Regular",
    price: variant?.price ?? "",
    is_available: variant?.is_available ?? true,
  });
  const { busy, error, submit } = useSubmit(() => onSave(f));
  return (
    <form onSubmit={submit} className="rise my-1 flex flex-wrap items-center gap-2 rounded-lg bg-turmeric-soft/60 p-2">
      <input
        className="field w-36"
        aria-label="Portion"
        placeholder="Portion, e.g. Half"
        value={f.portion_name}
        onChange={(e) => setF({ ...f, portion_name: e.target.value })}
        required
        autoFocus
      />
      <span className="flex items-center gap-1 font-semibold">
        ₹
        <input
          className="field price w-24"
          aria-label="Price in rupees"
          inputMode="decimal"
          placeholder="0"
          value={f.price}
          onChange={(e) => setF({ ...f, price: e.target.value })}
          required
        />
      </span>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--leaf)]"
          checked={f.is_available}
          onChange={(e) => setF({ ...f, is_available: e.target.checked })}
        />
        Available today
      </label>
      <button disabled={busy} className="btn btn-primary btn-sm">
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-quiet btn-sm">
        Cancel
      </button>
      {onRemove && <DeleteButton label="Remove price" className="ml-auto" onDelete={onRemove} />}
      {error && <p className="w-full text-sm text-chilli">{error}</p>}
    </form>
  );
}

const MENU_TEMPLATE = `{
  "name": "Menu-main",
  "categories": [
    {
      "name": "Breakfast",
      "display_order": 0,
      "items": [
        {
          "name": "Masala Dosa",
          "food_type": "veg",
          "variants": [{ "portion_name": "Regular", "price": "80" }]
        },
        {
          "name": "Idli Sambar",
          "food_type": "veg",
          "variants": [
            { "portion_name": "2 pcs", "price": "50" },
            { "portion_name": "4 pcs", "price": "90" }
          ]
        },
        {
          "name": "Poori Masala",
          "food_type": "veg",
          "variants": [{ "portion_name": "Regular", "price": "70" }]
        }
      ]
    },
    {
      "name": "Main Course",
      "display_order": 1,
      "items": [
        {
          "name": "Paneer Butter Masala",
          "food_type": "veg",
          "variants": [
            { "portion_name": "Half", "price": "140" },
            { "portion_name": "Full", "price": "240" }
          ]
        },
        {
          "name": "Chicken Biryani",
          "food_type": "non-veg",
          "variants": [
            { "portion_name": "Half", "price": "160" },
            { "portion_name": "Full", "price": "280" }
          ]
        }
      ]
    },
    {
      "name": "Beverages",
      "display_order": 2,
      "items": [
        {
          "name": "Filter Coffee",
          "food_type": "veg",
          "variants": [{ "portion_name": "Regular", "price": "30" }]
        },
        {
          "name": "Fresh Lime Soda",
          "food_type": "veg",
          "variants": [
            { "portion_name": "Sweet", "price": "40" },
            { "portion_name": "Salt", "price": "40" }
          ]
        }
      ]
    }
  ]
}`;

function ImportForm({ onSave, onCancel }: { onSave: (body: unknown) => Promise<void>; onCancel: () => void }) {
  const { notify } = useAdmin();
  const [text, setText] = useState("");
  const { busy, error, submit } = useSubmit(async () => {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error("That isn’t valid JSON.");
    }
    try {
      await onSave(body);
    } catch (err) {
      // Nested validation errors don't fit errorText's flat field format
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        throw new Error(`${err.message}: ${JSON.stringify(err.fields)}`);
      }
      throw err;
    }
  });
  return (
    <form onSubmit={submit} className="rise mt-4 w-full rounded-lg border-2 border-turmeric bg-turmeric-soft/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="menu-import" className="text-sm font-semibold">
          Menu JSON
        </label>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(MENU_TEMPLATE).then(
              () => notify("Template copied"),
              () => notify("Couldn’t copy template", "error"),
            )
          }
          className="btn btn-quiet btn-sm"
        >
          Copy template
        </button>
      </div>
      <textarea
        id="menu-import"
        className="field mt-1 min-h-64 font-mono text-sm"
        placeholder={MENU_TEMPLATE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        autoFocus
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-quiet">
          Cancel
        </button>
        <button disabled={busy} className="btn btn-primary">
          Import menu
        </button>
      </div>
      {error && <p className="mt-2 text-sm break-words text-chilli">{error}</p>}
    </form>
  );
}

export default function MenuBoard({ hotelId }: { hotelId: string }) {
  const { notify } = useAdmin();
  const [menus, setMenus] = useState<MenuSummary[] | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuData, setMenuData] = useState<MenuDetail | null>(null);
  const [error, setError] = useState("");
  // Which inline form is open, e.g. "menu", "cat-3", "item-5", "var-9", "add-item-3", "add-var-5"
  const [editing, setEditing] = useState<string | null>(null);
  // Ignore detail loaded for a menu that is no longer selected
  const menu = menuData?.id === menuId ? menuData : null;

  const applyMenus = useCallback((data: MenuSummary[]) => {
    setMenus(data);
    setMenuId((current) => (data.some((m) => m.id === current) ? current : (data[0]?.id ?? null)));
  }, []);

  const loadMenus = () => api<MenuSummary[]>(`/hotel/admin/hotels/${hotelId}/menus`).then(applyMenus);

  const loadMenu = async () => {
    if (menuId !== null) setMenuData(await api<MenuDetail>(`/hotel/admin/menus/${menuId}`));
  };

  useEffect(() => {
    api<MenuSummary[]>(`/hotel/admin/hotels/${hotelId}/menus`)
      .then(applyMenus)
      .catch((err) => setError(err.message));
  }, [hotelId, applyMenus]);

  useEffect(() => {
    if (menuId === null) return;
    api<MenuDetail>(`/hotel/admin/menus/${menuId}`)
      .then(setMenuData)
      .catch((err) => setError(err.message));
  }, [menuId]);

  // Run a change, close the open form, reload the board and confirm with a toast
  async function change(path: string, method: string, body: unknown, done: string) {
    await api(path, { method, body });
    setEditing(null);
    await Promise.all([loadMenu(), loadMenus()]);
    notify(done);
  }

  if (error) return <p className="py-6 text-chilli">{error}</p>;
  if (!menus) return <p className="py-6 text-muted">Loading menus…</p>;

  const categories = [...(menu?.categories ?? [])].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="max-w-3xl py-6">
      <div className="flex flex-wrap items-center gap-2">
        {menus.length > 0 && <span className="mr-1 text-sm font-semibold text-muted">Menus</span>}
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMenuId(m.id);
              setEditing(null);
            }}
            aria-pressed={m.id === menuId}
            className={`rounded-full border px-3.5 py-1 text-sm font-semibold ${m.id === menuId ? "border-leaf bg-leaf text-white" : "border-line bg-plate hover:border-muted"}`}
          >
            {m.name}
            <span className={`ml-1.5 font-normal ${m.id === menuId ? "text-white/80" : "text-muted"}`}>
              {m.item_count} dish{m.item_count === 1 ? "" : "es"}
            </span>
          </button>
        ))}
        {editing === "add-menu" ? (
          <NameForm
            label="Menu name"
            placeholder="Menu name, e.g. Breakfast"
            submitLabel="Create menu"
            onCancel={() => setEditing(null)}
            onSave={async (name) => {
              const created = await api<{ id: number }>(`/hotel/admin/hotels/${hotelId}/menus`, {
                method: "POST",
                body: { name },
              });
              setEditing(null);
              setMenuId(created.id);
              await loadMenus();
              notify(`Created ${name}`);
            }}
          />
        ) : (
          <button onClick={() => setEditing("add-menu")} className="btn btn-quiet btn-sm">
            + New menu
          </button>
        )}
        {editing !== "import-menu" && (
          <button onClick={() => setEditing("import-menu")} className="btn btn-quiet btn-sm">
            Import JSON
          </button>
        )}
        {editing === "import-menu" && (
          <ImportForm
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              const created = await api<{ id: number; name: string }>(`/hotel/admin/hotels/${hotelId}/menus/import`, {
                method: "POST",
                body,
              });
              setEditing(null);
              setMenuId(created.id);
              await loadMenus();
              notify(`Imported ${created.name}`);
            }}
          />
        )}
      </div>

      {menus.length === 0 && editing !== "add-menu" && editing !== "import-menu" && (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-plate p-8 text-center">
          <p className="font-semibold">This hotel has no menu yet</p>
          <p className="mt-1 text-sm text-muted">Create one, then add sections like “Breakfast” and the dishes in them.</p>
          <button onClick={() => setEditing("add-menu")} className="btn btn-primary mt-4">
            Create a menu
          </button>
        </div>
      )}

      {menu && (
        <article className="mt-5 rounded-xl border border-line bg-plate px-5 py-6 shadow-[0_1px_0_var(--line)] sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-4">
            {editing === "menu" ? (
              <NameForm
                initial={menu.name}
                label="Menu name"
                submitLabel="Rename"
                onCancel={() => setEditing(null)}
                onSave={(name) => change(`/hotel/admin/menus/${menu.id}`, "PATCH", { name }, "Menu renamed")}
              />
            ) : (
              <h2 className="signboard text-4xl">{menu.name}</h2>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${menu.is_active ? "bg-leaf-soft text-leaf" : "bg-chilli-soft text-chilli"}`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--leaf)]"
                  checked={menu.is_active}
                  onChange={(e) =>
                    change(
                      `/hotel/admin/menus/${menu.id}`,
                      "PATCH",
                      { is_active: e.target.checked },
                      e.target.checked ? "Menu is live" : "Menu is off",
                    )
                  }
                />
                {menu.is_active ? "Live" : "Off"}
              </label>
              {editing !== "menu" && (
                <button onClick={() => setEditing("menu")} className="btn btn-quiet btn-sm">
                  Rename
                </button>
              )}
              <DeleteButton
                label="Delete menu"
                onDelete={async () => {
                  await api(`/hotel/admin/menus/${menu.id}`, { method: "DELETE" });
                  await loadMenus();
                  notify("Menu deleted");
                }}
              />
            </div>
          </header>

          {categories.length === 0 && (
            <p className="mt-6 text-muted">No sections yet. Add one below, like “Breakfast” or “Beverages”.</p>
          )}

          {categories.map((cat: Category) => {
            const items = [...cat.items].sort((a, b) => a.display_order - b.display_order);
            return (
              <section key={cat.id} className="mt-9">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                  {editing === `cat-${cat.id}` ? (
                    <NameForm
                      initial={cat.name}
                      initialOrder={cat.display_order}
                      label="Section name"
                      submitLabel="Save"
                      onCancel={() => setEditing(null)}
                      onSave={(name, display_order) =>
                        change(`/hotel/admin/categories/${cat.id}`, "PATCH", { name, display_order }, "Section saved")
                      }
                    />
                  ) : (
                    <>
                      <h3 className="condensed text-2xl font-bold text-leaf">{cat.name}</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditing(`cat-${cat.id}`)} className="btn btn-quiet btn-sm">
                          Edit section
                        </button>
                        <DeleteButton
                          label="Delete"
                          onDelete={() =>
                            change(`/hotel/admin/categories/${cat.id}`, "DELETE", undefined, "Section deleted")
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <ul>
                  {items.map((item) => (
                    <li key={item.id} className="border-b border-dashed border-line py-3.5 last:border-b-0">
                      {editing === `item-${item.id}` ? (
                        <ItemForm
                          item={item}
                          submitLabel="Save dish"
                          onCancel={() => setEditing(null)}
                          onSave={(body) => change(`/hotel/admin/items/${item.id}`, "PATCH", body, "Dish saved")}
                        />
                      ) : (
                        <>
                          <div className="flex items-start gap-2.5">
                            <span className="pt-1">
                              <FoodMark type={item.food_type} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-[17px] font-semibold ${item.is_active ? "" : "text-muted line-through"}`}
                                >
                                  {item.name}
                                </span>
                                {!item.is_active && (
                                  <span className="rounded-full bg-rice px-2 text-xs font-semibold text-muted">
                                    Not shown
                                  </span>
                                )}
                              </p>
                              {item.description && <p className="text-sm text-muted">{item.description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button onClick={() => setEditing(`item-${item.id}`)} className="btn btn-quiet btn-sm">
                                Edit dish
                              </button>
                              <DeleteButton
                                label="Delete"
                                onDelete={() =>
                                  change(`/hotel/admin/items/${item.id}`, "DELETE", undefined, "Dish deleted")
                                }
                              />
                            </div>
                          </div>

                          <ul className="mt-1.5 pl-6.5">
                            {item.variants.length === 0 && editing !== `add-var-${item.id}` && (
                              <li className="text-sm text-chilli">No price yet. Diners won’t see what it costs.</li>
                            )}
                            {item.variants.map((v) =>
                              editing === `var-${v.id}` ? (
                                <li key={v.id}>
                                  <VariantForm
                                    variant={v}
                                    submitLabel="Save price"
                                    onCancel={() => setEditing(null)}
                                    onSave={(body) =>
                                      change(`/hotel/admin/variants/${v.id}`, "PATCH", body, "Price saved")
                                    }
                                    onRemove={() =>
                                      change(`/hotel/admin/variants/${v.id}`, "DELETE", undefined, "Price removed")
                                    }
                                  />
                                </li>
                              ) : (
                                <li key={v.id} className="flex items-baseline gap-2 py-0.5">
                                  <span className={v.is_available ? "" : "text-muted line-through"}>
                                    {v.portion_name}
                                  </span>
                                  {!v.is_available && <span className="text-xs text-muted">sold out</span>}
                                  <span className="leader" aria-hidden />
                                  <span className={`price font-semibold ${v.is_available ? "" : "text-muted"}`}>
                                    {rupees(v.price)}
                                  </span>
                                  <button
                                    onClick={() => setEditing(`var-${v.id}`)}
                                    className="w-10 text-right text-sm font-semibold text-leaf hover:underline"
                                    aria-label={`Edit ${v.portion_name} price`}
                                  >
                                    Edit
                                  </button>
                                </li>
                              ),
                            )}
                            <li className="pt-1">
                              {editing === `add-var-${item.id}` ? (
                                <VariantForm
                                  submitLabel="Add price"
                                  onCancel={() => setEditing(null)}
                                  onSave={(body) =>
                                    change(`/hotel/admin/items/${item.id}/variants`, "POST", body, "Price added")
                                  }
                                />
                              ) : (
                                <button
                                  onClick={() => setEditing(`add-var-${item.id}`)}
                                  className="text-sm font-semibold text-leaf hover:underline"
                                >
                                  + {item.variants.length ? "Add another portion" : "Add a price"}
                                </button>
                              )}
                            </li>
                          </ul>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-3">
                  {editing === `add-item-${cat.id}` ? (
                    <ItemForm
                      submitLabel="Add dish"
                      onCancel={() => setEditing(null)}
                      onSave={(body) =>
                        change(`/hotel/admin/categories/${cat.id}/items`, "POST", body, "Dish added")
                      }
                    />
                  ) : (
                    <button onClick={() => setEditing(`add-item-${cat.id}`)} className="btn btn-quiet btn-sm">
                      + Add dish to {cat.name}
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          <div className="mt-10 rounded-lg bg-rice p-4">
            <p className="mb-2 text-sm font-semibold">Add a section</p>
            <NameForm
              label="Section name"
              placeholder="e.g. Dosa, Beverages"
              submitLabel="Add section"
              onSave={(name) =>
                change(
                  `/hotel/admin/menus/${menu.id}/categories`,
                  "POST",
                  { name, display_order: categories.length },
                  `Added ${name}`,
                )
              }
            />
          </div>
        </article>
      )}
    </div>
  );
}
