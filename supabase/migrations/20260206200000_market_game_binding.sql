-- =====================================================
-- MARKET → GAME BINDING + AUTO-LOCK MIGRATION
-- STEP 1.8: Bind markets to sports_games and add locking
-- =====================================================

-- 1) Add sports_game_id foreign key to markets table
ALTER TABLE public.markets 
  ADD COLUMN IF NOT EXISTS sports_game_id BIGINT REFERENCES public.sports_games(id),
  ADD COLUMN IF NOT EXISTS external_game_id TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Add index for sports_game_id lookups
CREATE INDEX IF NOT EXISTS idx_markets_sports_game_id ON public.markets(sports_game_id);
CREATE INDEX IF NOT EXISTS idx_markets_external_game_id ON public.markets(external_game_id);
CREATE INDEX IF NOT EXISTS idx_markets_is_locked ON public.markets(is_locked);

-- 2) Backfill existing markets with sports_game_id where possible
-- Match on external_game_id (which we stored as sportsdata_game_id cast to text)
UPDATE public.markets m
SET sports_game_id = sg.id,
    external_game_id = sg.external_game_id
FROM public.sports_games sg
WHERE m.sports_game_id IS NULL
  AND m.league = UPPER(sg.league)
  AND m.sportsdata_game_id::TEXT = sg.external_game_id;

-- Also try matching by sportsdata_game_id as integer (some games have numeric IDs)
UPDATE public.markets m
SET sports_game_id = sg.id,
    external_game_id = sg.external_game_id
FROM public.sports_games sg
WHERE m.sports_game_id IS NULL
  AND m.league = UPPER(sg.league)
  AND sg.external_game_id ~ '^[0-9]+$'
  AND m.sportsdata_game_id = sg.external_game_id::BIGINT;

-- 3) Auto-lock markets for games that are already FINAL/CANCELED/POSTPONED
UPDATE public.markets m
SET is_locked = true,
    lock_reason = 'GAME_FINAL',
    locked_at = sg.finalized_at
FROM public.sports_games sg
WHERE m.sports_game_id = sg.id
  AND sg.status_norm IN ('FINAL', 'CANCELED', 'POSTPONED')
  AND m.is_locked = false;

-- 4) Comments
COMMENT ON COLUMN public.markets.sports_game_id IS 'FK to sports_games.id - authoritative link';
COMMENT ON COLUMN public.markets.external_game_id IS 'Provider game ID (reference only)';
COMMENT ON COLUMN public.markets.is_locked IS 'Whether trading is locked (derived from game status)';
COMMENT ON COLUMN public.markets.lock_reason IS 'Reason for locking: GAME_FINAL, ADMIN_LOCK, etc';
COMMENT ON COLUMN public.markets.locked_at IS 'When the market was locked';

-- 5) Create trigger to auto-lock markets when their game becomes FINAL
CREATE OR REPLACE FUNCTION public.auto_lock_markets_on_game_final()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status_norm changes to FINAL, CANCELED, or POSTPONED
  IF NEW.status_norm IN ('FINAL', 'CANCELED', 'POSTPONED') 
     AND (OLD.status_norm IS NULL OR OLD.status_norm NOT IN ('FINAL', 'CANCELED', 'POSTPONED')) THEN
    
    UPDATE public.markets
    SET is_locked = true,
        lock_reason = 'GAME_FINAL',
        locked_at = NOW(),
        updated_at = NOW()
    WHERE sports_game_id = NEW.id
      AND is_locked = false;
      
    -- Log the action
    RAISE NOTICE '[lifecycle:finalize] auto_locked_markets for game_id=%', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_lock_markets ON public.sports_games;
CREATE TRIGGER trg_auto_lock_markets
  AFTER UPDATE OF status_norm ON public.sports_games
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_lock_markets_on_game_final();

-- 6) Create function to lock markets by game ID (for manual/batch use)
CREATE OR REPLACE FUNCTION public.lock_markets_for_game(p_game_id BIGINT, p_reason TEXT DEFAULT 'GAME_FINAL')
RETURNS INTEGER AS $$
DECLARE
  v_locked_count INTEGER;
BEGIN
  UPDATE public.markets
  SET is_locked = true,
      lock_reason = p_reason,
      locked_at = NOW(),
      updated_at = NOW()
  WHERE sports_game_id = p_game_id
    AND is_locked = false;
    
  GET DIAGNOSTICS v_locked_count = ROW_COUNT;
  RETURN v_locked_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.lock_markets_for_game IS 'Lock all markets for a game. Returns count of markets locked.';
