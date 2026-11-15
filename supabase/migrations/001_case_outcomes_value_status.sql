-- Migration 001 — statut de chaque valeur chiffrée de case_outcomes
-- Additive uniquement : aucune ligne modifiée, supprimée ni requalifiée. Les statuts existants restent NULL.
-- NULL = qualification non vérifiée (affichée « Statut non vérifié »). 'unknown' est aussi accepté.
begin;
alter table public.case_outcomes
  add column if not exists baseline_value_status text,
  add column if not exists observed_value_status text,
  add column if not exists fiscal_cost_status    text,
  add column if not exists fiscal_revenue_status text;

alter table public.case_outcomes
  add constraint case_outcomes_baseline_value_status_chk check (baseline_value_status is null or baseline_value_status in ('observed','projected','target','estimated','unknown')),
  add constraint case_outcomes_observed_value_status_chk check (observed_value_status is null or observed_value_status in ('observed','projected','target','estimated','unknown')),
  add constraint case_outcomes_fiscal_cost_status_chk    check (fiscal_cost_status    is null or fiscal_cost_status    in ('observed','projected','target','estimated','unknown')),
  add constraint case_outcomes_fiscal_revenue_status_chk check (fiscal_revenue_status is null or fiscal_revenue_status in ('observed','projected','target','estimated','unknown'));

comment on column public.case_outcomes.baseline_value_status is 'Nature de baseline_value : observed|projected|target|estimated|unknown (NULL = non vérifié). Jamais déduite de la date.';
comment on column public.case_outcomes.observed_value_status is 'Nature de observed_value (malgré son nom : peut être une projection ou un objectif).';
comment on column public.case_outcomes.fiscal_cost_status    is 'Nature de fiscal_cost.';
comment on column public.case_outcomes.fiscal_revenue_status is 'Nature de fiscal_revenue.';
commit;
-- Aucune policy RLS à modifier : les colonnes héritent des policies et grants existants de la table.
-- Retour arrière : alter table public.case_outcomes drop column baseline_value_status, drop column observed_value_status, drop column fiscal_cost_status, drop column fiscal_revenue_status;
