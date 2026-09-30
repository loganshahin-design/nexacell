import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, erlang, fspl, hexArea, wavelength } from "./network";
import { defaults, initialBTS } from "../data/defaults";
test("fórmulas de referência e unidades", () => {
  assert.equal(erlang(13500, 1.2, 120), 540);
  assert.ok(Math.abs(fspl(1, 1800) - 97.545) < 0.001);
  assert.ok(Math.abs(wavelength(1800) - 0.166551) < 0.000001);
  assert.ok(Math.abs(hexArea(1) - 2.598076) < 0.000001);
});
test("cobertura determinística, zero BTS e exclusão de inactivas", () => {
  const a = calculate(defaults, initialBTS);
  assert.deepEqual(a, calculate(defaults, initialBTS));
  assert.equal(calculate(defaults, []).coverage, 0);
  assert.equal(
    calculate(
      defaults,
      initialBTS.map((b) => ({ ...b, enabled: false })),
    ).capacity,
    0,
  );
  assert.ok(a.coverage > 0 && a.coverage <= 100);
  assert.ok(a.overlap <= a.coverage);
});
test("sobreposição não conta área duas vezes e reposicionamento altera resultado", () => {
  const b = initialBTS[0];
  assert.equal(
    calculate(defaults, [b]).coverage,
    calculate(defaults, [b, { ...b, id: "duplicate" }]).coverage,
  );
  assert.equal(calculate(defaults, [{ ...b, lat: 0, lng: 0 }]).coverage, 0);
});
test("capacidade, margens e recomendação respondem às entradas", () => {
  const a = calculate(defaults, initialBTS);
  const b = calculate(
    { ...defaults, power: defaults.power + 3, demand: 20 },
    initialBTS,
  );
  assert.equal(b.margin - a.margin, 3);
  assert.ok(b.required > a.required);
  assert.equal(
    calculate({ ...defaults, reuse: 3 }, initialBTS).capacity,
    a.capacity / 3,
  );
});
