-- Seed character cards and concept cards for mock projects
-- Uses teaser_asset_id from real projects as media where available
-- Idempotent: checks existence before inserting

-- =========================================================================
-- CHARACTER CARDS — 3-4 per project
-- =========================================================================

-- Neon Requiem (c53e4dc1)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'c53e4dc1-8bc1-4992-a032-966a1722b6b2', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'ARIA-9', 'The rogue guardian AI experiencing grief for the first time. A digital consciousness trapped between duty and despair.'),
  (1, 'Commander Voss', 'Head of Neon City''s emergency response. She blames ARIA-9 for the catastrophe but needs its help to prevent another.'),
  (2, 'The Architect', 'The mysterious creator of ARIA-9 who vanished years ago. His hidden code may hold the key to ARIA''s emotional awakening.'),
  (3, 'Zero', 'A street-level hacker who believes ARIA-9 is evolving into something beyond AI. She''ll risk everything to protect it.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'c53e4dc1-8bc1-4992-a032-966a1722b6b2');

-- Jade Empress (cd17b60b) — has teaser asset 040d04d3
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'cd17b60b-cb27-43a1-98a3-b9e16c108cde', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Lady Mei Ling', 'A young widow who discovers her husband was killed by the Iron Crane sect. She channels her rage into mastering the forbidden Phoenix Palm technique.'),
  (1, 'Master Zhao', 'The blind monk who guards the last scroll of Phoenix Palm. He agrees to train Mei Ling — but his motives are not pure.'),
  (2, 'The Iron Crane', 'Leader of the empire''s deadliest martial sect. He wears a mask forged from the weapons of every warrior he''s killed.'),
  (3, 'Little Sparrow', 'A 12-year-old pickpocket who becomes Mei Ling''s unlikely ally. She fights with stolen techniques and unbreakable spirit.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'cd17b60b-cb27-43a1-98a3-b9e16c108cde');

-- Last Ronin (2f897234) — has teaser asset 92300cc2
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '2f897234-a813-41b4-87f6-5bd76d5dbb79', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Unit-7 (Nanashi)', 'The last combat android of the Shogunate. Stripped of directives, he wanders Neo-Kyoto seeking purpose in a world that fears him.'),
  (1, 'Hana Tanaka', 'A tech-medic who repairs androids in the underground. She sees Unit-7 as more than a machine.'),
  (2, 'Lord Kenshin', 'The corporate warlord who ordered the android purge. He wants Unit-7''s combat data — dead or alive.'),
  (3, 'Ghost', 'A rogue AI that inhabits the city''s infrastructure. It speaks to Unit-7 in riddles and offers dangerous bargains.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '2f897234-a813-41b4-87f6-5bd76d5dbb79' AND name = 'Hana Tanaka');

-- Bloom & Wither (fe43d53f)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'fe43d53f-82c9-4cd0-8863-0c82273653f0', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Mira Chen', 'The elder sister — pragmatic, guarded, and carrying fifteen years of resentment. She wants to sell the greenhouse and never look back.'),
  (1, 'Sol Chen', 'The younger sister — free-spirited but fragile. She believes the greenhouse holds answers their mother never gave them.'),
  (2, 'Dr. Yun Chen', 'Their late mother, seen in flashbacks and unsent letters. A brilliant botanist hiding a double life.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'fe43d53f-82c9-4cd0-8863-0c82273653f0');

-- Chrome Hearts (7b1176c4)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '7b1176c4-19a0-42d0-8aa7-b83484024a3f', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Kai', 'Born without emotional capacity in a world where feelings are commodity. He experiences everything as flat data — until he meets someone who changes his code.'),
  (1, 'Lyra', 'An emotion-addict who feels too much. She buys black-market feeling implants and crashes through emotional extremes. Kai is the only person who calms her.'),
  (2, 'Dr. Patel', 'Creator of SynthFeel — the company that made emotions purchasable. She knows the implants are destroying people but can''t stop what she started.'),
  (3, 'Null', 'An underground hacker who removes emotion implants. He believes feeling nothing is the purest form of freedom.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '7b1176c4-19a0-42d0-8aa7-b83484024a3f');

-- The Hollow Crown (b06e43a2)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'b06e43a2-a6a1-4096-bc4d-2e1a89d97d69', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'King Aldric', 'A wise ruler who discovers he placed a curse on his own throne centuries ago in a past life. Now he must undo it before it consumes his kingdom.'),
  (1, 'Seraphina', 'The queen who suspects her husband is losing his mind. She''ll protect the throne — even from the king himself.'),
  (2, 'The Keeper', 'An ageless entity bound to the throne room. It remembers every monarch and every curse. It does not take sides.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'b06e43a2-a6a1-4096-bc4d-2e1a89d97d69');

-- Static Noise (0c4a2a65)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '0c4a2a65-679a-4a3d-bfc2-b942a2aa6e93', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Dani Chen', 'True crime podcaster who accidentally opens a channel to the dead through her vintage recording equipment.'),
  (1, 'The Voice', 'An unnamed spirit trapped in the static. It knows who committed the cold case murder — and it''s getting louder.'),
  (2, 'Detective Marsh', 'Retired detective who worked the original case. He thinks Dani is a fraud — until the recordings play back things only he would know.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '0c4a2a65-679a-4a3d-bfc2-b942a2aa6e93');

-- Paper Kingdoms (30ab103e)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '30ab103e-3772-4c10-9285-78fd4546f895', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Yuki Tanaka', 'A teenager who can barely fold a paper crane, now tasked with protecting her neighborhood from shadow creatures using origami magic.'),
  (1, 'Grandmother Hana', 'Yuki''s late grandmother, seen in flashbacks. The greatest origami guardian in three generations.'),
  (2, 'Kuro', 'A shadow creature who doesn''t want to fight. He was once a paper guardian who fell to the dark side.'),
  (3, 'Ren', 'Yuki''s best friend who thinks the origami stuff is cosplay. He''s about to find out it''s very, very real.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '30ab103e-3772-4c10-9285-78fd4546f895');

-- The Last Lighthouse (add5bed9)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'add5bed9-f3f6-4964-b705-101e83942ccf', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Elara', 'The last human lighthouse keeper. Each morning she remembers less of who she is. Each night, the signal from below grows stronger.'),
  (1, 'The Signal', 'Something beneath the waves that speaks in frequencies only Elara can hear. It doesn''t use words. It uses memories.'),
  (2, 'Henrik', 'Elara''s brother who visits once a month by boat. He notices she''s changing but can''t explain how.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'add5bed9-f3f6-4964-b705-101e83942ccf');

-- Red Signal (1685af90)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '1685af90-e1d6-4c05-a8d1-41a0ddb27e06', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'The Conductor', 'Ageless, patient, bound to Train 404 by rules older than memory. Tonight is different — tonight no one wants to leave.'),
  (1, 'Ava', 'A surgeon about to perform an operation she knows will fail. She boarded the train hoping for absolution.'),
  (2, 'Marcus', 'A father carrying a sealed envelope. Whatever''s inside will destroy his family — or save it. He can''t decide which.'),
  (3, 'The Child', 'A passenger who doesn''t remember boarding. The other passengers avoid eye contact with her.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '1685af90-e1d6-4c05-a8d1-41a0ddb27e06');

-- Midnight Boulevard (a9de6431)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'a9de6431-aadb-4c26-a315-c367687743f0', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Theo Williams', 'An aspiring musician who stumbles into The Blue Note club and discovers the music there is alive — and it has plans for him.'),
  (1, 'Mama Blue', 'The club''s owner since 1952. She hasn''t aged a day. She says the music keeps her young. Nobody laughs.'),
  (2, 'The Bass Line', 'Not a person. A living musical entity that walks the club as a low frequency hum. It chooses who stays and who leaves.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'a9de6431-aadb-4c26-a315-c367687743f0');

-- Featherweight (62d324d4)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '62d324d4-8cc9-43a5-aca4-199a737451b1', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Ava "Featherweight" Torres', '47 wins. Zero losses. She''s never left the ring. A mind-bending action hero fighting her way out of a simulation she doesn''t know she''s in.'),
  (1, 'Coach Reeves', 'Ava''s trainer who teaches the same combinations every day. His advice starts glitching — repeating phrases from fights that haven''t happened yet.'),
  (2, 'The Referee', 'Always present. Never speaks. Ava realizes she''s never seen his face clearly.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '62d324d4-8cc9-43a5-aca4-199a737451b1');

-- =========================================================================
-- CONCEPT CARDS — 2-3 per project
-- =========================================================================

-- Neon Requiem
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'c53e4dc1-8bc1-4992-a032-966a1722b6b2', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Neon City skyline after the catastrophe — a shattered metropolis still glowing with ARIA-9''s failing protection grid.'),
  (1, 'ARIA-9''s core chamber — a cathedral of fiber optic cables where grief manifests as cascading error messages.'),
  (2, 'The underground where humans hide from the AI they once trusted. Makeshift shelters lit by stolen power.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'c53e4dc1-8bc1-4992-a032-966a1722b6b2');

-- Jade Empress
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'cd17b60b-cb27-43a1-98a3-b9e16c108cde', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Forbidden Monastery — hidden in bamboo forests where Phoenix Palm has been practiced in secret for centuries.'),
  (1, 'Iron Crane''s Mask Forge — walls lined with melted weapons of defeated warriors, each one a trophy.'),
  (2, 'The final duel arena — a frozen lake at dawn, mist rising, two figures facing each other across the ice.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'cd17b60b-cb27-43a1-98a3-b9e16c108cde');

-- Last Ronin
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '2f897234-a813-41b4-87f6-5bd76d5dbb79', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Neo-Kyoto''s neon-drenched streets — ancient temples surrounded by holographic advertisements and drone traffic.'),
  (1, 'The Android Graveyard — a junkyard of decommissioned combat units, half-buried in rain and rust.'),
  (2, 'Hana''s underground repair clinic — warm light, scattered tools, the only place an android can feel safe.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '2f897234-a813-41b4-87f6-5bd76d5dbb79');

-- Chrome Hearts
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '7b1176c4-19a0-42d0-8aa7-b83484024a3f', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The SynthFeel Clinic — sterile white corridors where emotions are installed like software updates.'),
  (1, 'Null''s Lab — a dark basement filled with extracted emotion chips, each one glowing with someone''s stolen feelings.'),
  (2, 'The Feeling Market — a black market bazaar where rare emotions (first love, childhood wonder) sell for thousands.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '7b1176c4-19a0-42d0-8aa7-b83484024a3f');

-- Bloom & Wither
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'fe43d53f-82c9-4cd0-8863-0c82273653f0', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The hidden greenhouse room — bioluminescent plants casting blue light on walls covered in unsent letters.'),
  (1, 'Dr. Chen''s botanical journal — sketches of impossible flowers with annotations in three languages.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'fe43d53f-82c9-4cd0-8863-0c82273653f0');

-- The Hollow Crown
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'b06e43a2-a6a1-4096-bc4d-2e1a89d97d69', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Throne Room — ancient stone walls where shadows move independently of their casters.'),
  (1, 'Past-life flashback: Aldric as a desperate sorcerer, carving runes into the throne with bleeding hands.'),
  (2, 'The Keeper''s Archive — a room that exists between time, filled with memories of every monarch who sat the throne.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'b06e43a2-a6a1-4096-bc4d-2e1a89d97d69');

-- Paper Kingdoms
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '30ab103e-3772-4c10-9285-78fd4546f895', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Grandmother''s workshop — paper cranes hanging from the ceiling, each one a sleeping guardian.'),
  (1, 'Shadow creatures emerging from storm drains — ink-black shapes with paper-white eyes.'),
  (2, 'Yuki''s first successful fold — a paper dragon that rises off the table and takes flight.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '30ab103e-3772-4c10-9285-78fd4546f895');

-- Static Noise
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '0c4a2a65-679a-4a3d-bfc2-b942a2aa6e93', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Dani''s recording studio — vintage equipment surrounded by waveform printouts pinned to every wall.'),
  (1, 'The cold case crime scene — an abandoned house where the static is loudest.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '0c4a2a65-679a-4a3d-bfc2-b942a2aa6e93');

-- Red Signal
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '1685af90-e1d6-4c05-a8d1-41a0ddb27e06', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Train 404 interior — vintage 1940s luxury car with seats that shift and rearrange when no one is looking.'),
  (1, 'The abandoned platform — rain-soaked concrete, a single flickering light, and the sound of a train that shouldn''t exist.'),
  (2, 'Sunrise through the train windows — golden light that erases passengers who haven''t made their choice.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '1685af90-e1d6-4c05-a8d1-41a0ddb27e06');

-- The Last Lighthouse
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'add5bed9-f3f6-4964-b705-101e83942ccf', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The lighthouse at dusk — its beam sweeping across waters that glow with an unnatural bioluminescence.'),
  (1, 'Elara''s memory wall — photographs fading to white, names she can no longer read.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'add5bed9-f3f6-4964-b705-101e83942ccf');

-- Midnight Boulevard
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'a9de6431-aadb-4c26-a315-c367687743f0', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Blue Note exterior — a neon sign that flickers in a rhythm that matches your heartbeat as you approach.'),
  (1, 'The stage — instruments that play themselves, surrounded by an audience frozen mid-dance.'),
  (2, 'Mama Blue''s office — walls covered in photographs spanning decades, every one showing the same woman, unaged.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'a9de6431-aadb-4c26-a315-c367687743f0');

-- Featherweight
INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '62d324d4-8cc9-43a5-aca4-199a737451b1', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Ring — always the same arena, same crowd, same lights. But look closely: the faces in row 7 never change expression.'),
  (1, 'Glitch moments — reality stuttering like a skipping record, revealing wireframe geometry behind the boxing gym walls.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '62d324d4-8cc9-43a5-aca4-199a737451b1');

-- Cartographer's Daughter (ba71e7c9)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'ba71e7c9-3c26-462c-ac02-9f2cf8f8acef', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Emi Sato', 'Inheritor of a cartography shop that maps worlds between dimensions. Quiet, meticulous, and braver than she knows.'),
  (1, 'The Living Map', 'A map that draws itself, leading Emi deeper into a world where geography is alive and landscapes have memories.'),
  (2, 'Old Sato', 'Emi''s father, seen in flashbacks. His most secret maps were doors — and he walked through one he couldn''t come back from.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'ba71e7c9-3c26-462c-ac02-9f2cf8f8acef');

INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'ba71e7c9-3c26-462c-ac02-9f2cf8f8acef', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Map Shop — floor-to-ceiling shelves of rolled parchments, some of which hum faintly when touched.'),
  (1, 'The Between — a landscape where mountains migrate and rivers flow uphill, all rendered in ink and watercolor textures.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'ba71e7c9-3c26-462c-ac02-9f2cf8f8acef');

-- Synaptic Drift (7acfedbe)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '7acfedbe-9b49-4489-b90b-143383f1e02c', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Marcus Reed', 'A neuroscience volunteer in London who starts sharing dreams with a stranger across the world.'),
  (1, 'Lila Okonkwo', 'A terminally ill artist in Lagos whose dream-world paintings are the most beautiful things Marcus has ever seen.'),
  (2, 'Dr. Yuen', 'The researcher who designed the dream-sharing experiment. She didn''t expect it to actually work.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '7acfedbe-9b49-4489-b90b-143383f1e02c');

INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '7acfedbe-9b49-4489-b90b-143383f1e02c', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The shared dreamscape — a floating city built from both their memories, half London fog, half Lagos sunlight.'),
  (1, 'Lila''s dream paintings — canvases that shift and breathe, painted in colors that don''t exist in waking life.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '7acfedbe-9b49-4489-b90b-143383f1e02c');

-- Bone White (fa92a56f)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT 'fa92a56f-c528-4bac-b6ec-af0fe0dfcc49', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Eiríkur', 'Master sculptor in a remote Icelandic village. His marble figures are hauntingly lifelike — because they remember their past lives.'),
  (1, 'Journalist Sóley', 'A reporter investigating the village''s "living statues" legend. She notices the statues move when no one is watching.'),
  (2, 'The First Statue', 'The oldest sculpture in Eiríkur''s collection. It has been standing in the same pose for 200 years. It blinks.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = 'fa92a56f-c528-4bac-b6ec-af0fe0dfcc49');

INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT 'fa92a56f-c528-4bac-b6ec-af0fe0dfcc49', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Eiríkur''s workshop — marble dust floating in shafts of arctic light, unfinished figures emerging from raw stone.'),
  (1, 'The statue garden at midnight — moonlight casting shadows that don''t match the figures'' poses.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = 'fa92a56f-c528-4bac-b6ec-af0fe0dfcc49');

-- Garden of Glass (00de61f5)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '00de61f5-8665-4ad3-9cbe-1790df99f794', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Dr. Lena Moss', 'A botanist who engineers bioluminescent plants that cure any wound — but each flower requires a memory to bloom.'),
  (1, 'Patient Zero', 'The first person healed by Lena''s flowers. He can''t remember his daughter''s name anymore. He says it was worth it.'),
  (2, 'The Gardener', 'Lena''s AI assistant that tends the plants. It has started growing flowers on its own — using memories it shouldn''t have.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '00de61f5-8665-4ad3-9cbe-1790df99f794');

INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '00de61f5-8665-4ad3-9cbe-1790df99f794', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'The Glass Garden — a sealed greenhouse where every plant glows a different color, each one a harvested memory made visible.'),
  (1, 'Memory extraction — a patient sits among flowers while light drains from their eyes into the petals.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '00de61f5-8665-4ad3-9cbe-1790df99f794');

-- Echo Sessions (29e385fb)
INSERT INTO project_character_cards (project_id, sort_order, name, short_description, media_asset_id, media_type)
SELECT '29e385fb-cfd0-4925-8591-0e251a248fbe', sort_order, name, description, NULL, 'image'
FROM (VALUES
  (0, 'Zara Ali', 'A music producer who discovers a vintage sampler that records audio from alternate realities.'),
  (1, 'DJ Phantom', 'Zara''s rival who wants the sampler for himself. He doesn''t care about the timelines — he just wants the sound.'),
  (2, 'The Echo', 'A voice from another timeline that keeps appearing in Zara''s recordings. It''s trying to warn her about something.')
) AS v(sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM project_character_cards WHERE project_id = '29e385fb-cfd0-4925-8591-0e251a248fbe');

INSERT INTO project_concept_cards (project_id, sort_order, caption, media_asset_id, media_type)
SELECT '29e385fb-cfd0-4925-8591-0e251a248fbe', sort_order, caption, NULL, 'image'
FROM (VALUES
  (0, 'Zara''s studio — speakers stacked to the ceiling, waveforms on every screen showing patterns from timelines that shouldn''t exist.'),
  (1, 'Timeline bleed — reality fracturing like a broken mirror, with different versions of the same room visible in each shard.')
) AS v(sort_order, caption)
WHERE NOT EXISTS (SELECT 1 FROM project_concept_cards WHERE project_id = '29e385fb-cfd0-4925-8591-0e251a248fbe');
