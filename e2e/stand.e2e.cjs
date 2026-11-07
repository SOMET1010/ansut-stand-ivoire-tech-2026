// Parcours de bout en bout du stand (mode sans IA). Prérequis : serveur lancé, base seedée.
// ORGANIZER_EMAIL/PASSWORD, DG_EMAIL/PASSWORD (compte ADMIN), TOP_QUESTION_ID : node e2e/stand.e2e.cjs [dossier captures]
const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000', P1 = 'itf-2026-ansut-20261107v2-03', OUT = process.argv[2] || '.';
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1 };
async function login(page, email, pw) {
  await page.goto(B + '/auth/signin'); await page.fill('input[type=email]', email); await page.fill('input[type=password]', pw);
  await Promise.all([page.waitForURL(u => !u.toString().includes('/auth/signin'), { timeout: 15000 }).catch(() => {}), page.click('button[type=submit]')]);
}
(async () => {
  const b = await chromium.launch();
  // 1. visiteur inscrit -> pointage QR
  const v = await b.newContext(); const vp = await v.newPage();
  const reg = await (await vp.request.post(B + '/api/events/register', { data: { eventId: 'itf-2026-ansut', email: `e2e${Date.now()}@ex.com`, firstName: 'Awa', lastName: 'Koné', company: 'Orange CI', consent: true } })).json();
  await vp.goto(B + '/'); await vp.evaluate(id => localStorage.setItem('registrationId', id), reg.registrationId);
  await vp.goto(B + '/checkin/' + P1); await vp.waitForSelector('h1:has-text("Présence enregistrée")'); ok(true, 'pointage visiteur inscrit');
  await vp.reload(); await vp.waitForSelector('h1:has-text("Déjà pointé")'); ok(true, 'second pointage = déjà pointé');
  // 2. visiteur anonyme
  const a = await (await b.newContext()).newPage(); await a.goto(B + '/checkin/' + P1);
  await a.fill('input[placeholder="Nom et prénom"]', 'Visiteur Anonyme'); await a.click('button[type=submit]');
  await a.waitForSelector('h1:has-text("Présence enregistrée")'); ok(true, 'pointage anonyme');
  // 3. assistant (sans IA)
  await a.goto(B + '/assistant'); await a.click('text=Quand a lieu le lancement du PASS ?');
  await a.waitForSelector('text=Mode sans IA'); const txt = await a.locator('p.bg-itf-sky').last().innerText();
  ok(/Talk PASS/.test(txt), 'assistant sans IA oriente vers la séquence : ' + txt.slice(0, 90));
  await a.screenshot({ path: OUT + '/assistant.png' });
  // 4. organisateur : rédaction + garde-fous
  const o = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); await login(o, process.env.ORGANIZER_EMAIL, process.env.ORGANIZER_PASSWORD);
  const s = await (await o.request.get(B + '/api/stand/sessions')).json(); ok(s.panels.filter((p) => !p.hidden).length >= 17, s.panels.length + ' séquences, rôle ' + s.role);
  // Partenaire ajouté depuis l'interface sur la séquence de référence
  const created = await (await o.request.post(B + '/api/stand/invitations', { data: { panelId: P1, partnerName: 'COCOVICO ' + Date.now(), contactRole: 'Direction' } })).json();
  const inv = created.invitation;
  const d = await (await o.request.post(B + `/api/stand/invitations/${inv.id}/draft`)).json();
  ok(d.usedAI === false && /COCOVICO/.test(d.invitation.letterDraft) && d.invitation.letterStatus === 'REDIGE', 'courrier rédigé par modèle (' + inv.partnerName + ')');
  ok((await o.request.patch(B + `/api/stand/invitations/${inv.id}`, { data: { dgValidation: 'VALIDE' } })).status() === 403, 'organisateur ne peut pas valider (403)');
  ok((await o.request.patch(B + `/api/stand/invitations/${inv.id}`, { data: { letterStatus: 'ENVOYE' } })).status() === 409, 'envoi refusé avant validation DG (409)');
  await o.goto(B + '/dashboard/stand'); await o.waitForSelector('text=Talk CICN'); await o.screenshot({ path: OUT + '/dash-invitations.png' });
  // 5. DG : valide puis envoie
  const g = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); await login(g, process.env.DG_EMAIL, process.env.DG_PASSWORD);
  ok((await g.request.patch(B + `/api/stand/invitations/${inv.id}`, { data: { dgValidation: 'VALIDE' } })).status() === 200, 'DG valide le courrier');
  const sent = await (await g.request.patch(B + `/api/stand/invitations/${inv.id}`, { data: { letterStatus: 'ENVOYE' } })).json();
  ok(sent.invitation?.letterStatus === 'ENVOYE', 'courrier marqué envoyé après validation');
  const edit = await (await g.request.patch(B + `/api/stand/invitations/${inv.id}`, { data: { letterDraft: d.invitation.letterDraft + '\nPS' } })).json();
  ok(edit.invitation?.dgValidation === 'A_VALIDER', 'modifier un courrier validé le renvoie en validation');
  // 6. présences + bilan
  await g.goto(B + '/dashboard/stand'); await g.click('role=tab[name="Présences"]'); await g.waitForSelector('text=pointage(s)');
  await g.screenshot({ path: OUT + '/dash-presences.png' });
  const r = await (await g.request.get(B + '/api/agents/daily-report?date=2026-11-11')).json();
  const cicn = r.stats.sessions.find((x) => x.title === 'Talk CICN');
  ok(cicn && cicn.attendances >= 2, 'bilan 11/11 : ' + cicn?.attendances + ' visiteurs au Talk CICN');
  const rp = await (await g.request.post(B + '/api/agents/daily-report?date=2026-11-11')).json(); ok(rp.usedAI === false && rp.summary === null, 'bilan sans IA : chiffres seuls, pas de faux texte');
  // 7. modération (sans IA)
  const m = await (await g.request.post(B + '/api/agents/moderation', { data: { panelId: P1 } })).json();
  ok(m.total >= 1 && m.recommended.length >= 1 && (!process.env.TOP_QUESTION_ID || m.recommended[0] === process.env.TOP_QUESTION_ID), 'modération : ' + m.total + ' questions analysées');
  await g.click('role=tab[name="Questions"]'); await g.click('text=Analyser les questions'); await g.waitForSelector('text=À poser en priorité');
  await g.screenshot({ path: OUT + '/dash-questions.png' });
  // 8. sécurité : routes équipe fermées aux anonymes
  ok((await a.request.get(B + '/api/stand/sessions')).status() === 401, 'API équipe refusée sans connexion (401)');
  ok((await a.request.get(B + '/api/stand/leads')).status() === 401, 'contacts refusés sans connexion (401)');
  await g.goto(B + '/dashboard/stand/qr'); await g.waitForSelector('img[alt^="QR code"]'); const nQr = (await (await g.request.get(B + '/api/stand/program')).json()).items.filter((i) => !i.hidden && !i.allDay).length;
  ok((await g.locator('img[alt^="QR code"]').count()) === nQr, nQr + ' QR codes générés (séquences publiées)');
  await g.screenshot({ path: OUT + '/qr.png' });
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1) });
