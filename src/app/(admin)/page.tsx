import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-6">
      <div className="max-w-md">
        <h1 className="signboard text-5xl">Choose a hotel</h1>
        <p className="mt-3 text-muted">
          Pick one from the list to edit its details, menu or reviews. Press <kbd className="rounded border border-line bg-plate px-1.5 text-sm">/</kbd> to search.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/hotels/new" className="btn btn-primary">
            Add hotel
          </Link>
          <Link href="/tags" className="btn btn-quiet">
            Manage tags
          </Link>
        </div>
      </div>
    </div>
  );
}
