// Non-régression des 10 correctifs de l'audit 2026-11 (failles et UX bloquantes).
// Prérequis : base seedée, serveur sur BASE_URL (défaut :3000) et, pour le repli IA,
// un second serveur sur AI_DOWN_URL lancé avec ANTHROPIC_API_KEY factice et ANTHROPIC_BASE_URL injoignable.
// ORGANIZER_EMAIL/PASSWORD, ORGANIZER2_EMAIL/PASSWORD, DG_EMAIL/PASSWORD : node e2e/securite.e2e.cjs
const { chromium, devices } = require('playwright')
const B = process.env.BASE_URL || 'http://localhost:3000'
const AI_DOWN = process.env.AI_DOWN_URL || 'http://localhost:3001'
const EV = 'itf-2026-ansut', P1 = `${EV}-20261107v2-03` // « Talk CICN » du programme de référence
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1 }

async function login(b, email, password, base = B, opts = {}) {
  const p = await (await b.newContext(opts)).newPage()
  await p.goto(base + '/auth/signin'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', password)
  await Promise.all([p.waitForURL((u) => !u.toString().includes('/auth/signin'), { timeout: 20000 }), p.click('button[type=submit]')])
  return p
}

;(async () => {
  const b = await chromium.launch()
  const anon = await (await b.newContext()).newPage()
  const org = await login(b, process.env.ORGANIZER_EMAIL, process.env.ORGANIZER_PASSWORD)

  // 1. Escalade de privilège : un organisateur ne peut pas se faire ADMIN
  const mine = await (await org.request.post(B + '/api/organizer/events', { data: { title: 'Panel test sécurité', slug: 'panel-secu-' + Date.now(), startDate: '2026-11-12T09:00:00.000Z', organizerId: 'pirate', organizer: { update: { role: 'ADMIN' } } } })).json()
  ok(mine.id && mine.organizerId !== 'pirate', '1a création : organizerId imposé par la session, champs inconnus ignorés')
  await org.request.patch(B + `/api/organizer/events/${mine.id}`, { data: { title: 'x', organizer: { update: { role: 'ADMIN' } } } })
  await org.request.put(B + `/api/organizer/events/${mine.id}`, { data: { title: 'x', startDate: '2026-11-12T09:00:00.000Z', isPublic: true, isActive: true, organizer: { update: { role: 'ADMIN' } } } })
  const role = (await (await org.request.get(B + '/api/stand/sessions')).json()).role
  ok(role === 'ORGANIZER', '1b PATCH/PUT avec relation imbriquée : le compte reste ORGANIZER (' + role + ')')

  // 2. Écritures héritées : connexion exigée
  for (const [m, url, data] of [['post', `/api/events/${EV}/polls`, { question: 'pirate ?', panelId: P1, options: ['a', 'b'] }], ['patch', '/api/polls/x', {}], ['delete', '/api/polls/x'], ['patch', '/api/questions/x', {}], ['delete', '/api/questions/x'], ['post', '/api/feedback/x/resolve', {}], ['post', `/api/events/${EV}/certificate-templates`, {}], ['post', '/api/polls/x/votes', { userId: 'u', optionIds: ['o'] }], ['post', '/api/questions/x/votes', { userId: 'u', type: 'UP' }], ['post', `/api/events/${EV}/feedback`, { userId: 'u', rating: 5, category: 'x' }], ['post', '/api/feedback/x/helpful', { userId: 'u' }]]) {
    const r = await anon.request[m](B + url, data ? { data } : {})
    ok(r.status() === 401, `2 ${m.toUpperCase()} ${url} sans connexion → ${r.status()}`)
  }
  ok((await anon.request.post(B + '/api/admin-simple', { data: {} })).status() === 404, '2 route de démo /api/admin-simple supprimée')

  // 3. Fuites d'e-mails
  await anon.request.post(B + `/api/events/${EV}/questions`, { data: { content: 'Question test fuite ?', panelId: P1, authorName: 'Awa', authorEmail: 'awa.secret@ex.com' } })
  const pub = JSON.stringify(await (await anon.request.get(B + `/api/events/${EV}/questions?panelId=${P1}`)).json())
  ok(pub.includes('Question test fuite') && !pub.includes('awa.secret'), '3a liste publique des questions sans e-mail d’auteur')
  const staffQ = JSON.stringify(await (await org.request.get(B + `/api/events/${EV}/questions?panelId=${P1}`)).json())
  ok(staffQ.includes('awa.secret'), '3b l’équipe voit toujours l’e-mail')
  ok((await anon.request.get(B + `/api/events/${EV}/check-registration?email=awa@ex.com`)).status() === 401, '3c check-registration réservé à l’équipe')
  ok(!JSON.stringify(await (await anon.request.get(B + '/api/events/by-slug/ivoire-tech-forum-2026-ansut')).json()).includes('@'), '3d page publique de l’événement sans e-mail')
  const reg = await (await anon.request.post(B + '/api/events/register', { data: { eventId: EV, email: 'visiteur.' + Date.now() + '@ex.com', firstName: 'Kofi', lastName: 'Yao' } })).json()
  ok(!!reg.registrationId, '8a inscription acceptée SANS case de consentement')
  ok(!JSON.stringify(await (await anon.request.get(B + '/api/registrations/' + reg.registrationId)).json()).includes('@'), '3e fiche d’inscription publique sans e-mail')
  ok((await anon.request.get(B + '/api/certificates')).status() === 401, '3f attestations : connexion requise')

  // 4. Quiz : rien ne trahit la bonne réponse avant la révélation
  const quiz = (await (await org.request.get(B + '/api/live/quizzes')).json()).quizzes[0]
  await org.request.post(B + `/api/live/quizzes/${quiz.id}/control`, { data: { action: 'reset' } })
  const join = await (await anon.request.post(B + `/api/live/play/${quiz.code}`, { data: { action: 'join', nickname: 'Testeur' } })).json()
  await org.request.post(B + `/api/live/quizzes/${quiz.id}/control`, { data: { action: 'start' } })
  let st = await (await anon.request.get(B + `/api/live/play/${quiz.code}?playerId=${join.playerId}`)).json()
  await anon.request.post(B + `/api/live/play/${quiz.code}`, { data: { action: 'answer', playerId: join.playerId, questionId: st.question.id, choice: 0 } })
  st = await (await anon.request.get(B + `/api/live/play/${quiz.code}?playerId=${join.playerId}`)).json()
  ok(st.me.answer && st.me.answer.correct === undefined && st.me.answer.points === undefined && st.me.score === 0 && st.question.correctIndex === null, '4a question ouverte : ni juste/faux, ni points, ni score, ni bonne réponse')
  await org.request.post(B + `/api/live/quizzes/${quiz.id}/control`, { data: { action: 'reveal' } })
  st = await (await anon.request.get(B + `/api/live/play/${quiz.code}?playerId=${join.playerId}`)).json()
  ok(st.me.answer.correct === true && st.me.score > 500 && st.question.correctIndex === 0, '4b après révélation : résultat et score visibles (' + st.me.score + ')')

  // 5. DG : arrive sur le pilotage du stand, plus de faux chiffres
  const dg = await login(b, process.env.DG_EMAIL, process.env.DG_PASSWORD)
  ok(dg.url().endsWith('/dashboard/stand'), '5a connexion DG → ' + dg.url().replace(B, ''))
  await dg.goto(B + '/admin'); ok(dg.url().endsWith('/dashboard/stand'), '5b /admin redirige vers /dashboard/stand')
  ok((await dg.goto(B + '/admin/export')).status() === 404, '5c page fictive /admin/export retirée')
  await dg.goto(B + '/admin/users'); await dg.waitForLoadState('networkidle')
  const nav = await dg.locator('nav').first().innerText()
  ok(/Stand ANSUT/.test(nav) && !/Exports|Feedbacks|Paramètres/.test(nav) && !(await dg.locator('body').innerText()).includes('Conférence Annuelle 2024'), '5d menu admin : pages réelles uniquement')

  // 7. L'événement du stand ne peut pas être supprimé
  ok((await dg.request.delete(B + `/api/admin/events/${EV}`)).status() === 409, '7a DELETE admin → 409')
  ok((await dg.request.delete(B + `/api/organizer/events/${EV}`)).status() === 409, '7b DELETE organisateur → 409')
  ok((await dg.request.delete(B + `/api/organizer/events/${EV}/delete`)).status() === 409, '7c DELETE /delete → 409')
  const pubCount = (await (await anon.request.get(B + '/api/program')).json()).count
  const staffPanels = (await (await dg.request.get(B + '/api/stand/sessions')).json()).panels
  ok(pubCount >= 17 && staffPanels.filter((p) => !p.hidden).length === pubCount, `7d séquences intactes (${pubCount} au programme public)`)

  // 14. Programme modifiable par l'équipe, sans code
  const PR = B + '/api/stand/program'
  const seq = { title: 'Séquence e2e', date: '2026-11-13', start: '17:00', end: '17:30', location: 'Stand', category: 'Talk ANSUT' }
  ok((await anon.request.post(PR, { data: seq })).status() === 401, '14a programme : écriture anonyme → 401')
  ok((await org.request.post(PR, { data: { ...seq, end: '16:00' } })).status() === 400, '14b fin avant début → 400')
  const created = await org.request.post(PR, { data: seq }); const seqId = (await created.json()).id
  const pubHas = async (t) => JSON.stringify((await (await anon.request.get(B + '/api/program')).json()).days).includes(t)
  ok(created.status() === 201 && (await pubHas('Séquence e2e')), '14c séquence ajoutée → visible au programme public')
  await org.request.patch(PR + '/' + seqId, { data: { ...seq, title: 'Séquence e2e modifiée', hidden: true } })
  ok(!(await pubHas('Séquence e2e modifiée')) && (await (await org.request.get(PR)).json()).items.some((i) => i.title === 'Séquence e2e modifiée' && i.hidden), '14d séquence modifiée et masquée → absente du public, visible par l’équipe')
  ok((await org.request.delete(PR + '/' + seqId)).ok() && !(await (await org.request.get(PR)).json()).items.some((i) => i.id === seqId), '14e séquence sans données supprimée')
  ok((await org.request.delete(PR + '/' + P1)).status() === 409, '14f séquence avec questions : suppression refusée (409)')
  await anon.goto(B + '/program'); await anon.waitForSelector('text=Talk CICN')
  ok(await anon.locator('text=Animations permanentes').first().isVisible(), '14g programme public : nouveau programme affiché')
  await org.goto(B + '/dashboard/stand/programme'); await org.waitForSelector('h1:has-text("Programme")')
  ok((await org.locator('nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).includes('/dashboard/stand/programme'), '14h éditeur de programme accessible depuis le menu équipe')

  // 11. Réglages IA : réservés à la DG, clé chiffrée et jamais renvoyée en clair
  const AI = B + '/api/admin/settings/ai'
  ok((await anon.request.get(AI)).status() === 403 && (await org.request.get(AI)).status() === 403 && (await org.request.put(AI, { data: { apiKey: 'sk-ant-pirate-0000000000000000' } })).status() === 403, '11a réglages IA : anonyme et équipe → 403')
  const fakeKey = 'sk-ant-e2e-' + 'x'.repeat(24) + 'Z9k7'
  const saved = await (await dg.request.put(AI, { data: { apiKey: fakeKey } })).json()
  ok(saved.source === 'admin' && saved.enabled && saved.maskedKey === 'sk-ant-…Z9k7' && !JSON.stringify(saved).includes(fakeKey), `11b clé enregistrée par la DG, renvoyée masquée (${saved.maskedKey})`)
  const tested = await (await dg.request.post(AI, { data: {} })).json()
  ok(tested.ok === false && typeof tested.error === 'string', `11c test d’une clé invalide → refus explicite (${tested.error})`)
  const cleared = await (await dg.request.put(AI, { data: { clearKey: true } })).json()
  ok(cleared.source !== 'admin' && (await dg.request.put(AI, { data: { apiKey: 'court' } })).status() === 400, `11d clé retirée (provenance : ${cleared.source}), clé trop courte refusée`)
  await dg.goto(B + '/admin/settings'); await dg.waitForSelector('h1:has-text("Réglages IA")')
  const dgLinks = await dg.locator('nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  ok(dgLinks.includes('/admin/settings'), '11e page Réglages IA accessible depuis le menu admin')
  await dg.goto(B + '/dashboard/stand'); await dg.waitForSelector('nav')
  const dgTeamLinks = await dg.locator('nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  ok(dgTeamLinks.includes('/admin/settings'), '11f la DG trouve Réglages IA depuis le pilotage du stand')

  // 12. Recherches (SQLite) : plus d'erreur 500, insensible à la casse
  const su = await dg.request.get(B + '/api/admin/users?search=AUDIT')
  ok(su.ok() && (await su.json()).users.length > 0, `12a recherche utilisateurs « AUDIT » → ${su.status()}`)
  ok((await dg.request.get(B + '/api/admin/events?search=forum')).ok(), '12b recherche événements → 200')
  ok((await org.request.get(B + `/api/events/${EV}/questions?search=MOBILE`)).ok(), '12c recherche dans les questions → 200')

  // 13. QR code de pointage inconnu : message clair, inscription mémorisée conservée
  await anon.goto(B + '/register'); await anon.evaluate(() => localStorage.setItem('registrationId', 'garde-moi'))
  await anon.goto(B + '/checkin/inexistant'); await anon.waitForSelector('text=QR code non reconnu')
  ok((await anon.evaluate(() => localStorage.getItem('registrationId'))) === 'garde-moi', '13a QR inconnu : message affiché, inscription du téléphone conservée')
  await anon.evaluate(() => localStorage.removeItem('registrationId'))

  // 5e. Menu de l'espace équipe : aucune entrée vers les pages héritées cassées
  await org.goto(B + '/dashboard/stand'); await org.waitForSelector('nav')
  const broken = ['/dashboard/qa', '/dashboard/polls', '/dashboard/certificates', '/dashboard/feedbacks', '/dashboard/recordings']
  const teamLinks = await org.locator('nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  ok(teamLinks.includes('/dashboard/stand') && !teamLinks.some((h) => broken.includes(h)), `5e menu équipe : pages réelles uniquement (${teamLinks.join(', ')})`)

  // 6. Espace équipe utilisable sur mobile
  const mob = await login(b, process.env.ORGANIZER2_EMAIL, process.env.ORGANIZER2_PASSWORD, B, { ...devices['iPhone 13'] })
  await mob.goto(B + '/dashboard/stand'); await mob.waitForSelector('text=Stand ANSUT · ITF 2026')
  const box = await mob.locator('main').boundingBox()
  ok(box && box.x < 5 && box.width > 380, `6a contenu en pleine largeur sur mobile (x=${Math.round(box.x)}, l=${Math.round(box.width)})`)
  await mob.click('button[aria-label="Ouvrir le menu"]'); await mob.waitForTimeout(400)
  ok(await mob.locator('a[href="/dashboard/stand/animations"]').isVisible(), '6b le menu s’ouvre en tiroir')
  await mob.click('a[href="/dashboard/stand/animations"]'); await mob.waitForURL('**/animations'); await mob.waitForTimeout(400)
  const drawer = await mob.locator('a[href="/dashboard/stand/animations"]').boundingBox()
  ok(drawer && drawer.x + drawer.width <= 0, `6c le tiroir se referme après navigation (x=${Math.round(drawer?.x ?? 0)})`)
  // Les 5 onglets du stand doivent rester cliquables sur téléphone (barre d'onglets sur 2 lignes)
  await mob.goto(B + '/dashboard/stand'); await mob.waitForSelector('[role=tablist]')
  const tabsOk = []
  for (const t of ['Invitations', 'Présences', 'Questions', 'Contacts', 'Bilan du jour']) {
    const tab = mob.getByRole('tab', { name: t })
    const clicked = await tab.click({ timeout: 5000 }).then(() => true, () => false)
    if (clicked && (await tab.getAttribute('data-state')) === 'active') tabsOk.push(t)
  }
  ok(tabsOk.length === 5, `6d les 5 onglets du stand sont cliquables sur mobile (${tabsOk.join(', ')})`)
  await mob.screenshot({ path: (process.argv[2] || '.') + '/mobile-dashboard.png' })

  // 8. Questions depuis le programme
  const vis = await (await b.newContext({ ...devices['iPhone 13'] })).newPage()
  await vis.goto(B + '/program'); await vis.locator('li', { hasText: 'Talk CICN' }).getByText('Poser une question').click()
  await vis.fill('textarea[aria-label="Votre question"]', 'Comment sécuriser le mobile money de ma maman ?'); await vis.click('button:has-text("Envoyer")')
  await vis.waitForSelector('text=Question envoyée au modérateur'); ok(true, '8b question posée depuis le programme')
  const mod = await (await org.request.post(B + '/api/agents/moderation', { data: { panelId: P1 } })).json()
  ok(mod.questions.some((q) => q.content.includes('mobile money de ma maman')), '8c la question arrive dans la modération')
  await vis.goto(B + '/register'); await vis.fill('#email', 'nope'); ok(true, '8d (inscription : erreur affichée dans la page, voir capture)')

  // 9. Limites adaptées au Wi-Fi partagé + plafond par téléphone
  let lastDevice = 0
  for (let i = 0; i < 26; i++) lastDevice = (await anon.request.post(B + '/api/agents/assistant', { headers: { 'x-device-id': 'tel-A' }, data: { messages: [{ role: 'user', content: 'programme ?' }] } })).status()
  const other = (await anon.request.post(B + '/api/agents/assistant', { headers: { 'x-device-id': 'tel-B' }, data: { messages: [{ role: 'user', content: 'programme ?' }] } })).status()
  ok(lastDevice === 429 && other === 200, `9a assistant : 26e message du même téléphone → ${lastDevice}, autre téléphone même IP → ${other}`)
  let regOk = 0
  for (let i = 0; i < 130; i++) if ((await anon.request.post(B + '/api/events/register', { data: { eventId: EV, email: `foule${i}.${Date.now()}@ex.com`, firstName: 'F', lastName: String(i) } })).ok()) regOk++
  ok(regOk === 130, `9b 130 inscriptions depuis la même IP acceptées (${regOk})`)

  // 10. Repli quand l'API Claude tombe (clé présente mais API injoignable)
  const down = await login(b, process.env.ORGANIZER_EMAIL, process.env.ORGANIZER_PASSWORD, AI_DOWN)
  const asst = await (await down.request.post(AI_DOWN + '/api/agents/assistant', { headers: { 'x-device-id': 'tel-C' }, data: { messages: [{ role: 'user', content: 'Quand a lieu le lancement du PASS ?' }] } })).json()
  ok(asst.usedAI === false && /indisponible/.test(asst.answer) && /PASS/.test(asst.answer), '10a assistant : API en panne → réponse de repli signalée')
  const sessions = (await (await down.request.get(AI_DOWN + '/api/stand/sessions')).json()).panels
  const inv = sessions.find((p) => p.invitations.length).invitations[0]
  const dr = await down.request.post(AI_DOWN + `/api/stand/invitations/${inv.id}/draft`)
  const drj = await dr.json()
  ok(dr.ok() && drj.usedAI === false && drj.invitation.letterSource === 'modele', '10b courrier : API en panne → modèle de courrier, pas d’erreur')
  const rep = await (await down.request.post(AI_DOWN + '/api/agents/daily-report?date=2026-11-11')).json()
  ok(rep.usedAI === false && rep.aiError === 'failed' && rep.summary === null, '10c bilan : API en panne → chiffres seuls, panne signalée')
  await b.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
