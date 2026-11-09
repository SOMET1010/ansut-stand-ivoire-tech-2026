// Menus : menu public complet sur toutes les pages (ordinateur + tiroir téléphone), menu équipe selon le rôle.
// ORGANIZER_EMAIL/PASSWORD, DG_EMAIL/PASSWORD : node e2e/menus.e2e.cjs [dossier captures]
const { chromium, devices } = require('playwright')
const B = process.env.BASE_URL || 'http://localhost:3000', OUT = process.argv[2] || '.'
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1 }
;(async () => {
  const b = await chromium.launch()
  const want = ['Accueil', 'Programme', 'S’inscrire', 'Jouer', 'Assistant', 'Espace équipe']
  const d = await (await b.newContext({ viewport: { width: 1366, height: 800 } })).newPage()
  for (const p of ['/', '/program', '/register', '/jouer', '/assistant', '/checkin/itf-2026-ansut-itf26-01']) {
    await d.goto(B + p, { waitUntil: 'networkidle' })
    const nav = await d.locator('nav[aria-label="Navigation principale"]').first().innerText()
    ok(want.every((w) => nav.includes(w)), `ordinateur ${p} : menu complet`)
  }
  await d.goto(B + '/'); await d.screenshot({ path: OUT + '/menu-ordinateur.png', clip: { x: 0, y: 0, width: 1366, height: 120 } })
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage()
  for (const p of ['/', '/assistant', '/jouer']) {
    await m.goto(B + p, { waitUntil: 'networkidle' })
    await m.click('button[aria-label="Ouvrir le menu"]')
    const nav = await m.locator('nav[aria-label="Navigation principale"]:visible').innerText()
    ok(want.every((w) => nav.includes(w)), `téléphone ${p} : menu complet dans le tiroir`)
    if (p === '/') await m.screenshot({ path: OUT + '/menu-telephone.png' })
  }
  await m.click('nav[aria-label="Navigation principale"]:visible >> text=Programme'); await m.waitForURL('**/program')
  ok(!(await m.locator('nav[aria-label="Navigation principale"]:visible').count()), 'téléphone : le tiroir se referme après navigation')
  for (const [email, pw, label] of [[process.env.ORGANIZER_EMAIL, process.env.ORGANIZER_PASSWORD, 'équipe'], [process.env.DG_EMAIL, process.env.DG_PASSWORD, 'DG']]) {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage()
    await p.goto(B + '/auth/signin'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
    await Promise.all([p.waitForURL('**/dashboard/stand'), p.click('button[type=submit]')])
    const side = await p.locator('nav').first().innerText()
    ok(side.includes('QR codes de pointage') && side.includes('Animations'), `${label} : QR codes et Animations dans le menu équipe`)
    ok(label === 'DG' ? side.includes('Utilisateurs') && side.includes('Tous les événements') : !side.includes('Utilisateurs'), `${label} : entrées DG ${label === 'DG' ? 'présentes' : 'absentes'}`)
    await p.screenshot({ path: `${OUT}/menu-equipe-${label}.png`, clip: { x: 0, y: 0, width: 260, height: 900 } })
    if (label === 'DG') { await p.click('text=Utilisateurs'); await p.waitForURL('**/admin/users'); ok(true, 'DG : Utilisateurs accessible depuis le menu') }
    await p.goto(B + '/'); const nav = await p.locator('nav[aria-label="Navigation principale"]').first().innerText()
    ok(nav.includes('Espace équipe'), `${label} connecté : lien Espace équipe sur le site public`)
  }
  await b.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
