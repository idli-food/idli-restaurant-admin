"use client";

import { createContext, useContext } from "react";
import type { Tag } from "@/lib/api";

// Lets pages refresh the hotel list, share the tag list and show toasts after edits
export const AdminContext = createContext<{
  refreshHotels: () => void;
  tags: Tag[];
  refreshTags: () => void;
  // Bumped after bulk tagging so an open hotel page reloads its tags
  bulkVersion: number;
  notify: (text: string, tone?: "ok" | "error") => void;
}>({ refreshHotels: () => {}, tags: [], refreshTags: () => {}, bulkVersion: 0, notify: () => {} });

export const useAdmin = () => useContext(AdminContext);
