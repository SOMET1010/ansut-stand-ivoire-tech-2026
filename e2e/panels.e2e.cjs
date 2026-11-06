// Fonctions PanelEvent historiques : événement, panel, sondage, question, pages organisateur et publiques.
// ORGANIZER_EMAIL / ORGANIZER_PASSWORD : node e2e/panels.e2e.cjs [dossier captures]
const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000', OUT = process.argv[2] || '.';
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1 };
(async () => {
  const b = await chromium.launch();
  const o = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await o.goto(B + '/auth/signin'); await o.fill('input[type=email]', process.env.ORGANIZER_EMAIL); await o.fill('input[type=password]', process.env.ORGANIZER_PASSWORD);
  await Promise.all([o.waitForURL(u => !u.toString().includes('signin')), o.click('button[type=submit]')]);
  const slug = 'panel-conference-itf-' + Date.now();
  const ev = await (await o.request.post(B + '/api/organizer/events', { data: { title: 'Panel conférence ITF 2026 (test)', slug, startDate: '2026-11-12T09:00:00.000Z', location: 'Salle plénière', isPublic: true, isActive: true } })).json();
  ok(!!ev.id, 'événement de panels créé : ' + ev.title);
  const pn = await (await o.request.post(B + `/api/events/${ev.id}/panels`, { data: { title: 'Panel : financer l’innovation', startTime: '2026-11-12T10:00:00.000Z', speaker: 'Modérateur (test)', location: 'Salle plénière', isActive: true } })).json();
  const panel = pn.panel ?? pn; ok(!!panel.id, 'panel ajouté à l’événement');
  const poll = await (await o.request.post(B + `/api/events/${ev.id}/polls`, { data: { question: 'Le panel vous a-t-il été utile ?', panelId: panel.id, options: ['Oui', 'Non'] } })).json();
  ok(!!(poll.poll?.id ?? poll.id), 'sondage créé sur le panel');
  const q = await o.request.post(B + `/api/events/${ev.id}/questions`, { data: { content: 'Quels financements pour les startups ?', panelId: panel.id, authorName: 'Visiteur', authorEmail: 'v@ex.com' } });
  ok(q.ok(), 'question du public posée sur le panel (' + q.status() + ')');
  const qs = await (await o.request.get(B + `/api/events/${ev.id}/questions?panelId=${panel.id}`)).json();
  ok(JSON.stringify(qs).includes('financements'), 'question visible côté organisateur');
  for (const path of ['/dashboard/events', `/dashboard/events/${ev.id}`, `/dashboard/events/${ev.id}/program`, `/dashboard/events/${ev.id}/qa`, `/dashboard/events/${ev.id}/polls`, `/dashboard/events/${ev.id}/participants`, `/dashboard/events/${ev.id}/certificates`]) {
    const r = await o.goto(B + path); await o.waitForLoadState('networkidle');
    const err = await o.locator('text=/Application error|Erreur 500|Internal Server Error/').count();
    ok(r.status() === 200 && err === 0, 'page organisateur ' + path.replace(ev.id, '[id]'));
  }
  await o.goto(B + `/dashboard/events/${ev.id}`); await o.waitForLoadState('networkidle'); await o.screenshot({ path: OUT + '/legacy-event.png' });
  const p = await (await b.newContext()).newPage();
  for (const path of [`/e/${slug}`, `/events/${ev.id}/qa`, `/events/${ev.id}/polls`, `/events/${ev.id}/feedback`]) {
    const r = await p.goto(B + path); await p.waitForLoadState('networkidle');
    const err = await p.locator('text=/Application error|Internal Server Error/').count();
    ok(r.status() === 200 && err === 0, 'page publique ' + path.replace(ev.id, '[id]').replace(slug, '[slug]'));
  }
  await p.goto(B + `/e/${slug}`); await p.waitForLoadState('networkidle'); await p.screenshot({ path: OUT + '/legacy-public.png' });
  const sp = await (await o.request.get(B + '/api/events/itf-2026-ansut/panels')).json();
  ok((sp.panels ?? sp).length === 11, 'les 11 séquences du stand sont des panels du même modèle');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1) });
