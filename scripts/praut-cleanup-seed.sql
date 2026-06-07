SET sql_safe_updates = false;

BEGIN;

-- Rename custom seed model labels from game terminology to Praut terminology.
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Game Narrative$$, $$embedded:embedded:User story / workflow scénář$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Game Narrative%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Game Asset$$, $$embedded:embedded:Softwarový asset$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Game Asset%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Audio Asset$$, $$embedded:embedded:Audio záznam$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Audio Asset%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Image Asset$$, $$embedded:embedded:Vizuální asset$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Image Asset%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Game Component$$, $$embedded:embedded:Softwarová komponenta$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Game Component%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Character$$, $$embedded:embedded:Persona / role$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Character%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Enemy$$, $$embedded:embedded:Riziko / blokátor$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Enemy%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:NPC$$, $$embedded:embedded:Externí subjekt$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:NPC%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Player$$, $$embedded:embedded:Uživatel workspace$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Player%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Environment$$, $$embedded:embedded:Prostředí$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Environment%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Item$$, $$embedded:embedded:Deliverable / výstup$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Item%$$;

-- Rename inherited custom attributes/tags that exposed game semantics.
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Asset name$$, $$embedded:embedded:Název assetu$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Asset name%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Audio purpose$$, $$embedded:embedded:Účel audia$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Audio purpose%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:File format$$, $$embedded:embedded:Formát souboru$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:File format%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Duration$$, $$embedded:embedded:Délka$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Duration%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Looping$$, $$embedded:embedded:Smyčka$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Looping%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Dimensions$$, $$embedded:embedded:Rozměry$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Dimensions%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Transparency$$, $$embedded:embedded:Průhlednost$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Transparency%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Title$$, $$embedded:embedded:Název$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Title%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Name$$, $$embedded:embedded:Název$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Name%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Description$$, $$embedded:embedded:Popis$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Description%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Speed$$, $$embedded:embedded:Rychlost$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Speed%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Jump height$$, $$embedded:embedded:Kapacita$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Jump height%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Movement mode$$, $$embedded:embedded:Dostupnost / režim$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Movement mode%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Max health$$, $$embedded:embedded:Maximální kapacita$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Max health%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Stamina$$, $$embedded:embedded:Rezerva$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Stamina%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Flying$$, $$embedded:embedded:Vysoké riziko$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Flying%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Flying speed$$, $$embedded:embedded:Rychlost eskalace$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Flying speed%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Alignment$$, $$embedded:embedded:Stav vztahu$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Alignment%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Merchant$$, $$embedded:embedded:Dodavatel$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Merchant%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Deal stolen items$$, $$embedded:embedded:Práce s citlivými podklady$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Deal stolen items%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Inventory$$, $$embedded:embedded:Přiřazené výstupy$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Inventory%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Wizard$$, $$embedded:embedded:Expert$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Wizard%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Mana$$, $$embedded:embedded:Dostupná kapacita$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Mana%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Item type$$, $$embedded:embedded:Typ výstupu$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Item type%$$;
UPDATE public.model_tx SET data = replace(data::STRING, $$embedded:embedded:Rarity$$, $$embedded:embedded:Kritičnost$$)::JSONB WHERE data::STRING LIKE $$%embedded:embedded:Rarity%$$;

-- Hide default sample projects from the tracker sidebar.
UPDATE public.space
SET archived = true,
    data = replace(replace(data::STRING, $$Game Design (Example)$$, $$Archiv - herní ukázka$$), $$Welcome to Huly!$$, $$Archiv - Huly ukázka$$)::JSONB
WHERE _id IN ($$6a20f0589973adbaf81c24d3$$, $$tracker:project:DefaultProject$$);

-- Remove sample task notifications/activities and current task rows.
DELETE FROM public.notification
WHERE data::STRING ILIKE $$%GAME-%$$
   OR data::STRING ILIKE $$%HULY-%$$
   OR data::STRING ILIKE $$%Game Design%$$
   OR data::STRING ILIKE $$%Welcome to Huly%$$;

DELETE FROM public.activity
WHERE data::STRING ILIKE $$%GAME-%$$
   OR data::STRING ILIKE $$%HULY-%$$
   OR data::STRING ILIKE $$%Game Design%$$
   OR data::STRING ILIKE $$%Welcome to Huly%$$;

DELETE FROM public.attachment
WHERE "attachedTo" IN (
  SELECT _id
  FROM public.card
  WHERE data->>$$docCreatedBy$$ = $$core:account:ConfigUser$$
    AND _class <> $$contact:class:UserProfile$$
);

DELETE FROM public.task
WHERE data->>$$identifier$$ LIKE $$GAME-%$$
   OR data->>$$identifier$$ LIKE $$HULY-%$$;

-- Remove seed cards while keeping real user profile cards.
DELETE FROM public.card
WHERE data->>$$docCreatedBy$$ = $$core:account:ConfigUser$$
  AND _class <> $$contact:class:UserProfile$$;

COMMIT;
