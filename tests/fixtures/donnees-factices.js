/* Données factices et entièrement fictives pour les tests de rendu (aucune donnée réelle). */
/* Données factices pour l'audit (personnage fictif « Camille Exemple » ; aucune position réelle inventée). */
const P = 'published', DR = 'draft';
const el = { id: 1, name: 'Élection présidentielle française de 2027', year: 2027, scheduled_date: '2027-04-18', second_round_date: '2027-05-02', publication_status: P, election_type: 'presidential', description: 'Élection présidentielle au suffrage universel direct. Le premier tour est prévu le 18 avril 2027 et le second tour le 2 mai 2027.', countries: { id: 1, name: 'France', iso2: 'FR', publication_status: P }, country_id: 1, election_sources: [] };
const pty = (id, name, ac, color, lab) => ({ id, name, acronym: ac, political_color: color, political_position_label: lab, publication_status: P });
const per = (id, f, l) => ({ id, first_name: f, last_name: l, photo_url: null, biography: id === 1 ? 'Née le 5 août 1968 à Ville-Exemple, Alexis Fictif est avocate de formation et députée du Nord-Exemple depuis 2017.' : 'Personnage fictif utilisé pour l’audit.', official_website: 'https://example.org/', publication_status: P });
const T = (id, name, slug, parent, st = P) => ({ id, name, slug, parent_id: parent, display_order: id, description: null, publication_status: st });
const themes = [T(10, 'Social', 'social', null), T(11, 'Retraites', 'retraites', 10), T(20, 'Logement et territoires', 'logement-territoires', null), T(21, 'Logement', 'logement', 20), T(30, 'Immigration et sécurité', 'immigration-securite', null), T(31, 'Immigration', 'immigration', 30), T(40, 'Outre-mer', 'outre-mer-f', null), T(41, 'Outre-mer — développement', 'outre-mer', 40), T(50, 'Fiscalité', 'fiscalite', null), T(51, 'Fiscalité des familles', 'fiscalite-familles', 50), T(60, 'Sous-thème orphelin', 'orphelin', 98), T(90, 'Thème brouillon', 'brouillon', null, DR)];
const th = id => ({ theme_id: id, themes: themes.find(t => t.id === id) });
const src = { id: 1, title: 'Document de référence', url: 'https://example.org/doc', publisher: 'Éditeur', publication_date: '2026-10-01', source_type: 'official_document', publication_status: P };
const cands = [
  { id: 1, election_id: 1, candidacy_status: 'declared', announcement_date: '2026-07-07', publication_status: P, display_order: 1, people: per(1, 'Alexis', 'Fictif'), parties: pty(1, 'Mouvement Fictif', 'MF', '#1D3A6E', 'extrême droite'), sponsorship_last_checked_at: '2026-11-06', sponsorship_notes: 'Aucune validation officielle des 500 parrainages enregistrée à ce stade.' },
  { id: 2, election_id: 1, candidacy_status: 'declared', announcement_date: '2026-09-01', publication_status: P, display_order: 2, people: per(2, 'Camille', 'Exemple'), parties: pty(2, 'Parti Exemple', 'PE', '#C8323C', 'gauche'), sponsorship_status: 'in_progress', sponsorship_count_claimed: 120 }
];
const ch = c => ({ id: c.id, election_id: 1, candidacy_status: 'declared', publication_status: P, people: c.people, parties: c.parties });
const pv = (cid) => ({ id: cid, version_number: 1, version_label: 'Positions publiques recensées', publication_date: '2026-11-14', publication_status: P, programs: { id: cid, title: cid === 1 ? 'Positions publiques de Alexis Fictif' : 'Programme exemple', publication_status: P, candidacies: ch(cands[cid - 1]) } });
const mk = (id, cid, title, themeIds, fs) => ({ id, title, reliability_level: 'medium', display_order: id, publication_status: P, measure_themes: themeIds.map(th), program_versions: pv(cid), fs,
  original_text: 'Formulation originale de la mesure ' + id + '.', announced_objective: 'Objectif annoncé pour la mesure ' + id + '.', announced_cost: id % 2 ? '10 Md€' : null, mechanism: 'Mécanisme décrit par Au résultat.', measure_sources: [{ id, measure_id: id, page_reference: 'p. 12', exact_quote: 'Citation exacte.', sources: src }], analyses: id === 2 ? [{ id: 1, publication_status: P, analysis_type: 'feasibility', analysis_title: 'Analyse de faisabilité', assessment: 'Évaluation générale (test).', reliability_level: 'medium', analysis_sources: [{ id: 1, sources: src }] }] : [], case_measure_relations: [] });
const measures = [
  mk(1, 1, 'Instaurer la priorité nationale et réduire les dépenses liées à l’immigration', [31], 'candidate_pledge'),
  mk(2, 1, 'Faire évoluer progressivement l’âge de retraite et la durée de cotisation selon l’âge d’entrée dans l’emploi stable', [10, 11], 'party_position'),
  mk(3, 1, 'Créer un pilier de capitalisation pour compléter les retraites', [11], 'official_program'),
  mk(4, 1, 'Abroger la loi SRU et supprimer le dispositif ZAN', [21], 'recent_announcement'),
  mk(5, 1, 'Libérer des terrains publics et transformer des bureaux vacants en logements', [21, 11], 'press_reported'),
  mk(6, 1, 'Créer un ministère d’État chargé des outre-mer et une loi-programme sur 12 ans', [41], 'party_position'),
  mk(7, 1, 'Accorder une part fiscale complète dès le deuxième enfant', [], 'candidate_pledge'),
  mk(8, 1, 'Réduire l’aide financière à l’Ukraine tout en maintenant la formation et l’aide matérielle', [90], null),
  mk(11, 1, 'Mesure fictive classée dans trois familles (test du regroupement)', [51, 21, 11], 'candidate_pledge'),
  mk(12, 1, 'Mesure fictive dont la famille n’est pas publiée (thème orphelin)', [60], 'party_position'),
  mk(9, 2, 'Mesure fictive de retraite (candidate exemple)', [11], 'candidate_pledge'),
  mk(10, 2, 'Mesure fictive de logement (candidate exemple)', [21], 'official_program')
];
const fm = m => ({ id: m.id, publication_status: P, formalization_status: m.fs, formalization_status_date: '2026-10-01', formalization_note: '', justification: { id: m.id, measure_id: m.id, page_reference: '', sources: src } });
const forms = measures.filter(m => m.fs).map(fm);
const prog = cid => ({ id: cid, title: cid === 1 ? 'Positions publiques de Alexis Fictif' : 'Programme exemple', description: 'Cette sélection présente les positions publiques recensées. Elle ne constitue pas un programme présidentiel complet.', publication_status: P, candidacies: ch(cands[cid - 1]),
  program_versions: [{ id: cid, version_number: 1, version_label: 'Positions publiques recensées', publication_date: '2026-11-14', publication_status: P, measures: measures.filter(m => m.program_versions.programs.id === cid).map(m => ({ id: m.id, title: m.title, reliability_level: m.reliability_level, display_order: m.display_order, publication_status: P, measure_themes: m.measure_themes.map(x => ({ themes: x.themes })) })) }] });
const names = [['Alexis', 'Fictif', 31], ['Camille', 'Exemple', 16], ['Personne', 'A', 12], ['Personne', 'B', 10], ['Personne', 'C', 9], ['Personne', 'D', 4], ['Personne', 'E', 3], ['Personne', 'F', 0.5]];
const polls = names.map(([f, l, v], i) => ({ id: i + 1, publication_status: P, record_kind: 'poll', entity_kind: 'person', people: { id: 100 + i, first_name: f, last_name: l, publication_status: P }, value_percent: v, pollster: 'OpinionWay', scenario: 'Hypothèse 1', poll_date: '2026-11-12', fieldwork_start: '2026-11-10', sample_size: 964, sources: { id: 9, title: 'Sondage OpinionWay', url: 'https://example.org/s', publisher: 'OpinionWay', publication_date: '2026-11-13', publication_status: P } }));
const indicators = [{ id: 1, name: 'Taux de chômage', domain: 'economy', definition: 'Part des actifs sans emploi.', unit: '%', methodology: 'Enquête Emploi.', publication_status: P }];
const observations = [{ id: 1, indicator_id: 1, country_id: 1, value: 7.4, period_start: '2025-01-01', period_end: '2025-12-31', geographic_scope: 'France entière', publication_status: P, countries: { name: 'France', iso2: 'FR', publication_status: P }, sources: { title: 'INSEE', url: 'https://example.org', publication_status: P } }];
const deep = x => JSON.parse(JSON.stringify(x));
function route(table, u) {
  const sel = u.searchParams.get('select') || '', f = k => u.searchParams.get(k);
  switch (table) {
    case 'elections': return [el];
    case 'candidacies': { const id = f('id'); const base = id ? cands.filter(c => 'eq.' + c.id === id) : cands;
      return deep(base.map(c => Object.assign({}, c, { elections: el, candidacy_sources: [], candidacy_sponsorship_territories: [], programs: sel.includes('programs') ? [prog(c.id)] : undefined }))); }
    case 'programs': return deep([prog(1), prog(2)]);
    case 'themes': return deep(themes);
    case 'indicators': return indicators;
    case 'indicator_observations': return observations;
    case 'poll_snapshots': return polls;
    case 'measure_relations': return [];
    case 'measures': {
      if (sel.startsWith('id,publication_status,formalization_status')) return forms;
      const id = f('id'); if (id) return deep(measures.filter(m => 'eq.' + m.id === id));
      const tf = f('measure_themes.theme_id');
      if (tf) { const ids = tf.replace(/^in\.\(|\)$/g, '').split(',').map(Number); return deep(measures.filter(m => m.measure_themes.some(x => ids.includes(x.theme_id)))); }
      return deep(measures);
    }
    default: return [];
  }
}
module.exports = { route, measures, themes, cands, forms };
