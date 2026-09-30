"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import { coverageMap } from "@/calculations/coverage";
import { centroid } from "@/calculations/geo";
import { Callout, Panel, Stat } from "@/components/ui";
import { ZoneMap } from "./Scenario";
import { fmt } from "@/utils/format";

function NumberCell({
  label,
  value,
  placeholder,
  min,
  max,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder?: number;
  min: number;
  max: number;
  onChange: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  useEffect(
    () =>
      setText((t) =>
        (t.trim() === "" ? undefined : Number(t.replace(",", "."))) === value
          ? t
          : value === undefined
            ? ""
            : String(value),
      ),
    [value],
  );
  const parsed = Number(text.replace(",", "."));
  const invalid =
    text.trim() !== "" && !(Number.isFinite(parsed) && parsed >= min && parsed <= max);
  return (
    <input
      aria-label={label}
      aria-invalid={invalid}
      title={invalid ? `Entre ${min} e ${max}` : undefined}
      className={`cell-input ${invalid ? "invalid" : ""}`}
      inputMode="decimal"
      value={text}
      placeholder={placeholder !== undefined ? String(placeholder) : ""}
      onChange={(e) => {
        setText(e.target.value);
        const raw = e.target.value.trim();
        if (raw === "") return onChange(undefined);
        const v = Number(raw.replace(",", "."));
        if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
      }}
      onBlur={() => setText(value === undefined ? "" : String(value))}
    />
  );
}

export default function Sites() {
  const {
    params: p,
    dim,
    stations,
    isAutomatic,
    moveStation,
    addStation,
    updateStation,
    removeStation,
    resetStations,
    mode,
  } = useProject();
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useMemo(
    () => coverageMap(p, stations, zone.polygon, 30),
    [p, stations],
  );
  const active = stations.filter((s) => s.enabled).length;
  const differs = stations.length !== dim.required;
  return (
    <>
      <div className="grid-2 wide-right">
        <div className="stack">
          <Panel title="Estado">
            <div className="stats">
              <Stat label="BTS dimensionadas" value={String(dim.required)} />
              <Stat label="BTS colocadas" value={`${active}`} unit={`de ${stations.length}`} />
              <Stat
                label="Cobertura prevista"
                value={fmt(preview.designCoverage, 1)}
                unit="%"
                note={`meta ${fmt(p.coverageTarget)} % · detalhe em 6.1.5`}
              />
              <Stat label="Distância ideal" value={fmt(dim.spacing, 2)} unit="km" />
            </div>
            {isAutomatic ? (
              <Callout tone="ok">
                As {dim.required} BTS foram distribuídas automaticamente de forma
                uniforme. Arraste-as no mapa para as ajustar.
              </Callout>
            ) : differs ? (
              <Callout tone="warn" title="Número diferente do dimensionado">
                O dimensionamento pede {dim.required} BTS e há {stations.length} no
                mapa.
              </Callout>
            ) : null}
            <div className="button-row">
              <button className="btn" onClick={resetStations} disabled={isAutomatic}>
                <RotateCcw size={16} /> Redistribuir {dim.required} BTS
              </button>
              <button
                className="btn"
                onClick={() => {
                  const c = centroid(zone.polygon);
                  addStation(c[0], c[1]);
                }}
              >
                <Plus size={16} /> Adicionar BTS
              </button>
            </div>
            <p className="field-help">
              No mapa: arraste para mover, clique para seleccionar, duplo clique
              para adicionar uma BTS nesse ponto.
            </p>
          </Panel>
          <Panel title="Como escolhemos os locais">
            <ul className="reasons">
              <li>
                <strong>Método:</strong> as BTS começam espalhadas pela zona e
                cada uma é deslocada para o centro da área que serve (algoritmo de
                Lloyd). O resultado é uma malha quase hexagonal, com cerca de{" "}
                {fmt(dim.spacing, 1)} km entre sites.
              </li>
              <li>
                <strong>Na prática</strong> cada local ainda seria verificado no
                terreno: terreno disponível, energia, acesso, altura do mastro,
                partilha de torres existentes e ligação de transmissão (backhaul).
              </li>
              <li>
                <strong>Sectores:</strong> as linhas laranja mostram a direcção
                dos {p.sectors} sectores de cada BTS (azimute).
              </li>
            </ul>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Mapa das BTS">
            <ZoneMap
              stations={stations}
              sectors={p.sectors}
              sectorLength={dim.link.radius * 0.45}
              circleKm={dim.link.radius}
              editable
              selected={selected}
              onSelect={setSelected}
              onMove={moveStation}
              onAdd={addStation}
              showRoute
              tall
              label="Mapa editável das BTS"
            />
            <p className="caption">
              Círculos: raio de {fmt(dim.link.radius, 2)} km calculado em 6.1.2.
            </p>
          </Panel>
          <Panel title="Lista de BTS">
            <div className="table-wrap">
              <table className="data bts-table">
                <thead>
                  <tr>
                    <th>BTS</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Azimute (°)</th>
                    {mode === "avancado" && (
                      <>
                        <th>Altura (m)</th>
                        <th>Tilt (°)</th>
                        <th>Potência (dBm)</th>
                      </>
                    )}
                    <th>Activa</th>
                    <th>
                      <span className="sr-only">Remover</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((b) => (
                    <tr
                      key={b.id}
                      className={selected === b.id ? "current" : ""}
                      onClick={() => setSelected(b.id)}
                    >
                      <td>
                        <strong>{b.id}</strong>
                      </td>
                      <td>{fmt(b.lat, 5)}</td>
                      <td>{fmt(b.lng, 5)}</td>
                      <td>
                        <NumberCell
                          label={`Azimute de ${b.id}`}
                          value={b.azimuth}
                          min={0}
                          max={359}
                          onChange={(v) => updateStation(b.id, { azimuth: v ?? 0 })}
                        />
                      </td>
                      {mode === "avancado" && (
                        <>
                          <td>
                            <NumberCell
                              label={`Altura de ${b.id}`}
                              value={b.height}
                              placeholder={p.height}
                              min={30}
                              max={200}
                              onChange={(v) => updateStation(b.id, { height: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              label={`Tilt de ${b.id}`}
                              value={b.tilt}
                              placeholder={p.tilt}
                              min={0}
                              max={15}
                              onChange={(v) => updateStation(b.id, { tilt: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              label={`Potência de ${b.id}`}
                              value={b.power}
                              placeholder={p.power}
                              min={20}
                              max={50}
                              onChange={(v) => updateStation(b.id, { power: v })}
                            />
                          </td>
                        </>
                      )}
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${b.id} activa`}
                          checked={b.enabled}
                          onChange={(e) => updateStation(b.id, { enabled: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`Remover ${b.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStation(b.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mode === "avancado" && (
              <p className="field-help">
                Campos vazios usam o valor global (em cinzento).
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
