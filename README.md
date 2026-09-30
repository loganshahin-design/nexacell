# NexaCell — Dimensionamento LTE em Marracuene

Aplicação do projecto de **Comunicações Móveis** (ponto 6, "Projecto de um sistema de CM"). Dimensiona uma rede 4G LTE para a **zona de expansão de Michafutene (corredor da N1), distrito de Marracuene**, com dados reais do INE, do INCM, do WorldPop e do OpenStreetMap.

Grupo: Fahima Samsudin, Muhammad Shahin, Saudah Salim.

## Executar

```sh
npm install
npm run dev          # http://localhost:3000
npm test             # testes das fórmulas (11)
npm run test:e2e     # testes no navegador (precisa do servidor a correr)
npm run typecheck
```

No passo **Resumo**, "Imprimir / guardar PDF" gera o relatório A4 com a numeração da docente.

O `npm install` copia automaticamente o *worker* do MapLibre para `public/maplibre/` (script `postinstall`). As fontes (Archivo, Source Sans 3, IBM Plex Mono) vêm em pacotes npm e funcionam sem Internet.

### Para a apresentação

- **Capa com voo de abertura:** a câmara desce sobre Michafutene e as torres acendem uma a uma ("Repetir voo" para mostrar de novo).
- **Apresentar** (na capa ou na barra de cima): ecrã inteiro, um passo de cada vez; **→ / ←** mudam de passo, **Esc** sai.
- **6.1.5 Cobertura:** três vistas — *Mapa 2D*, *Relevo 3D* (a altura das colunas é o sinal) e *Mapa real 3D* (edifícios do OpenStreetMap; precisa de Internet). "Guardar imagem" cria um PNG para o relatório ou os diapositivos.
- **6.1.6 Teste de campo:** "Percorrer a N1" anima o carro de medição e o gráfico ao mesmo tempo.
- **Resumo → Comparar cenários:** hoje contra 2030, 1800 contra 800 MHz, exterior contra dentro de casa.

Todas as animações respeitam a opção "reduzir movimento" do sistema operativo.

---

## Guia do grupo

### A ideia em 30 segundos

Marracuene **já tem 4G** desde 2019, e o INCM mediu em 2023 que as estradas principais estão cobertas (98,9 % a 100 % das amostras com RSRP ≥ −105 dBm). O problema é outro: o distrito cresce 3,7 % ao ano e cada pessoa consome cada vez mais dados. Escolhemos a parte mais densa do distrito, Michafutene junto à N1 (13 km², ≈ 41 mil habitantes, ≈ 3 150 hab./km²), e dimensionámos a rede LTE de um operador para **2030**.

**Resultado com os valores de origem:** são precisas **10 BTS**. A **capacidade** é o critério que limita: só para cobrir a zona bastariam 7. O raio de cada célula é de 1,04 km.

> ⚠️ Não digam que "Marracuene não tem 3G/4G". É falso, e o próprio INCM tem medições que o desmentem.

### O que cada passo faz

| Passo | O que calcula | Como explicar numa frase |
|---|---|---|
| **6 Cenário** | Zona, população, dados reais | "Escolhemos a zona mais densa e que mais cresce; todos os dados reais têm fonte." |
| **6.1.1 Tráfego** | Habitantes → utilizadores 4G → Mbit/s na hora de pico → BTS por capacidade | "Em 2030 a zona precisa de 608 Mbit/s na hora de pico; cada BTS dá 67 Mbit/s úteis, logo 10 BTS." |
| **6.1.2 Área de serviço** | Orçamento de enlace → perda máxima (MAPL) → modelo Hata → raio → BTS por cobertura | "O sinal pode perder até 124,9 dB; pelo modelo Hata isso acontece a 1,04 km; com esse raio bastam 7 BTS para cobrir a zona." |
| **6.1.3 Reuso** | D/R = √(3N), C/I, capacidade para N = 1, 3, 4, 7 | "O LTE usa N = 1: perde C/I mas usa a banda toda; com N = 7 seriam precisas 64 BTS." |
| **6.1.4 Localização** | Coloca as BTS dentro da zona (algoritmo de Lloyd) | "As BTS ficam distribuídas de forma uniforme, a cerca de 1,6 km umas das outras." |
| **6.1.5 Cobertura** | Mapa de RSRP ponto a ponto (Hata + diagrama da antena) | "97,8 % da área cumpre o critério; a meta do INCM é 95 %." |
| **6.1.6 Teste de campo** | Drive test **previsto** ao longo da N1 e comparação com o INCM | "O modelo prevê 100 % das amostras acima de −105 dBm, a mesma ordem do que o INCM mediu (98,9–100 %)." |
| **6.2 Antenas** | Tipos, vantagens e aplicações; λ, PIRE, ganho, tilt óptimo, diagramas | "Usamos painéis sectoriais de 65° e 18 dBi; o tilt óptimo é de 5,1°." |
| **Resumo** | Decisão, conclusões e relatório | — |

### Etiquetas de origem

- **Real**: tem fonte (clique na etiqueta). Exemplos: população (INE/WorldPop), penetração 65 % (INCM), limiar −105 dBm e meta de 95 % (INCM), consumo de 5,3 GB/mês (Ericsson).
- **Pressuposto**: uma escolha nossa, justificada. Exemplos: quota do operador 50 %, 60 % dos clientes com 4G, 46 dBm, 18 dBi.
- **Calculado**: sai das fórmulas.

### Perguntas que a docente pode fazer

- **Porquê o modelo Hata e não o espaço livre?** O espaço livre ignora edifícios e o solo. Daria um raio de 23 km, o que é irrealista. O Hata (COST-231 acima de 1500 MHz) é empírico e foi feito para redes móveis.
- **Porque é que o RSRP usa a potência "por subportadora"?** O RSRP mede uma única subportadora de 15 kHz. 46 dBm repartidos por 1200 subportadoras (20 MHz) dão 15,2 dBm.
- **O que é a margem de sombreamento?** O sinal varia por causa dos obstáculos (σ = 8 dB). Para o sinal ficar acima do limiar em 85 % dos pontos da orla, que corresponde a cerca de 95 % da área, somamos 8,3 dB.
- **E dentro das casas?** Com 12 dB de perdas nas paredes seriam precisas 30 BTS a 1800 MHz. Por isso recomendamos uma camada em 800/900 MHz.
- **Porquê 10 e não 7 BTS?** Sete BTS cobrem a zona, mas não têm capacidade para o tráfego de 2030. Em 2025 bastariam 4.

### Limitações (dizer abertamente)

- O modelo Hata não usa o relevo nem os edifícios reais, e abaixo de 1 km é uma extrapolação.
- A população está distribuída uniformemente dentro da zona.
- As BTS existentes não entram no modelo, porque as suas posições não são públicas.
- **O teste de campo é uma previsão, não uma medição.**

---

## Estrutura do código

- `calculations/` — funções puras e testadas: `network.ts` (tráfego, Erlang B, capacidade, orçamento de enlace, dimensionamento), `propagation.ts` (Okumura/COST-231 Hata, FSPL, RSRP por RE), `antenna.ts` (diagrama 3GPP, tilt, PIRE), `coverage.ts` (mapa RSRP e drive test), `reuse.ts`, `placement.ts`, `geo.ts`.
- `data/` — `zone.ts` (polígono e rota reais do OSM), `sources.ts` (registo de fontes), `defaults.ts` (valores de origem e descrição de cada parâmetro), `steps.ts`.
- `components/steps/` — um ficheiro por passo; `components/shell/` — menu, barra superior e navegação; `components/Report.tsx` — relatório A4.
- `components/motion/` — animações (Motion): número que conta, transição entre passos, funil, cascata do enlace.
- `components/three/Zone3D.tsx` — cena 3D (React Three Fiber); `components/map/RealMap3D.tsx` — mapa real 3D (MapLibre + OpenFreeMap); `components/Compare.tsx` — comparador de cenários.
- `hooks/useProject.tsx` — estado único, guardado no navegador (`localStorage`, chave `nexacell-v2`).

Referências técnicas: COST 231 Final Report (1999); Hata (1980); 3GPP TR 36.814 e TS 36.211; Holma & Toskala, *LTE for UMTS* (2011); ITU-R P.525.
