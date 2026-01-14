import { BggGame } from "@prisma/client"; // only for type reference in comments if needed

// More aggressive normalization for matching against BGG names.
// Shared between the linker and the alias map.
export function normalizeForMatch(name: string | null | undefined): string {
  if (!name) return "";

  const lowered = name.toLowerCase();

  // First pass: strip common generic/marketing suffixes that don't help
  // distinguish games in the BGG catalog but vary a lot in store data.
  const cleaned = lowered
    .replace(/\bboard game(s)?\b/g, " ")
    .replace(/\bcard game(s)?\b/g, " ")
    .replace(/\bcore set\b/g, " ")
    .replace(/\bescape (game|room)\b/g, " ")
    .replace(/\benglish( language)? version\b/g, " ")
    .replace(/\bgerman\/english version\b/g, " ")
    .replace(/\b(deluxe|classic edition)\b/g, " ");

  // Second pass: existing aggressive normalization – strip punctuation,
  // ordinals, and "edition" markers, then collapse whitespace.
  return cleaned
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(1st|2nd|3rd|[0-9]+th)\b/g, " ")
    .replace(/\b(ed|edition)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple alias map from normalized product names to canonical BGG names.
// Key: result of normalizeForMatch(product.name)
// Value: canonical BGG name as it appears in the BggGame dataset.
export const BGG_ALIAS_MAP: Record<string, string> = {
  // Examples – extend this map as you discover more edge cases.
  [normalizeForMatch("Sushi Go")]: "Sushi Go!",
  [normalizeForMatch("7 Wonders: Duel")]: "7 Wonders Duel",
  [normalizeForMatch("Spirit Island (Core Game)")]: "Spirit Island",
  [normalizeForMatch("Root: Riverfolk Expansion")]:
    "Root: The Riverfolk Expansion",
  [normalizeForMatch("Muffin Time - 2021 Edition (Inc. Both Expansions)")]:
    "Muffin Time",
  [normalizeForMatch("Spirit Island: Feather & Flame")]:
    "Spirit Island: Feather & Flame",
  [normalizeForMatch("Cockroach Poker English Edition")]: "Cockroach Poker",
  [normalizeForMatch("Love Letter (Z-Man Games)")]: "Love Letter",
  [normalizeForMatch(
    "Arkham Horror the Card Game - The Scarlet Keys Investigator Expansion"
  )]: "Arkham Horror: The Card Game – The Scarlet Keys: Investigator Expansion",
  [normalizeForMatch("Wingspan European Expansion")]:
    "Wingspan: European Expansion",
  [normalizeForMatch("Fungi")]: "Fungi",
  [normalizeForMatch("The Quacks of Quedlinburg: Mega Box")]:
    "The Quacks of Quedlinburg: Mega Box",
  [normalizeForMatch("Heroquest Frozen Horror Expansion")]:
    "HeroQuest: The Frozen Horror",
  [normalizeForMatch("Ticket to Ride United Kingdom & Pennsylvania")]:
    "Ticket to Ride Map Collection: United Kingdom & Pennsylvania",
  [normalizeForMatch("Wingspan: Oceania Expansion")]:
    "Wingspan: Oceania Expansion",
  [normalizeForMatch("Unlock! 9: Legendary Adventures")]:
    "Unlock!: Legendary Adventures",
  [normalizeForMatch(
    "Arkham Horror the Card Game - The Scarlet Keys Campaign Expansion"
  )]: "Arkham Horror: The Card Game – The Scarlet Keys: Campaign Expansion",
  [normalizeForMatch(
    "Marvel Dice Throne: 4-Hero Box (Scarlet Witch, Thor, Loki, Spider-Man)"
  )]: "Marvel Dice Throne: 4-Hero Box (Scarlet Witch, Thor, Loki, Spider-Man)",
  [normalizeForMatch("Alice is Missing")]: "Alice Is Missing",
  [normalizeForMatch("EXiT: LOTR - Shadows over Middle-earth")]:
    "Exit: The Lord of the Rings – Shadows over Middle-earth",
  [normalizeForMatch("Viticulture - World Expansion")]:
    "Viticulture World: Cooperative Expansion",
  [normalizeForMatch("Root: The Vagabond Pack")]: "Root: The Vagabond Pack",
  [normalizeForMatch("7 Wonders Duel: Pantheon Expansion")]:
    "7 Wonders Duel: Pantheon",
  [normalizeForMatch("Unmatched - Battle of Legends Vol 2")]:
    "Unmatched: Battle of Legends, Volume Two",
  [normalizeForMatch("Dobble")]: "Dobble",
  [normalizeForMatch("King of Tokyo Second Edition")]: "King of Tokyo",
  [normalizeForMatch("Carcassonne Big Box")]: "Carcassonne Big Box",
  [normalizeForMatch("7 Wonders: 2nd Edition")]: "7 Wonders (Second Edition)",
  [normalizeForMatch(
    "Sherlock Holmes Consulting Detective: The Thames Murders"
  )]: "Sherlock Holmes Consulting Detective: The Thames Murders & Other Cases",
  [normalizeForMatch("Qwirkle Travel")]: "Qwirkle Travel",
  [normalizeForMatch("Ligretto Blue")]: "Ligretto: Blue",
  [normalizeForMatch("Immortality - Dune: Imperium Expansion")]:
    "Dune: Imperium – Immortality",
  [normalizeForMatch("Unmatched Battle Of Legends, Vol. 1")]:
    "Unmatched: Battle of Legends, Volume One",
  [normalizeForMatch("OK Play")]: "OK Play",
  [normalizeForMatch("Obsession Board Game: 2nd Edition")]:
    "Obsession (second edition)",
  [normalizeForMatch("What Next - The Action Adventure Board Game")]:
    "What Next?",
  // New aliases from latest unmatched set
  [normalizeForMatch("Air, Land & Sea: Revised Edition")]: "Air, Land & Sea",
  [normalizeForMatch("Marvel Dice Throne: Black Widow vs Doctor Strange")]:
    "Marvel Dice Throne: Black Widow v. Doctor Strange",
  [normalizeForMatch("Carcassonne: Inns & Cathedrals - Expansion 1")]:
    "Carcassonne: Inns & Cathedrals",
  [normalizeForMatch("Citadels Revised Edition")]: "Citadels",
  [normalizeForMatch("Eclipse: 2nd Dawn for the Galaxy")]:
    "Eclipse: Second Dawn for the Galaxy",
  [normalizeForMatch("Cartographers: A Roll Player Tale")]:
    "Cartographers: A Roll Player Tale",
  [normalizeForMatch("Pandemic (2013)")]: "Pandemic",
  [normalizeForMatch("Unmatched: Marvel Redemption Row")]:
    "Unmatched: Marvel – Redemption Row",
  [normalizeForMatch("Bang! 4th Edition Card Game")]: "BANG!",
  [normalizeForMatch("Root: The Exiles and Partisans Deck")]:
    "Root: The Exiles and Partisans Deck",
  [normalizeForMatch("Ghost Blitz (Geistes Blitz)")]: "Geistesblitz",
  [normalizeForMatch("Air Land & Sea: Spies Lies & Supplies")]:
    "Air, Land & Sea: Spies, Lies & Supplies",
  [normalizeForMatch("Marvel Champions: Nova Hero Pack")]:
    "Marvel Champions: The Card Game – Nova",
  [normalizeForMatch("Cash 'n' Guns (2nd Ed)")]:
    "Cash 'n Guns (Second Edition)",
  [normalizeForMatch("Don't Get Got - 2021 Edition")]: "Don't Get Got",
  [normalizeForMatch("Root: The Underworld Expansion")]:
    "Root: The Underworld Expansion",
  [normalizeForMatch("What Do You Meme? UK Edition")]: "What Do You Meme?",
  [normalizeForMatch("Marvel Dice Throne: Captain Marvel vs Black Panther")]:
    "Marvel Dice Throne: Captain Marvel v. Black Panther",
  [normalizeForMatch("Unmatched: Marvel Hell's Kitchen")]:
    "Unmatched: Marvel – Hell's Kitchen",
  [normalizeForMatch("Horrified: Universal Monsters")]: "Horrified",
  [normalizeForMatch("7 Wonders Duel: Agora Expansion")]:
    "7 Wonders Duel: Agora",
  [normalizeForMatch("Beat That! The Bonkers Battle of Wacky Challenges")]:
    "Beat That!",
  [normalizeForMatch("Happy Little Dinosaurs Base Game")]:
    "Happy Little Dinosaurs",
  [normalizeForMatch("Pandemic Legacy Season Zero")]:
    "Pandemic Legacy: Season 0",
  [normalizeForMatch("Dobble Beach")]: "Dobble: Beach",
  [normalizeForMatch(
    "Harry Potter Hogwarts Battle- A Cooperative Deck Building Game"
  )]: "Harry Potter: Hogwarts Battle",
  [normalizeForMatch("Fluxx 5.0")]: "Fluxx",
  [normalizeForMatch("Obsession Board Game: Upstairs, Downstairs Expansion")]:
    "Obsession: Upstairs, Downstairs",
  [normalizeForMatch(
    "Gloomhaven: Jaws of the Lion - Removable Sticker Set & Map"
  )]: "Gloomhaven: Jaws of the Lion – Removable Sticker Set & Map",
  [normalizeForMatch("Lost Ruins of Arnak: Expedition Leaders Expansion")]:
    "Lost Ruins of Arnak: Expedition Leaders",
  [normalizeForMatch("Viticulture: Tuscany Essential Edition")]:
    "Viticulture: Tuscany Essential Edition",
  [normalizeForMatch("Ticket to Ride: First Journey Europe")]:
    "Ticket to Ride: First Journey (Europe)",
  [normalizeForMatch("Disney Smash Up")]: "Smash Up: Disney Edition",
  [normalizeForMatch("Parks: Wildlife Expansion")]: "PARKS: Wildlife",
  [normalizeForMatch("Junk Art 3.0")]: "Junk Art",
  [normalizeForMatch(
    "Xia: Legends Of A Drift System: Embers Of A Forsaken Star Expansion"
  )]: "Xia: Embers of a Forsaken Star",
  [normalizeForMatch("War of the Ring 2nd Edition")]:
    "War of the Ring (Second Edition)",
  [normalizeForMatch("Terraforming Mars: Prelude")]:
    "Terraforming Mars: Prelude",
  [normalizeForMatch("Mediterranean Theater (Memoir '44)")]:
    "Memoir '44: Mediterranean Theater",
  [normalizeForMatch("Barenpark")]: "Bärenpark",
  [normalizeForMatch("Scythe: Invaders From Afar")]:
    "Scythe: Invaders from Afar",
  [normalizeForMatch("Operation Overlord (Memoir '44)")]:
    "Memoir '44: Operation Overlord",
  [normalizeForMatch("Red Cathedral")]: "The Red Cathedral",
  [normalizeForMatch("Sleeping Gods Dungeons")]: "Sleeping Gods: Dungeons",
  [normalizeForMatch("Dune: Choam and Richese House Expansion")]:
    "Dune: A Game of Conquest and Diplomacy – CHOAM & Richese",
  [normalizeForMatch("Port Royal Big Box")]: "Port Royal: Big Box",
  [normalizeForMatch("Munchkin Deluxe")]: "Munchkin Deluxe",
  [normalizeForMatch("Summoner Wars: Second Edition Master Set")]:
    "Summoner Wars (Second Edition): Master Set",
  [normalizeForMatch("Oath: Chronicles of Empire and Exile")]:
    "Oath: Chronicles of Empire and Exile",
  [normalizeForMatch(
    "The Lord of the Rings: The Card Game (Revised Core Set)"
  )]: "The Lord of the Rings: The Card Game – Revised Core Set",
  [normalizeForMatch("Unlock Kids")]: "Unlock Kids",
  [normalizeForMatch("Dobble Marvel Emoji")]: "Dobble: Marvel Emoji",
  [normalizeForMatch("Obsession Board Game: 2nd Edition Wessex Expansion")]:
    "Obsession: Wessex Expansion",
  [normalizeForMatch("Lost Cities - The Card Game")]:
    "Lost Cities: The Card Game",
  [normalizeForMatch("Memoir '44 - Winter Wars")]: "Memoir '44: Winter Wars",
  [normalizeForMatch(
    "Arkham Horror LCG: Edge of the Earth - Investigators Expansion"
  )]:
    "Arkham Horror: The Card Game – Edge of the Earth: Investigator Expansion",
  [normalizeForMatch("Dixit Odyssey (English Only)")]: "Dixit Odyssey",
  [normalizeForMatch("Memoir '44 Winter/Desert Board")]:
    "Memoir '44: Winter/Desert Board Map",
  [normalizeForMatch("Scrawl (17+)")]: "Scrawl",
  [normalizeForMatch("Colt Express: Big Box")]: "Colt Express: Big Box",
  [normalizeForMatch("Red 7 (English)")]: "Red7",
  [normalizeForMatch("Terraforming Mars: The Colonies")]:
    "Terraforming Mars: Colonies",
  [normalizeForMatch("Memoir '44 Terrain Pack")]: "Memoir '44: Terrain Pack",
  [normalizeForMatch("Red Flags: The Game of Terrible Dates")]:
    "Red Flags: The Game of Terrible Dates",
  [normalizeForMatch("MicroMacro: Crime City 3 - All In")]:
    "MicroMacro: Crime City – All In",
  [normalizeForMatch("Clank!")]: "Clank!: A Deck-Building Adventure",
  [normalizeForMatch("The Quacks of Quedlinburg: The Alchemists Expansion")]:
    "The Quacks of Quedlinburg: The Alchemists",
  [normalizeForMatch("221B baker Street")]:
    "221B Baker Street: The Master Detective Game",
  [normalizeForMatch("Think Words")]: "Think Words!",
  [normalizeForMatch("7 Wonders Architects")]: "7 Wonders Architects",
  [normalizeForMatch("Ticket To Ride Poland: Map Collection")]:
    "Ticket to Ride Map Collection: Volume 6 – Poland",
  [normalizeForMatch("Mage Knight Boardgame Ultimate Edition")]:
    "Mage Knight: Ultimate Edition",
  [normalizeForMatch("Volfyirion Card Game")]: "Volfyirion",
  [normalizeForMatch("Get on Board")]: "Get on Board: New York & London",
  [normalizeForMatch("Sub Terra: Incubation Expansion")]:
    "Sub Terra: Incubation",
  [normalizeForMatch("Ticket To Ride Europe 1912 Expansion")]:
    "Ticket to Ride: Europe 1912",
  [normalizeForMatch("Sniper Elite: Eagles's Nest Expansion")]:
    "Sniper Elite: Eagle's Nest",
  [normalizeForMatch("Memoir '44 Equipment Pack")]:
    "Memoir '44: Equipment Pack",
  [normalizeForMatch("EXIT - The Abandoned Cabin")]:
    "EXIT: The Game – The Abandoned Cabin",
  [normalizeForMatch("HeroQuest: Kellar's Keep Expansion")]:
    "HeroQuest: Kellar's Keep",
  [normalizeForMatch(
    "Great Western Trail: Rails to the North (Second Edition)"
  )]: "Great Western Trail: Rails to the North (Second Edition)",
  [normalizeForMatch(
    "Arkham Horror LCG: Edge of the Earth - Campaign Expansion"
  )]: "Arkham Horror: The Card Game – Edge of the Earth: Campaign Expansion",
  [normalizeForMatch("Herd Mentality Mini")]: "Herd Mentality",
  [normalizeForMatch("Hellas & Elysium: Terraforming Mars Exp")]:
    "Terraforming Mars: Hellas & Elysium",
  [normalizeForMatch("Marvel Champions: The Green Goblin Scenario Pack")]:
    "Marvel Champions: The Card Game – The Green Goblin",
  [normalizeForMatch("Marvel Champions: Vision Hero Pack")]:
    "Marvel Champions: The Card Game – Vision",
  [normalizeForMatch("King of Tokyo Monster Box")]:
    "King of Tokyo: Monster Box",
  [normalizeForMatch("The Quacks of Quedlinburg - The Herb Witches")]:
    "The Quacks of Quedlinburg: The Herb Witches",
  [normalizeForMatch("Final Girl Core Box")]: "Final Girl",
  [normalizeForMatch("Marvel Champions: Black Widow Hero Pack")]:
    "Marvel Champions: The Card Game – Black Widow",
  [normalizeForMatch("Perlae Imperii: Res Arcana Expansion")]:
    "Res Arcana: Perlae Imperii",
  [normalizeForMatch("EXIT - The Sunken Treasure")]:
    "EXIT: The Game – The Sunken Treasure",
  [normalizeForMatch("Paper Dungeons")]: "Paper Dungeons",
  [normalizeForMatch(
    "Arkham Horror: The Card Game - Winifred Habbamock Investigator Starter Pack"
  )]:
    "Arkham Horror: The Card Game – Winifred Habbamock: The Investigator Starter Deck",
  [normalizeForMatch("Marvel Champions: Venom Hero Pack")]:
    "Marvel Champions: The Card Game – Venom",
  [normalizeForMatch("Junior Colourbrain")]: "Colourbrain: Kids",
  [normalizeForMatch("Scythe: The Wind Gambit")]: "Scythe: The Wind Gambit",
  [normalizeForMatch("7 Wonders 2nd Edition: Cities Expansion")]:
    "7 Wonders (Second Edition): Cities",
  [normalizeForMatch("Meadow: Downstream Expansion")]: "Meadow: Downstream",
  [normalizeForMatch("Happy Little Dinosaurs: Dating Disasters Expansion")]:
    "Happy Little Dinosaurs: Dating Disasters",
  [normalizeForMatch(
    "Harry Potter Hogwarts Battle- The Monster Box of Monsters Expansion"
  )]: "Harry Potter: Hogwarts Battle – The Monster Box of Monsters Expansion",
  [normalizeForMatch("Azul: Crystal Mosaic")]: "Azul: Crystal Mosaic",
  [normalizeForMatch("Ticket To Ride USA 1910 Expansion")]:
    "Ticket to Ride: USA 1910",
  [normalizeForMatch("Twilight Imperium 4th Edition")]:
    "Twilight Imperium: Fourth Edition",
  [normalizeForMatch("Dominion Allies")]: "Dominion: Allies",
  [normalizeForMatch("Root: The Marauder Expansion")]:
    "Root: The Marauder Expansion",
  [normalizeForMatch("Scythe Modular Board")]: "Scythe: Modular Board",
  [normalizeForMatch("Scythe: Game Board Extension")]:
    "Scythe: Game Board Extension",
  [normalizeForMatch("Spirit Island: Deluxe Invader Board")]:
    "Spirit Island: Deluxe Invader Board",
  [normalizeForMatch("Spirit Island: Premium Token Pack")]:
    "Spirit Island: Premium Token Pack",
  [normalizeForMatch("Star Wars Rebellion: Rise of the Empire")]:
    "Star Wars: Rebellion – Rise of the Empire",
  [normalizeForMatch("Twilight Struggle: Deluxe edition")]: "Twilight Struggle",
  [normalizeForMatch("Dune: Imperium - Rise of Ix Expansion")]:
    "Dune: Imperium – Rise of Ix",
  // Ambiguous base games – prefer modern/popular editions
  [normalizeForMatch("Port Royal")]: "Port Royal",
  [normalizeForMatch("Cosmic Encounter")]: "Cosmic Encounter",
  [normalizeForMatch("Decrypto")]: "Decrypto",
  [normalizeForMatch("Paleo")]: "Paleo",
  // From latest unmatched set

  // Ganz Schon Clever → correct German spelling
  [normalizeForMatch("Ganz Schon Clever")]: "Ganz schön clever",

  // Marvel Champions hero packs
  [normalizeForMatch("Marvel Champions: Scarlet Witch Hero Pack")]:
    "Marvel Champions: The Card Game – Scarlet Witch",
  [normalizeForMatch("Marvel Champions: Valkyrie Hero Pack")]:
    "Marvel Champions: The Card Game – Valkyrie",

  // Dixit expansion
  [normalizeForMatch("Dixit: Anniversary Expansion")]: "Dixit: Anniversary",

  // EXIT / EXiT titles
  [normalizeForMatch("EXiT: The Return to the Abandoned Cabin")]:
    "EXIT: The Game – The Return to the Abandoned Cabin",
  [normalizeForMatch("EXiT - The Mysterious Museum")]:
    "EXIT: The Game – The Mysterious Museum",
  [normalizeForMatch("EXiT - Dead Man on the Orient Express")]:
    "EXIT: The Game – Dead Man on the Orient Express",
  [normalizeForMatch("EXIT Puzzle: Nightfall Manor")]:
    "EXIT Puzzle: Nightfall Manor",
  [normalizeForMatch("EXIT: The Game - The Pharaoh's Tomb")]:
    "EXIT: The Game – The Pharaoh's Tomb",
  [normalizeForMatch("EXIT: The Enchanted Forest")]:
    "EXIT: The Game – The Enchanted Forest",
  [normalizeForMatch("Exit: Kidnapped in Fortune City")]:
    "EXIT: The Game – Kidnapped in Fortune City",
  [normalizeForMatch("Exit: The Gate Between Worlds")]:
    "EXIT: The Game – The Gate Between Worlds",

  // Minecraft
  [normalizeForMatch("Minecraft Builders and Biomes Board Game")]:
    "Minecraft: Builders & Biomes",

  // LotR / Arkham / Spirit Island expansions
  [normalizeForMatch(
    "The Lord of the Rings: Journeys in Middle-Earth - Shadowed Paths Expansion"
  )]: "The Lord of the Rings: Journeys in Middle-earth – Shadowed Paths",
  [normalizeForMatch(
    "Arkham Horror LCG: Carnevale of Horrors Scenario Pack Expansion"
  )]: "Arkham Horror: The Card Game – Carnevale of Horrors",
  [normalizeForMatch("Jagged Earth: Spirit Island expansion")]:
    "Spirit Island: Jagged Earth",

  // Champions of Midgard, GAH, etc.
  [normalizeForMatch("Valhalla: Champions of Midgard Exp")]:
    "Champions of Midgard: Valhalla",
  [normalizeForMatch("Grand Austria Hotel: Let's Waltz")]:
    "Grand Austria Hotel: Let's Waltz!",

  // Coup, Mysterium, Obsession, etc.
  [normalizeForMatch("Coup 2nd Edition: Reformation Expansion")]:
    "Coup: Reformation",
  [normalizeForMatch("Hidden Signs: Mysterium Expansion 1")]:
    "Mysterium: Hidden Signs",

  // Memoir '44 extras
  [normalizeForMatch("Memoir '44 Battle Map 1 Hedgerow Hell")]:
    "Memoir '44: Battle Map Volume 1 – Hedgerow Hell",

  // 6 nimmt! / Heckmeck
  [normalizeForMatch("6 Nimmt!")]: "6 nimmt!",
  [normalizeForMatch("Heckmeck Am Bratwurmeck (English Language Version)")]:
    "Heckmeck am Bratwurmeck",

  // Nova Luna variant
  [normalizeForMatch("Nova Luna (German/English Version)")]: "Nova Luna",

  // Additional aliases from latest unmatched set
  [normalizeForMatch("5211: Azul Special Edition")]:
    "5211: Azul Special Edition",
  [normalizeForMatch("The Isle of Cats Expansion: Kittens + Beasts")]:
    "The Isle of Cats: Kittens + Beasts",
  [normalizeForMatch(
    "Mansions of Madness 2nd Edition: Sanctum of Twilight Expansion"
  )]: "Mansions of Madness: Second Edition – Sanctum of Twilight",
  [normalizeForMatch("Scythe: The Rise of Fenris")]:
    "Scythe: The Rise of Fenris",
  [normalizeForMatch("Destinies: Sea of Sand")]: "Destinies: Sea of Sand",
  [normalizeForMatch("Breakthrough Kit for Memoir '44")]:
    "Memoir '44: Breakthrough Kit",
  [normalizeForMatch("Undaunted: Reinforcements - Revised Edition")]:
    "Undaunted: Reinforcements",
  [normalizeForMatch("Agricola: Farmers of the Moor (Revised Edition)")]:
    "Agricola: Farmers of the Moor (Revised Edition)",
  [normalizeForMatch("Unlock 7! Epic Adventures")]: "Unlock!: Epic Adventures",
  [normalizeForMatch(
    "Mansions of Madness 2nd Edition: Beyond the Threshold Expansion"
  )]: "Mansions of Madness: Second Edition – Beyond the Threshold",
  [normalizeForMatch(
    "Murder at the Excelsior Hotel Arkham Horror LCG Expansion"
  )]: "Arkham Horror: The Card Game – Murder at the Excelsior Hotel",
  [normalizeForMatch("Boggle Classic")]: "Boggle",
  [normalizeForMatch("Rummikub Travel")]: "Rummikub",
  [normalizeForMatch("Sub Terra: Investigation")]: "Sub Terra: Investigation",
  [normalizeForMatch("Tiny Epic Dungeons Stories Expansion")]:
    "Tiny Epic Dungeons: Stories",
  [normalizeForMatch("The Great American Mail Race")]:
    "The Great American Mail Race",
  [normalizeForMatch("Game of Thrones The Board Game (2nd Ed)")]:
    "A Game of Thrones: The Board Game (Second Edition)",
  [normalizeForMatch("Concordia: Aegyptus/Creta Expansion")]:
    "Concordia: Aegyptus / Creta",
  [normalizeForMatch("Star Wars: Outer Rim - Unfinished Business Expansion")]:
    "Star Wars: Outer Rim – Unfinished Business",
  [normalizeForMatch("Flash Point Fire Rescue 2nd Edition")]:
    "Flash Point: Fire Rescue",
  [normalizeForMatch("Twilight Imperium: Prophecy of Kings Expansion")]:
    "Twilight Imperium: Prophecy of Kings",
  [normalizeForMatch("EXiT: Advent Calendar - Hunt for the Golden Book")]:
    "EXIT Advent Calendar: The Hunt for the Golden Book",
  [normalizeForMatch("Here to Slay: Warriors & Druids Expansion")]:
    "Here to Slay: Warriors & Druids Expansion Pack",
  [normalizeForMatch("Dixit Expansion 5: Daydream")]: "Dixit: Daydreams",
};
