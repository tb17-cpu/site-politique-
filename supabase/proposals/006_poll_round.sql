-- PROPOSITION — NON EXÉCUTÉE — Colonne explicite « round » (tour visé) sur poll_snapshots.
-- À relire puis à exécuter uniquement par le propriétaire du projet. Additive : aucune ligne supprimée, aucune valeur existante modifiée
-- hormis le remplissage de la NOUVELLE colonne pour les seules lignes dont le tour est indiscutable (voir 3).
-- Tant qu'elle n'est pas appliquée, ou tant que round est NULL, le site ne rattache le sondage à AUCUN tour : il reste consultable dans le
-- sélecteur de l'accueil, mais n'alimente ni l'estimation de la carte de statut ni aucune moyenne. Le site ne déduit plus jamais le tour du texte du scénario.
begin;

-- 1. Colonnes : round (1 = premier tour, 2 = second tour…) ; round_basis = origine de la valeur. NULL = tour indéterminé.
alter table public.poll_snapshots add column round smallint;
alter table public.poll_snapshots add column round_basis text;
alter table public.poll_snapshots add constraint poll_round_chk check (round is null or round between 1 and 9);
alter table public.poll_snapshots add constraint poll_round_basis_chk check (
  (round is null and round_basis is null) or (round is not null and round_basis is not null and round_basis in ('declared','backfill_text')));
comment on column public.poll_snapshots.round is 'Tour de scrutin visé par le sondage (1, 2…). NULL : indéterminé, jamais utilisé pour une estimation.';
comment on column public.poll_snapshots.round_basis is 'declared : saisi par l''éditeur ; backfill_text : repris du libellé du scénario (mention explicite et non ambiguë) lors de la migration.';

-- 2. Cohérence : toutes les lignes d'un même sondage (élection, source, institut, scénario, dates) portent le même tour (contrôle différé).
create function public.poll_round_consistency() returns trigger language plpgsql as $$
begin
  if new.record_kind = 'poll' and exists (
    select 1 from public.poll_snapshots o
     where o.id <> new.id and o.record_kind = 'poll' and o.election_id = new.election_id
       and o.source_id is not distinct from new.source_id and o.pollster is not distinct from new.pollster
       and o.scenario is not distinct from new.scenario and o.poll_date is not distinct from new.poll_date
       and o.fieldwork_start is not distinct from new.fieldwork_start
       and o.round is distinct from new.round) then
    raise exception 'toutes les lignes d''un même sondage doivent avoir le même tour (round)';
  end if;
  return null;
end $$;
create constraint trigger poll_round_consistency_trg after insert or update of round on public.poll_snapshots
  deferrable initially deferred for each row execute function public.poll_round_consistency();

-- 3. Anciennes lignes : remplissage UNIQUEMENT si le scénario mentionne explicitement un seul tour. Aucune déduction par le nombre de candidats.
--    Tout le reste (aucune mention, mentions contradictoires, moyennes) reste NULL et doit être revu par l'éditeur (vue de revue ci-dessous).
update public.poll_snapshots set round = 2, round_basis = 'backfill_text'
 where record_kind = 'poll' and round is null
   and scenario ~* '(second\s+tour|2(e|nd|ème)\s+tour|ballottage)'
   and scenario !~* '(premier\s+tour|1er\s+tour|1re\s+tour)';
update public.poll_snapshots set round = 1, round_basis = 'backfill_text'
 where record_kind = 'poll' and round is null
   and scenario ~* '(premier\s+tour|1er\s+tour|1re\s+tour)'
   and scenario !~* '(second\s+tour|2(e|nd|ème)\s+tour|ballottage)';

-- 4. Revue éditoriale : sondages dont le tour reste indéterminé (lecture réservée au propriétaire ; jamais exposée à l'API publique).
create view public.poll_snapshots_round_review with (security_invoker = true) as
  select election_id, source_id, pollster, scenario, poll_date, fieldwork_start, count(*) as lignes, min(snapshot_date) as snapshot_date,
         case when scenario ~* '(second\s+tour|2(e|nd|ème)\s+tour|ballottage)' and scenario ~* '(premier\s+tour|1er\s+tour|1re\s+tour)' then 'mentions contradictoires'
              when scenario is null or btrim(scenario) = '' then 'scénario vide'
              else 'aucune mention de tour' end as motif
    from public.poll_snapshots
   where record_kind = 'poll' and round is null
   group by election_id, source_id, pollster, scenario, poll_date, fieldwork_start;
revoke all on public.poll_snapshots_round_review from anon, authenticated, public;
-- Pour renseigner un sondage après revue (exemple) :
--   update public.poll_snapshots set round = 1, round_basis = 'declared'
--    where record_kind = 'poll' and round is null and election_id = '…' and source_id = '…' and pollster = '…' and scenario = '…';
commit;
-- Retour arrière : drop view public.poll_snapshots_round_review; drop trigger poll_round_consistency_trg on public.poll_snapshots;
--                  drop function public.poll_round_consistency(); alter table public.poll_snapshots drop column round_basis, drop column round;
