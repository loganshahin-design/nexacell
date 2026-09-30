import { test } from "node:test";
import assert from "node:assert/strict";
import { communityResults, suggestSite, zoneBounds } from "./community";
import { communityDefaults } from "../types/community";
import { defaults, initialBTS } from "../data/defaults";
test("a distribuição conserva os utilizadores e conta custos de BTS inactivas", () => {
  const r = communityResults(defaults, initialBTS, communityDefaults);
  assert.equal(
    r.zones.reduce((s, z) => s + z.users, 0),
    13500,
  );
  assert.equal(r.firstYear, 3 * (2500000 + 3 * 350000 + 200000));
  assert.equal(
    communityResults(
      defaults,
      initialBTS.map((b) => ({ ...b, enabled: false })),
      communityDefaults,
    ).served,
    0,
  );
  assert.equal(communityResults(defaults, [], communityDefaults).gap, 0);
});
test("alterar os pesos conserva o total e ajusta a população da zona", () => {
  const plan = {
    ...communityDefaults,
    zones: communityDefaults.zones.map((z, i) => ({
      ...z,
      weight: i === 0 ? 100 : 1,
    })),
  };
  const r = communityResults(defaults, [], plan);
  assert.ok(Math.abs(r.zones.reduce((s, z) => s + z.users, 0) - 13500) < 1e-8);
  assert.ok(r.zones[0].users > 13000);
});
test("o orçamento impede a proposta e o ganho é reproduzível", () => {
  assert.equal(
    suggestSite(defaults, initialBTS, { ...communityDefaults, budget: 0 })
      .station,
    null,
  );
  const a = suggestSite(defaults, initialBTS, communityDefaults);
  assert.deepEqual(a, suggestSite(defaults, initialBTS, communityDefaults));
  assert.ok(a.gain >= 0);
  if (a.station) {
    const before = communityResults(defaults, initialBTS, communityDefaults),
      after = communityResults(
        defaults,
        [...initialBTS, a.station],
        communityDefaults,
      );
    assert.ok(after.served >= before.served);
    assert.ok(after.remaining >= 0);
  }
});
test("as fronteiras partilhadas não criam sobreposição de zonas", () => {
  const a = zoneBounds(12, communityDefaults, 0),
    b = zoneBounds(12, communityDefaults, 1),
    c = zoneBounds(12, communityDefaults, 2);
  assert.equal(a[1][1], b[0][1]);
  assert.equal(a[0][0], c[1][0]);
});
