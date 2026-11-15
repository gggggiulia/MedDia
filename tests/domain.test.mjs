import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/utils/domain.js', import.meta.url), 'utf8'
);

const { parseTimes, dayKey, todayDoses, doseKey } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

test('horários válidos são ordenados; horários inválidos são recusados', () => {
  assert.deepEqual(
    parseTimes('20:00, 08:00,00:00, 23:59'),
    ['00:00', '08:00', '20:00', '23:59']
  );

  for (const value of [
    '', '8:00', '24:00', '12:60', '08:00,', '08:00, 08:00', 'abc',
  ]) {
    assert.throws(() => parseTimes(value));
  }
});

test('a agenda usa a data local na virada do dia', () => {
  assert.equal(dayKey(new Date(2026, 10, 14, 23, 59)), '2026-11-14');
  assert.equal(dayKey(new Date(2026, 10, 15, 0, 0)), '2026-11-15');
});

test('registros não se misturam entre horários, medicamentos e dias', () => {
  const medicines = [
    { id: 'a', times: ['20:00', '08:00'] },
    { id: 'b', times: ['08:00'] },
  ];

  const record = {
    key: doseKey('a', '2026-11-14', '08:00'),
    status: 'taken',
  };

  const doses = todayDoses(
    medicines, [record], new Date(2026, 10, 14)
  );

  assert.equal(doses.length, 3);
  assert.deepEqual(
    doses.map(d => d.time), ['08:00', '08:00', '20:00']
  );
  assert.equal(doses.filter(d => d.record).length, 1);
  assert.equal(doses.find(d => d.record).med.id, 'a');

  assert.equal(
    todayDoses(medicines, [record], new Date(2026, 10, 15))
      .filter(d => d.record).length,
    0
  );
});

test('sem medicamentos, a agenda fica vazia', () => {
  assert.deepEqual(todayDoses([], []), []);
});
