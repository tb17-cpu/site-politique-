-- Audit de sécurité Supabase — LECTURE SEULE, à exécuter dans l'éditeur SQL. Ne modifie rien.

-- A. RLS activée ? (toute table du schéma public exposée sans RLS est un défaut bloquant)
select c.relname as table_name, c.relrowsecurity as rls_activee, c.relforcerowsecurity as rls_forcee
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by c.relrowsecurity, 1;

-- B. Politiques existantes (rôles, commande, condition)
select tablename, policyname, cmd, roles, qual as condition_using, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- C. Droits d'anon / authenticated : tout privilège autre que SELECT est anormal pour un site en lecture seule
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
group by table_name, grantee
having bool_or(privilege_type <> 'SELECT') order by 1, 2;

-- D. Tables sans aucune politique SELECT pour anon (illisibles publiquement) ou avec une politique qui ne filtre pas le statut
select c.relname as table_name,
       exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname and p.cmd in ('SELECT','ALL')) as a_une_politique_lecture,
       coalesce((select bool_and(p.qual ilike '%publication_status%' or p.qual ilike '%published%') from pg_policies p
                 where p.schemaname='public' and p.tablename=c.relname and p.cmd in ('SELECT','ALL')), false) as politique_filtre_le_statut
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1;

-- E. Droits sur les vues, fonctions et séquences accessibles à anon
select 'vue' as type, table_name as objet, privilege_type from information_schema.role_table_grants
 where table_schema='public' and grantee='anon' and table_name in (select viewname from pg_views where schemaname='public');
select 'fonction' as type, routine_name as objet, privilege_type from information_schema.routine_privileges
 where routine_schema='public' and grantee in ('anon','PUBLIC');
