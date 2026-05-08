// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verhaalmaker — de Bibliotheek",
  description: "Workshop creatief schrijven met een AI-coach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <div
          id="root"
          style={{ width: "100vw", height: "100dvh", minHeight: "100vh" }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
