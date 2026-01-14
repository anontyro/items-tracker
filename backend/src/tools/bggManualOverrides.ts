export interface ManualOverride {
  /** Explicit BGG ID to link this product to. */
  bggId: string;
  /** Canonical BGG name we want to map this product to. */
  bggCanonicalName: string;
}

// Manual per-product overrides for tricky cases where heuristics and
// name-based aliases are not sufficient or the store name is too
// different from the BGG catalog.
export const BGG_MANUAL_OVERRIDES: Record<string, ManualOverride> = {
  // 7 Wonders: Duel → 7 Wonders Duel (base game)
  "ac05fa25-1dd0-42eb-8646-135a92f7b1fe": {
    bggId: "173346",
    bggCanonicalName: "7 Wonders Duel",
  },

  "275c1ee6-87c1-430e-8c38-b6163ff7b6d9": {
    bggId: "247367",
    bggCanonicalName: "Air, Land & Sea",
  },

  // Fungi
  "c52745a4-d9ca-4c3d-8a5b-98b48b3b02cc": {
    // Map store "Fungi" to the shared Morels/Fungi entry
    bggId: "122298",
    bggCanonicalName: "Morels",
  },

  // The Quacks of Quedlinburg: Mega Box
  "95eee7d3-b818-4db2-a064-b8897187d5da": {
    bggId: "349955",
    bggCanonicalName: "The Quacks of Quedlinburg: MegaBox",
  },

  // Unlock! 9: Legendary Adventures
  "85dd460f-aff9-4f32-93b3-c464040b6b87": {
    bggId: "330084",
    bggCanonicalName: "Unlock!: Legendary Adventures",
  },

  // Marvel Dice Throne: 4-Hero Box (Scarlet Witch, Thor, Loki, Spider-Man)
  "9b97b443-e399-4080-b5e0-54f02acef437": {
    bggId: "360153",
    bggCanonicalName:
      "Marvel Dice Throne: Scarlet Witch v. Thor v. Loki v. Spider-Man",
  },

  // EXiT: LOTR - Shadows over Middle-earth
  "fed83efc-f24b-41de-b16e-4fedf65e23b9": {
    bggId: "341573",
    bggCanonicalName:
      "EXIT: The Game – The Lord of the Rings: Shadows over Middle-earth",
  },

  // 7 Wonders Duel: Pantheon Expansion
  "eade638f-42ca-4074-b2e1-3e7215c49734": {
    bggId: "202976",
    bggCanonicalName: "7 Wonders Duel: Pantheon",
  },

  // King of Tokyo Second Edition → King of Tokyo (base game)
  "662ba69b-2b81-42bf-a64a-c02430f2cfb2": {
    bggId: "70323",
    bggCanonicalName: "King of Tokyo",
  },

  // Carcassonne Big Box (let the matcher choose the best Big Box variant)
  "d19f0a2f-b77f-4a50-8530-31ae82f4960e": {
    bggId: "142057",
    bggCanonicalName: "Carcassonne Big Box",
  },

  // 7 Wonders: 2nd Edition → 7 Wonders (Second Edition)
  "da6767e3-f986-4400-9ff0-172f72af823f": {
    bggId: "316377",
    bggCanonicalName: "7 Wonders (Second Edition)",
  },

  // OK Play
  "b0c6c416-ba29-438a-af25-3851b07e667f": {
    bggId: "208808",
    bggCanonicalName: "Cinco Linko",
  },

  // What Next - The Action Adventure Board Game
  "1a87f155-5205-42e1-8e7d-ae4d70a41112": {
    bggId: "342443",
    bggCanonicalName: "What Next?",
  },

  // Muffin Time - 2021 Edition (Inc. Both Expansions)
  "ba52af46-d568-43c0-b7fe-f3e338ed5c0e": {
    bggId: "286735",
    bggCanonicalName: "Muffin Time",
  },

  // Akropolis
  "156e8d9b-1155-4907-bf1e-19c191e6bdc1": {
    bggId: "357563",
    bggCanonicalName: "Akropolis",
  },

  // Spirit Island (Core Game)
  "32f81280-267f-4b6e-9c3e-3ed101c0e434": {
    bggId: "162886",
    bggCanonicalName: "Spirit Island",
  },

  // Spirit Island: Feather & Flame
  "bc341f9c-6010-4549-a426-1dd3cfd575c3": {
    bggId: "356510",
    bggCanonicalName: "Spirit Island: Feather & Flame",
  },

  // Cockroach Poker English Edition → Cockroach Poker (base game)
  "9487d517-43b2-40e0-9d27-98be7b602861": {
    bggId: "11971",
    bggCanonicalName: "Cockroach Poker",
  },

  // Arkham Horror the Card Game - The Scarlet Keys Investigator Expansion
  "95328c73-4d69-475d-8ef9-9ea2e62fc14b": {
    bggId: "366213",
    bggCanonicalName:
      "Arkham Horror: The Card Game – The Scarlet Keys: Investigator Expansion",
  },

  // Scout → SCOUT (2019)
  "fcf2d8f8-8070-4469-8d8b-aa1d4e6bc709": {
    bggId: "291453",
    bggCanonicalName: "SCOUT",
  },

  // Sushi Go → Sushi Go! (base game)
  "0a078c6e-f2b0-4cc8-9c7a-edb6e6749a52": {
    bggId: "133473",
    bggCanonicalName: "Sushi Go!",
  },

  // Outfoxed!
  "ec5afef4-6b96-48e5-9014-c959bef7dd22": {
    bggId: "172931",
    bggCanonicalName: "Outfoxed!",
  },

  // Coup (modern 2012 edition)
  "cda1af75-5ae1-46a1-a077-d0ed136d7363": {
    bggId: "131357",
    bggCanonicalName: "Coup",
  },

  // Arkham Horror the Card Game - The Scarlet Keys Campaign Expansion
  "ee7f950f-3ad6-44cd-95fc-b5e2c3050df3": {
    bggId: "366215",
    bggCanonicalName:
      "Arkham Horror: The Card Game – The Scarlet Keys: Campaign Expansion",
  },

  // Dobble → Spot it! (base game)
  "3367fd3f-3ce6-41a6-97b7-ca79499c88ee": {
    bggId: "63268",
    bggCanonicalName: "Spot it!",
  },

  // Dominion 2nd Edition → Dominion (2008)
  "5a46a65d-1ddb-40a3-ae18-4e793fb9c707": {
    bggId: "36218",
    bggCanonicalName: "Dominion",
  },

  // Immortality - Dune: Imperium Expansion
  "d9437004-07b7-4326-ae4e-178379b29892": {
    bggId: "367466",
    bggCanonicalName: "Dune: Imperium – Immortality",
  },

  // Obsession Board Game: 2nd Edition
  "d5409664-4b7d-4f61-aa3d-dea46dc901ce": {
    bggId: "231733",
    bggCanonicalName: "Obsession",
  },

  // Citadels Revised Edition → modern Citadels (2016)
  "c369d772-deee-44f3-aad0-f99cee892b6d": {
    bggId: "205398",
    bggCanonicalName: "Citadels",
  },

  // Eclipse: 2nd Dawn for the Galaxy
  "9ee75073-eb7c-4554-a44b-d67fa0e9389f": {
    bggId: "246900",
    bggCanonicalName: "Eclipse: Second Dawn for the Galaxy",
  },

  // Port Royal (card game, 2014)
  "265fc08d-988a-464e-9ca1-bedc0c4ff267": {
    bggId: "156009",
    bggCanonicalName: "Port Royal",
  },

  // Pandemic (2013 printing) → base Pandemic
  "fe0b68f1-a668-4e69-9481-c94aabe967eb": {
    bggId: "30549",
    bggCanonicalName: "Pandemic",
  },

  // Bang! 4th Edition Card Game → BANG! (base game)
  "3e058055-8e2f-4ea8-ac19-02558e36bf53": {
    bggId: "3955",
    bggCanonicalName: "BANG!",
  },

  // Ghost Blitz (Geistes Blitz)
  "8c2711b5-be23-428b-8498-8727889437be": {
    bggId: "12280",
    bggCanonicalName: "Geistesblitz",
  },

  // Horrified: Universal Monsters → base Horrified
  "c0ae662c-7181-43ba-8a92-810b411f270f": {
    bggId: "282524",
    bggCanonicalName: "Horrified",
  },

  // Pandemic Legacy Season Zero
  "c7323fb3-3712-42d1-8318-72b57e551173": {
    bggId: "314040",
    bggCanonicalName: "Pandemic Legacy: Season 0",
  },

  // Fluxx 5.0 → Fluxx (base game)
  "fa93eaef-0d2d-4d61-bd2c-eadc504148d9": {
    bggId: "258",
    bggCanonicalName: "Fluxx",
  },

  // Cosmic Encounter → modern FFG edition (2008)
  "36de51ae-d41b-4906-b03b-d7b419ca6c7f": {
    bggId: "39463",
    bggCanonicalName: "Cosmic Encounter",
  },

  // Obsession Board Game: Upstairs, Downstairs Expansion
  "21f41e61-5923-4625-8371-b9e4eba6599a": {
    bggId: "279067",
    bggCanonicalName: "Obsession: Upstairs, Downstairs",
  },

  // Gloomhaven: Jaws of the Lion - Removable Sticker Set & Map
  // Map this to the Jaws of the Lion entry for now
  "85c58233-4f58-4ec7-b93f-ca0db2219b54": {
    bggId: "291457",
    bggCanonicalName: "Gloomhaven: Jaws of the Lion",
  },

  // Junk Art 3.0 → Junk Art
  "5ce9c6f8-ed57-4fc4-ac1b-8ad6561991e3": {
    bggId: "193042",
    bggCanonicalName: "Junk Art",
  },

  // Dune: Choam and Richese House Expansion → modern Dune: A Game of Conquest and Diplomacy
  "f9b139e7-87e8-4095-a2b9-53d10d7e5c68": {
    bggId: "341165",
    bggCanonicalName: "Dune: A Game of Conquest and Diplomacy",
  },

  // Summoner Wars: Second Edition Master Set
  "a054fce5-ad1c-4a3e-85fb-e7848bf3a914": {
    bggId: "332800",
    bggCanonicalName: "Summoner Wars (Second Edition)",
  },

  // Unlock Kids → first Kids box
  "3781ff1c-ad88-447b-81ae-97d3a4bc1e5e": {
    bggId: "327056",
    bggCanonicalName: "Unlock! Kids: Detective Stories",
  },

  // Obsession Board Game: 2nd Edition Wessex Expansion
  "07f832bc-e501-491b-84a5-62e5a5a4fce9": {
    bggId: "245392",
    bggCanonicalName: "Obsession: Wessex Expansion",
  },

  // Arkham Horror LCG: Edge of the Earth - Investigators Expansion
  "4ea9ed09-695c-44b7-879a-79ecbcb07abc": {
    bggId: "340036",
    bggCanonicalName:
      "Arkham Horror: The Card Game – Edge of the Earth: Investigator Expansion",
  },

  // MicroMacro: Crime City 3 - All In
  "73592709-803a-4db9-8575-0627e3cee472": {
    bggId: "364766",
    bggCanonicalName: "MicroMacro: Crime City – All In",
  },

  // Volfyirion Card Game → Volfyirion
  "d38c657e-e165-430b-8291-fc58fcfe8186": {
    bggId: "258074",
    bggCanonicalName: "Volfyirion",
  },

  // Ticket To Ride Europe 1912 Expansion → Ticket to Ride: Europe
  "10831206-4abc-43a2-8101-ca0776aded24": {
    bggId: "14996",
    bggCanonicalName: "Ticket to Ride: Europe",
  },

  // Decrypto → modern Decrypto (2018)
  "e337011a-1441-4ab5-afb7-cb0d2cc4afcd": {
    bggId: "225694",
    bggCanonicalName: "Decrypto",
  },

  // Arkham Horror LCG: Edge of the Earth - Campaign Expansion
  "2a96b4bf-90f4-43e5-a299-d3f905ad9b8d": {
    bggId: "340035",
    bggCanonicalName:
      "Arkham Horror: The Card Game – Edge of the Earth: Campaign Expansion",
  },

  // Herd Mentality Mini → Herd Mentality
  "2de477de-137f-4cb0-a1b5-0fec50da3309": {
    bggId: "311322",
    bggCanonicalName: "Herd Mentality",
  },

  // Paleo → modern Paleo (2020)
  "b73cfacd-ff9d-4c09-b9c1-8591e40f669f": {
    bggId: "300531",
    bggCanonicalName: "Paleo",
  },

  // Arkham Horror: The Card Game - Winifred Habbamock Investigator Starter Pack
  "44c9014b-b5e8-4032-96fd-8342e7c8fab5": {
    bggId: "305513",
    bggCanonicalName:
      "Arkham Horror: The Card Game – Winifred Habbamock: The Investigator Starter Deck",
  },

  // Dixit Odyssey (English Only)
  "ca56dcc4-bd29-4b5e-9377-154187ea2238": {
    bggId: "92828",
    bggCanonicalName: "Dixit: Odyssey",
  },
};
