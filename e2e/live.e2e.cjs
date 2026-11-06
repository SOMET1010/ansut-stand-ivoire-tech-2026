// Partie de quiz à 3 téléphones + 4 activités en direct. Prérequis : serveur lancé, seed-animations exécuté.
// ORGANIZER_EMAIL / ORGANIZER_PASSWORD : node e2e/live.e2e.cjs [dossier captures]
const { chromium, devices } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000', OUT = process.argv[2] || '.';
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1 };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const host = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await host.goto(B + '/auth/signin'); await host.fill('input[type=email]', process.env.ORGANIZER_EMAIL); await host.fill('input[type=password]', process.env.ORGANIZER_PASSWORD);
  await Promise.all([host.waitForURL(u => !u.toString().includes('signin')), host.click('button[type=submit]')]);
  const { quizzes } = await (await host.request.get(B + '/api/live/quizzes')).json();
  const quiz = quizzes.find(q => q.title.startsWith('Le stand ANSUT')); ok(!!quiz, 'quiz prêt : ' + quiz.title + ' code ' + quiz.code);
  await host.request.post(B + `/api/live/quizzes/${quiz.id}/control`, { data: { action: 'reset' } });
  await host.goto(B + '/ecran/quiz/' + quiz.id); await host.waitForSelector('text=joueur(s) connecté(s)');

  // 3 joueurs sur téléphone
  const names = ['Awa', 'Koffi', 'Yao'], phones = [];
  for (const n of names) {
    const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
    await p.goto(`${B}/jouer?code=${quiz.code}`); await p.fill('input[placeholder="Votre pseudo"]', n); await p.click('text=Je joue !');
    await p.waitForSelector('text=Vous êtes inscrit·e'); phones.push(p);
  }
  const dup = await phones[0].request.post(`${B}/api/live/play/${quiz.code}`, { data: { action: 'join', nickname: 'Awa' } }); ok(dup.status() === 409, 'pseudo en double refusé');
  await host.waitForSelector('p.text-6xl:has-text("3")'); ok(true, 'écran : 3 joueurs connectés');
  await host.screenshot({ path: OUT + '/quiz-lobby.png' });

  // Question 1 : bonne réponse = "Service Universel" (index 0). Awa vite, Koffi plus tard, Yao faux.
  await host.click('text=Lancer le quiz');
  await phones[0].waitForSelector('text=Service Universel'); await phones[0].screenshot({ path: OUT + '/quiz-phone.png' });
  await phones[0].click('button:has-text("Service Universel")');
  await host.screenshot({ path: OUT + '/quiz-question.png' });
  await sleep(2500); await phones[1].waitForSelector('text=Service Universel'); await phones[1].click('button:has-text("Service Universel")');
  await phones[2].waitForSelector('text=Système Unifié'); await phones[2].click('button:has-text("Système Unifié")');
  const again = await phones[2].request.post(`${B}/api/live/play/${quiz.code}`, { data: { action: 'answer', playerId: await phones[2].evaluate(c => localStorage.getItem('itf-quiz-' + c), quiz.code), questionId: 'x', choice: 0 } });
  ok(again.status() === 409, 'réponse à une autre question refusée');
  await host.waitForSelector('text=3 / 3 réponses'); ok(true, 'écran : 3/3 réponses');
  await host.click('text=Afficher la réponse');
  await phones[0].waitForSelector('text=Bravo'); await phones[2].waitForSelector('text=Raté'); ok(true, 'téléphones : Bravo / Raté affichés');
  await host.screenshot({ path: OUT + '/quiz-reveal.png' });
  const st = await (await host.request.get(B + '/api/live/quizzes/' + quiz.id)).json();
  const sc = Object.fromEntries(st.leaderboard.map(p => [p.nickname, p.score]));
  ok(sc.Awa > sc.Koffi && sc.Koffi >= 500 && sc.Yao === 0, `points à la rapidité : Awa ${sc.Awa} > Koffi ${sc.Koffi} > Yao ${sc.Yao}`);
  ok(st.question.distribution[0] === 2 && st.question.distribution[1] === 1, 'répartition des réponses 2/1');
  // Questions 2-5 sans réponse puis classement final
  for (let i = 2; i <= 5; i++) { await host.click(i === 2 ? 'text=Question suivante' : 'text=Question suivante'); await host.click('text=Afficher la réponse'); }
  await host.click('text=Classement final'); await host.waitForSelector('text=Classement final');
  await phones[0].waitForSelector('text=1'); await phones[0].waitForSelector('text=place'); ok(true, 'fin : place affichée sur le téléphone');
  const rank = await phones[0].locator('p.text-3xl').innerText(); ok(/^1/.test(rank), 'Awa 1re : ' + rank.replace(/\s+/g, ' '));
  await host.screenshot({ path: OUT + '/quiz-final.png' }); await phones[0].screenshot({ path: OUT + '/quiz-phone-final.png' });

  // Activités
  const { activities } = await (await host.request.get(B + '/api/live/activities')).json();
  const by = t => activities.find(a => a.type === t);
  for (const a of activities) await host.request.patch(B + '/api/live/activities/' + a.id, { data: { reset: true, open: true } });
  const words = [['inclusion', 'connexion', 'avenir'], ['Inclusion', 'IA'], ['inclusion', 'connexion']];
  for (let i = 0; i < 3; i++) {
    const p = phones[i];
    await p.goto(`${B}/jouer?code=${by('WORDCLOUD').code}`);
    for (const w of words[i]) { await p.fill('input[placeholder^="Un mot"]', w); await p.click('button:has-text("Envoyer")'); await sleep(300); }
    await p.goto(`${B}/jouer?code=${by('POLL').code}`); await p.click(`button:has-text("${['Cybersécurité', 'Connecter les villages', 'Connecter les villages'][i]}")`); await p.waitForSelector('text=Merci');
    await p.goto(`${B}/jouer?code=${by('SCALE').code}`); await p.click(`button[aria-label="${[5, 4, 5][i]} sur 5"]`); await p.waitForSelector('text=Merci');
    await p.goto(`${B}/jouer?code=${by('OPEN').code}`); await p.fill('textarea', ['Des relais solaires dans chaque village', 'Former des jeunes ambassadeurs', 'Wi-Fi gratuit dans les écoles'][i]); await p.click('button:has-text("Envoyer")'); await sleep(300);
  }
  const vid = await phones[1].evaluate(() => localStorage.getItem('itf-voter'));
  ok((await phones[1].request.post(`${B}/api/live/play/${by('POLL').code}`, { data: { action: 'respond', voterId: vid, value: '0' } })).status() === 409, 'second vote au sondage refusé');
  const r = async t => (await host.request.get(B + '/api/live/activities/' + by(t).id)).json();
  const wc = await r('WORDCLOUD'); ok(wc.data[0].word === 'inclusion' && wc.data[0].count === 3, 'nuage : « inclusion » ×3 en tête (majuscules fusionnées)');
  const poll = await r('POLL'); ok(poll.data[1].count === 2 && poll.data[0].count === 1, 'sondage : villages 2, cyber 1');
  const scale = await r('SCALE'); ok(scale.data.average === 4.7, 'note moyenne 4.7 / 5');
  const open = await r('OPEN'); ok(open.data.length === 3, 'mur : 3 idées');
  for (const t of ['WORDCLOUD', 'POLL', 'SCALE', 'OPEN']) { await host.goto(B + '/ecran/activite/' + by(t).id); await host.waitForTimeout(2500); await host.screenshot({ path: `${OUT}/screen-${t}.png` }); }
  await host.request.patch(B + '/api/live/activities/' + by('OPEN').id, { data: { open: false } });
  const closed = await phones[0].request.post(`${B}/api/live/play/${by('OPEN').code}`, { data: { action: 'respond', voterId: 'test-voter-123', value: 'trop tard' } }); ok(closed.status() === 409, 'activité fermée : réponse refusée');
  const anon = await (await b.newContext()).newPage();
  ok((await anon.request.get(B + '/api/live/quizzes/' + quiz.id)).status() === 401, 'écran animateur interdit sans connexion');
  await anon.goto(B + '/ecran/quiz/' + quiz.id); ok(anon.url().includes('/auth/signin'), 'page écran redirige vers la connexion');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1) });
