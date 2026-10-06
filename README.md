# NexaCell — Dimensionamento de uma rede 4G LTE em Marracuene

Projecto da disciplina de **Comunicações Móveis** (ponto 6, "Projecto de um sistema de CM").

**Grupo:** Fahima Samsudin, Muhammad Shahin, Saudah Salim.

## Objectivo

Dimensionar a rede 4G LTE de um operador para a zona de expansão de **Michafutene (corredor da N1), distrito de Marracuene**, para o ano de **2030**, cumprindo a meta do INCM de RSRP ≥ −105 dBm em 95 % da área. A aplicação calcula cada etapa do dimensionamento a partir de dados reais (INE, INCM, WorldPop, OpenStreetMap) e mostra os resultados em mapas, gráficos e num relatório A4.

## Executar

Requisitos: Node.js 20 ou superior.

```sh
npm install          # instala as dependências e copia o worker do MapLibre para public/maplibre
npm run dev          # aplicação em http://localhost:3000
npm test             # testes das fórmulas
npm run typecheck    # verificação de tipos (TypeScript)
```

Testes no navegador (Playwright), com a aplicação a correr:

```sh
npx playwright install chromium
npm run test:e2e
```

Em **Relatórios**, "Imprimir / guardar PDF" gera o relatório A4 com os parâmetros, os resultados e as fontes. "Repor valores de origem" volta aos valores do projecto.

## Etapas da aplicação

| Etapa | Ponto | O que calcula |
|---|---|---|
| Zona e dados | 6 | Zona de estudo, população (WorldPop calibrado ao INE) e dados reais com fonte |
| Tráfego | 6.1.1 | Utilizadores 4G, tráfego na hora de pico e BTS pela capacidade |
| Dimensionamento | 6.1.2 | Orçamento de ligação, perda máxima (MAPL), modelo COST-231 Hata, raio da célula e BTS pela cobertura |
| Frequências | 6.1.3 | Reutilização de frequências (N = 1, 3, 4, 7), D/R e C/I |
| Estações | 6.1.4 | Localização das BTS na zona (algoritmo de Lloyd) |
| Cobertura | 6.1.5 | Mapa de RSRP ponto a ponto, classes do INCM e critério de projecto |
| Percurso | 6.1.6 | Teste de percurso previsto ao longo da N1 e comparação com as medições do INCM |
| Antenas | 6.2 | Tipos de antena, vantagens e aplicações; λ, PIRE, ganho, diagramas e escolha do tilt |
| Relatórios | — | Decisão, comparação de cenários, conclusões e relatório A4 |

Cada parâmetro tem uma etiqueta de origem: **Real** (com fonte), **Pressuposto** (valor típico, justificado) ou **Calculado**. O modo **Detalhado** mostra os parâmetros avançados e as fórmulas com os valores substituídos.

## Principais resultados

| Indicador | Valor |
|---|---|
| Procura na hora de pico (2030) | 608 Mbit/s |
| BTS pela capacidade / pela fórmula da área / pelo mapa | 10 / 7 / 9 |
| **BTS necessárias** | **10** (decide a capacidade) |
| Raio da célula | 1,04 km (MAPL 124,9 dB, Hata suburbano) |
| Área com RSRP ≥ −93,7 dBm (critério de projecto) | 97,8 % |
| Área com RSRP ≥ −105 dBm (critério do INCM) | 100 % |
| Antenas | Painel sectorial MIMO 2×2, 65° × 7°, 18 dBi, 3 por BTS, a 30 m, tilt 4° |
| PIRE por sector | 62 dBm |

## Estrutura do código

- `calculations/` — funções de cálculo, sem interface: `network.ts` (tráfego, Erlang B, capacidade, orçamento de ligação), `propagation.ts` (COST-231 Hata, espaço livre, RSRP por elemento de recurso), `antenna.ts` (diagrama 3GPP, tilt, PIRE), `coverage.ts` (mapa de RSRP e teste de percurso), `dimension.ts` (número de BTS pelos três critérios), `reuse.ts`, `placement.ts`, `geo.ts`. Testes em `network.test.ts`.
- `data/` — `zones.ts` (polígono e N1 reais do OpenStreetMap), `sources.ts` (registo das fontes), `defaults.ts` (valores do projecto e descrição de cada parâmetro), `steps.ts`, `intro.ts`.
- `components/steps/` — um componente por etapa; `components/shell/` — menu e barra superior; `components/Report.tsx` — relatório A4; `components/Compare.tsx` — comparação de cenários.
- `components/intro/` — ecrã de entrada e animação de aproximação a Michafutene; `components/three/` e `components/map/` — vistas 3D.
- `hooks/useProject.tsx` — estado da aplicação, guardado no navegador (`localStorage`).
- `tests/` — testes no navegador (Playwright).

## Fontes de dados

- **INE** — população do distrito de Marracuene (2020 e 2025) e taxa de crescimento.
- **INCM** — penetração móvel, quotas dos operadores, classes de RSRP e medições de 4G em Marracuene (2023).
- **WorldPop** — distribuição da população (2020, grelha de 100 m).
- **OpenStreetMap** — fronteira do distrito, localidade de Michafutene e traçado da N1.
- **Ericsson Mobility Report** — consumo de dados por utilizador e crescimento.

Cada valor, com ligação e data de consulta, está em `data/sources.ts` e no relatório.

Imagens da animação de entrada: Esri World Imagery (Esri, Maxar, Earthstar Geographics); Sentinel-2 cloudless da EOX IT Services (contém dados Copernicus Sentinel modificados, 2020); NASA Visible Earth, Blue Marble (domínio público).

## Limitações

- O modelo de Hata não usa o relevo nem os edifícios reais e, abaixo de 1 km, é uma extrapolação.
- A população é considerada uniforme dentro da zona.
- As BTS existentes dos operadores não entram no modelo, porque as suas posições não são públicas.
- O teste de percurso é uma previsão do modelo, não uma medição no terreno.

## Referências

COST 231 Final Report (1999); M. Hata, "Empirical formula for propagation loss in land mobile radio services" (1980); 3GPP TR 36.814 e TS 36.211; H. Holma e A. Toskala, *LTE for UMTS* (2011); ITU-R P.525.
