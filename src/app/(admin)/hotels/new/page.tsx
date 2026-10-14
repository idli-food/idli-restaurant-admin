"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../admin-context";
import HotelForm from "../hotel-form";

export default function NewHotelPage() {
  const router = useRouter();
  const { refreshHotels } = useAdmin();

  return (
    <div className="px-4 pb-16 md:px-10">
      <div className="pt-4 md:hidden">
        <Link href="/" className="text-sm font-semibold text-leaf">
          ‹ All hotels
        </Link>
      </div>
      <header className="pt-6 md:pt-8">
        <h1 className="signboard text-[clamp(2.25rem,5vw,3.5rem)]">Add a hotel</h1>
        <p className="mt-2 max-w-prose text-muted">
          Hotels added here skip the OTP step. After saving you can build its menu.
        </p>
      </header>
      <HotelForm
        onSaved={(hotel) => {
          refreshHotels();
          router.push(`/hotels/${hotel.id}`);
        }}
      />
    </div>
  );
}
