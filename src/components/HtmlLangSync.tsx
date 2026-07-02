"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> in sync with the user's stored language preference.
 * The root layout is a server component and can't read localStorage, so it
 * hardcodes lang="en"; this corrects it on the client for de/fr/it/pl users
 * (accessibility + translation tooling).
 */
export default function HtmlLangSync() {
  useEffect(() => {
    const lang = localStorage.getItem("chess_tutor_language");
    if (lang) document.documentElement.lang = lang;
  }, []);

  return null;
}
