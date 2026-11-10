// Tester sikkerhetsreglene i firestore.rules mot Firestore-emulatoren.
// Kjør: npm run test:regler
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

let env;
const F = 'fam1';
const TOKEN = 'a'.repeat(48);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'ukepenger-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const som = (uid) => env.authenticatedContext(uid).firestore();

async function opprettFamilie(uid = 'pappa') {
  const db = som(uid);
  const b = writeBatch(db);
  b.set(doc(db, 'familier', F), { navn: 'Test', opprettetAv: uid });
  b.set(doc(db, 'familier', F, 'voksne', uid), { visningsnavn: 'Pappa', pinSalt: 's', pinHash: 'h', bilde: null });
  b.set(doc(db, 'brukere', uid), { familieId: F });
  return b.commit();
}

async function lagInvitasjon(utloperMs = Date.now() + 2 * 3600 * 1000 - 30000) {
  return setDoc(doc(som('pappa'), 'invitasjoner', TOKEN), {
    familieId: F,
    opprettetAv: 'pappa',
    utloper: Timestamp.fromMillis(utloperMs),
    brukt: null,
    bruktAv: null,
  });
}

function bliMed(uid, token = TOKEN) {
  const db = som(uid);
  const b = writeBatch(db);
  b.set(doc(db, 'familier', F, 'voksne', uid), { visningsnavn: uid, pinSalt: 's', pinHash: 'h', bilde: null, invitasjon: token });
  b.update(doc(db, 'invitasjoner', token), { brukt: Timestamp.now(), bruktAv: uid });
  b.set(doc(db, 'brukere', uid), { familieId: F });
  return b.commit();
}

test('den som oppretter familien blir voksen i den', async () => {
  await assertSucceeds(opprettFamilie());
  await assertSucceeds(getDoc(doc(som('pappa'), 'familier', F)));
});

test('utenforstående kan ikke lese eller skrive familiens data', async () => {
  await opprettFamilie();
  await assertSucceeds(setDoc(doc(som('pappa'), 'familier', F, 'barn', 'b1'), { navn: 'Emma' }));
  await assertFails(getDoc(doc(som('fremmed'), 'familier', F)));
  await assertFails(getDoc(doc(som('fremmed'), 'familier', F, 'barn', 'b1')));
  await assertFails(setDoc(doc(som('fremmed'), 'familier', F, 'utforelser', 'u1'), { status: 'godkjent' }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'familier', F, 'barn', 'b1')));
});

test('utenforstående kan ikke gjøre seg selv til voksen uten invitasjon', async () => {
  await opprettFamilie();
  await assertFails(setDoc(doc(som('fremmed'), 'familier', F, 'voksne', 'fremmed'), { visningsnavn: 'x' }));
});

test('kan ikke overta en eksisterende familie ved å late som man opprettet den', async () => {
  await opprettFamilie();
  await assertFails(updateDoc(doc(som('pappa'), 'familier', F), { opprettetAv: 'fremmed' }));
  const db = som('fremmed');
  const b = writeBatch(db);
  b.set(doc(db, 'familier', F), { navn: 'Test', opprettetAv: 'fremmed' });
  b.set(doc(db, 'familier', F, 'voksne', 'fremmed'), { visningsnavn: 'x' });
  await assertFails(b.commit());
});

test('gyldig invitasjon kan brukes én gang', async () => {
  await opprettFamilie();
  await assertSucceeds(lagInvitasjon());
  await assertSucceeds(bliMed('mamma'));
  await assertSucceeds(getDoc(doc(som('mamma'), 'familier', F)));
  await assertFails(bliMed('tredje'));
});

test('utløpt invitasjon kan ikke brukes', async () => {
  await opprettFamilie();
  await assertSucceeds(lagInvitasjon(Date.now() - 1000));
  await assertFails(bliMed('mamma'));
});

test('invitasjon kan ikke vare lenger enn 2 timer', async () => {
  await opprettFamilie();
  await assertFails(lagInvitasjon(Date.now() + 3 * 3600 * 1000));
});

test('bare medlemmer kan lage invitasjon', async () => {
  await opprettFamilie();
  await assertFails(
    setDoc(doc(som('fremmed'), 'invitasjoner', TOKEN), {
      familieId: F,
      opprettetAv: 'fremmed',
      utloper: Timestamp.fromMillis(Date.now() + 3600 * 1000),
      brukt: null,
      bruktAv: null,
    }),
  );
});

test('en voksen kan ikke endre en annen voksens PIN', async () => {
  await opprettFamilie();
  await lagInvitasjon();
  await bliMed('mamma');
  await assertFails(updateDoc(doc(som('mamma'), 'familier', F, 'voksne', 'pappa'), { pinHash: 'x' }));
  await assertSucceeds(updateDoc(doc(som('mamma'), 'familier', F, 'voksne', 'mamma'), { pinHash: 'x' }));
});

// --- Pause mellom avkrysninger ---

function kryss(id, { barnId = 'b1', oppgaveId = 'o1', utenSperre = false } = {}) {
  const db = som('pappa');
  const b = writeBatch(db);
  b.set(doc(db, 'familier', F, 'utforelser', id), { barnId, oppgaveId, status: 'venter', belopOre: 2000 });
  if (!utenSperre) {
    b.set(doc(db, 'familier', F, 'sperrer', `${barnId}_${oppgaveId}`), { barnId, oppgaveId, utforelseId: id, sist: serverTimestamp() });
  }
  return b.commit();
}

async function medOppgave(pauseMin) {
  await opprettFamilie();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'familier', F, 'oppgaver', 'o1'), { tittel: 'Støvsuget', belopOre: 2000, ...(pauseMin == null ? {} : { pauseMin }) }),
  );
}

async function settSistKryss(minSiden, utforelseId = 'gammel') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'familier', F, 'utforelser', utforelseId), { barnId: 'b1', oppgaveId: 'o1', status: 'venter' });
    await setDoc(doc(db, 'familier', F, 'sperrer', 'b1_o1'), {
      barnId: 'b1',
      oppgaveId: 'o1',
      utforelseId,
      sist: Timestamp.fromMillis(Date.now() - minSiden * 60000),
    });
  });
}

test('avkrysning uten å oppdatere pausen avvises', async () => {
  await medOppgave();
  await assertFails(kryss('u1', { utenSperre: true }));
  await assertSucceeds(kryss('u1'));
});

test('samme oppgave kan ikke krysses av igjen før 5 minutter har gått', async () => {
  await medOppgave();
  await assertSucceeds(kryss('u1'));
  await assertFails(kryss('u2'));
  await assertSucceeds(kryss('u3', { barnId: 'b2' })); // et annet barn er ikke sperret
});

test('etter pausen går det fint, og pausen kan justeres per oppgave', async () => {
  await medOppgave();
  await settSistKryss(6);
  await assertSucceeds(kryss('u1'));

  await env.clearFirestore();
  await medOppgave(30);
  await settSistKryss(10);
  await assertFails(kryss('u1'));

  await env.clearFirestore();
  await medOppgave(0);
  await assertSucceeds(kryss('u1'));
  await assertSucceeds(kryss('u2'));
});

test('pausen kan bare fjernes når avkrysningen er angret', async () => {
  await medOppgave();
  await assertSucceeds(kryss('u1'));
  await assertFails(deleteDoc(doc(som('pappa'), 'familier', F, 'sperrer', 'b1_o1')));
  const db = som('pappa');
  const b = writeBatch(db);
  b.delete(doc(db, 'familier', F, 'utforelser', 'u1'));
  b.delete(doc(db, 'familier', F, 'sperrer', 'b1_o1'));
  await assertSucceeds(b.commit());
  await assertSucceeds(kryss('u2'));
});

test('en voksen kan registrere direkte uten pause', async () => {
  await medOppgave();
  await assertSucceeds(kryss('u1'));
  await assertSucceeds(setDoc(doc(som('pappa'), 'familier', F, 'utforelser', 'r1'), { barnId: 'b1', oppgaveId: 'o1', status: 'godkjent' }));
});

// ---------------------------------------------------------------------------
// Gjøremål
// ---------------------------------------------------------------------------

const gjoremal = (over = {}) => ({
  tittel: 'Bytte til vinterdekk',
  beskrivelse: null,
  frist: '2026-11-14',
  fristKl: null,
  gjentas: null,
  fullfort: null,
  fullfortAv: null,
  opprettet: '2026-11-10T17:00:00.000Z',
  opprettetAv: 'pappa',
  nesteId: null,
  ...over,
});
const gRef = (db, id) => doc(db, 'familier', F, 'gjoremal', id);

test('voksne i familien kan lage, lese og slette gjøremål', async () => {
  await opprettFamilie();
  await assertSucceeds(setDoc(gRef(som('pappa'), 'g1'), gjoremal()));
  await assertSucceeds(getDoc(gRef(som('pappa'), 'g1')));
  await assertSucceeds(deleteDoc(gRef(som('pappa'), 'g1')));
});

test('utenforstående kommer ikke til gjøremålene', async () => {
  await opprettFamilie();
  await setDoc(gRef(som('pappa'), 'g1'), gjoremal());
  await assertFails(getDoc(gRef(som('fremmed'), 'g1')));
  await assertFails(setDoc(gRef(som('fremmed'), 'g2'), gjoremal({ opprettetAv: 'fremmed' })));
  await assertFails(deleteDoc(gRef(som('fremmed'), 'g1')));
});

test('gjøremål må ha gyldige felt', async () => {
  await opprettFamilie();
  const db = som('pappa');
  await assertFails(setDoc(gRef(db, 'a'), gjoremal({ tittel: '  ' })));
  await assertFails(setDoc(gRef(db, 'b'), gjoremal({ frist: '14.11.2026' })));
  await assertFails(setDoc(gRef(db, 'c'), gjoremal({ gjentas: 'time' })));
  await assertFails(setDoc(gRef(db, 'd'), gjoremal({ opprettetAv: 'mamma' })));
  await assertFails(setDoc(gRef(db, 'e'), gjoremal({ bilde: 'x' })));
  await assertFails(setDoc(gRef(db, 'f'), gjoremal({ frist: null, fristKl: '14:00' })));
  await assertSucceeds(setDoc(gRef(db, 'g'), gjoremal({ fristKl: '14:00', gjentas: 'maned', beskrivelse: 'Verkstedet' })));
});

test('den som krysser av, står som den som fullførte', async () => {
  await opprettFamilie();
  await setDoc(gRef(som('pappa'), 'g1'), gjoremal());
  await assertFails(updateDoc(gRef(som('pappa'), 'g1'), { fullfort: '2026-11-11T08:00:00Z', fullfortAv: 'mamma' }));
  await assertSucceeds(updateDoc(gRef(som('pappa'), 'g1'), { fullfort: '2026-11-11T08:00:00Z', fullfortAv: 'pappa' }));
});

function fullforMedKopi(uid, kopiId) {
  const db = som(uid);
  const b = writeBatch(db);
  b.set(gRef(db, kopiId), gjoremal({ frist: '2026-12-14', gjentas: 'maned', opprettetAv: uid }));
  b.update(gRef(db, 'g1'), { fullfort: '2026-11-11T08:00:00Z', fullfortAv: uid, nesteId: kopiId });
  return b.commit();
}

test('gjentakende gjøremål får bare én ny kopi, selv om to krysser av', async () => {
  await opprettFamilie();
  await lagInvitasjon();
  await bliMed('mamma');
  await setDoc(gRef(som('pappa'), 'g1'), gjoremal({ gjentas: 'maned' }));
  await assertSucceeds(fullforMedKopi('pappa', 'g2'));
  await assertFails(fullforMedKopi('mamma', 'g3'));
});

test('å angre fjerner kopien, og koblingen kan bare fjernes sammen med kopien', async () => {
  await opprettFamilie();
  await setDoc(gRef(som('pappa'), 'g1'), gjoremal({ gjentas: 'maned' }));
  await fullforMedKopi('pappa', 'g2');
  await assertFails(updateDoc(gRef(som('pappa'), 'g1'), { fullfort: null, fullfortAv: null, nesteId: null }));
  const db = som('pappa');
  const b = writeBatch(db);
  b.delete(gRef(db, 'g2'));
  b.update(gRef(db, 'g1'), { fullfort: null, fullfortAv: null, nesteId: null });
  await assertSucceeds(b.commit());
});
