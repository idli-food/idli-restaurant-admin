"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import DeleteButton from "@/components/delete-button";
import { useAdmin } from "../admin-context";

function messageFor(err: unknown) {
  return err instanceof ApiError && err.fields.name ? err.fields.name.join(" ") : (err as Error).message;
}

export default function TagsPage() {
  const { tags, refreshTags, notify } = useAdmin();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/hotel/admin/tags", { method: "POST", body: { name } });
      notify(`Created “${name.trim()}”`);
      setName("");
      refreshTags();
    } catch (err) {
      setError(messageFor(err));
    }
  }

  async function renameTag(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    try {
      await api(`/hotel/admin/tags/${editingId}`, { method: "PATCH", body: { name: editName } });
      notify("Tag renamed");
      setEditingId(null);
      refreshTags();
    } catch (err) {
      setEditError(messageFor(err));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-16 md:pt-12">
      <h1 className="signboard text-[clamp(2.25rem,5vw,3.5rem)]">Tags</h1>
      <p className="mt-2 max-w-prose text-muted">
        Tags group hotels in the app, like “tea spot” or “mandi spot”. Add them to one hotel from its Details tab, or
        to many at once with “Select hotels to tag” in the hotel list.
      </p>

      <form onSubmit={addTag} className="mt-8 rounded-xl border border-line bg-plate p-4">
        <label htmlFor="new-tag" className="text-sm font-semibold">
          New tag
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="new-tag"
            className="field"
            placeholder="e.g. biriyani spot"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            required
          />
          <button className="btn btn-primary">Create tag</button>
        </div>
        {error && <p className="mt-2 text-sm text-chilli">{error}</p>}
      </form>

      <h2 className="condensed mt-10 text-xl font-bold">
        All tags <span className="price font-normal text-muted">{tags.length}</span>
      </h2>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-plate">
        {tags.map((tag) => (
          <li key={tag.id} className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
            {editingId === tag.id ? (
              <form onSubmit={renameTag} className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  className="field min-w-40 flex-1"
                  aria-label="Tag name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
                <button className="btn btn-primary btn-sm">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="btn btn-quiet btn-sm">
                  Cancel
                </button>
                {editError && <p className="w-full text-sm text-chilli">{editError}</p>}
              </form>
            ) : (
              <>
                <span className="flex-1 font-semibold">{tag.name}</span>
                <button
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                    setEditError("");
                  }}
                  className="btn btn-quiet btn-sm"
                >
                  Rename
                </button>
                <DeleteButton
                  label="Delete"
                  onDelete={async () => {
                    await api(`/hotel/admin/tags/${tag.id}`, { method: "DELETE" });
                    notify(`Deleted “${tag.name}” from every hotel and post`);
                    refreshTags();
                  }}
                />
              </>
            )}
          </li>
        ))}
        {tags.length === 0 && <li className="px-4 py-6 text-muted">No tags yet. Create the first one above.</li>}
      </ul>
    </div>
  );
}
