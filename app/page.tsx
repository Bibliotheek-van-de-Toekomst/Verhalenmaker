// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import { VerhaalMaker } from "@/components/VerhaalMaker";

export default function HomePage() {
  return (
    <VerhaalMaker
      subnaam=""
      stepCount={6}
      tone="rustig, duidelijk, positief"
    />
  );
}
