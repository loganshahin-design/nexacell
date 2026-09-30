// Registo de todos os dados reais usados no projecto. Cada valor tem fonte,
// ligação e data. O que não está aqui é PRESSUPOSTO ou CALCULADO.
export type Source = {
  id: string;
  label: string;
  value: string;
  source: string;
  url: string;
  date: string;
};

export const sources: Record<string, Source> = {
  osmDistrict: {
    id: "osmDistrict",
    label: "Fronteira do distrito de Marracuene",
    value: "Polígono com 1576 vértices (≈ 690 km² calculados)",
    source: "OpenStreetMap, relação 11319964",
    url: "https://www.openstreetmap.org/relation/11319964",
    date: "consultado a 30/09/2026",
  },
  osmMichafutene: {
    id: "osmMichafutene",
    label: "Localidade de Michafutene",
    value: "−25,78434°, 32,58520°",
    source: "OpenStreetMap, nó 561322954",
    url: "https://www.openstreetmap.org/node/561322954",
    date: "consultado a 30/09/2026",
  },
  osmN1: {
    id: "osmN1",
    label: "Traçado da N1 e da Estrada Circular",
    value: "≈ 5,6 km da N1 dentro da zona",
    source: "OpenStreetMap (vias trunk ref=N1)",
    url: "https://www.openstreetmap.org/#map=14/-25.79/32.585",
    date: "consultado a 30/09/2026",
  },
  ineDistrict: {
    id: "ineDistrict",
    label: "Área e população do distrito",
    value: "734 km²; 284 327 hab. (2023); densidade 387,4 hab./km²",
    source: "INE – Estatísticas do Distrito de Marracuene 2019–2023",
    url: "https://ine.gov.mz/documents/20119/271103/Marracuene_Junho2024.pdf",
    date: "publicado em Junho de 2024",
  },
  ineProjection: {
    id: "ineProjection",
    label: "Projecção da população do distrito",
    value: "254 139 (2020) → 305 216 (2025) ⇒ +3,7 %/ano",
    source: "INE – Projecções da População 2017–2050 (Quadro 3.1)",
    url: "https://ine.gov.mz/documents/20119/271103/Marracuene_Junho2024.pdf",
    date: "publicado em Junho de 2024",
  },
  worldpopZone: {
    id: "worldpopZone",
    label: "População estimada dentro da zona (2020)",
    value: "38 632 hab. (bruto); distrito inteiro 286 324 hab.",
    source: "WorldPop Global 2000–2020, grelha de 100 m (API stats)",
    url: "https://www.worldpop.org/methods/populations/",
    date: "consultado a 30/09/2026",
  },
  incmPenetration: {
    id: "incmPenetration",
    label: "Taxa de penetração da telefonia móvel",
    value: "65 % (13 585 907 subscritores)",
    source: "INCM – Autoridade Reguladora das Comunicações",
    url: "https://www.incm.gov.mz/",
    date: "actualizado em Dezembro de 2024",
  },
  incmShare: {
    id: "incmShare",
    label: "Quota de utilizadores por operadora",
    value: "Movitel 56,8 %; Vodacom 42,0 %; Tmcel 1,2 %",
    source: "INCM – 1.º inquérito nacional aos utilizadores (O Económico)",
    url: "https://www.oeconomico.com/movitel-e-lider-das-telecomunicacoes-moveis-em-mocambique/",
    date: "26/05/2023",
  },
  incmThresholds: {
    id: "incmThresholds",
    label: "Classes e meta de cobertura LTE",
    value:
      "RSRP ≥ −85 Boa; −95 a −85 Aceitável; −105 a −95 Má; < −105 Não existe. Meta: RSRP ≥ −105 dBm em 95 % das amostras",
    source:
      "INCM – Relatório de Avaliação da Cobertura 2023 (Tabelas 1 e 2; Decreto 6/2011; Res. BR_3/CA/INCM/2022)",
    url: "https://www.incm.gov.mz/wp-content/uploads/2025/11/Relatorio-Qualidade-de-Servico-de-Telecomunicacoes-2023-Cobertura.pdf",
    date: "medições de 2023",
  },
  incmMarracuene: {
    id: "incmMarracuene",
    label: "Drive test 4G do INCM em Marracuene",
    value:
      "RSRP ≥ −105 dBm: Tmcel 98,9 %, Vodacom 100 %, Movitel 100 % (estradas principais)",
    source: "INCM – Relatório de Avaliação da Cobertura 2023 (Tabelas 8 e 11; Fig. 94)",
    url: "https://www.incm.gov.mz/wp-content/uploads/2025/11/Relatorio-Qualidade-de-Servico-de-Telecomunicacoes-2023-Cobertura.pdf",
    date: "medições de 6–7 de Junho de 2023",
  },
  incm2024: {
    id: "incm2024",
    label: "Qualidade 4G a nível nacional (2024)",
    value:
      "Cobertura 4G conforme em 85 % das áreas (Vodacom, Movitel) e 40 % (Tmcel); nenhuma atinge 99 % de disponibilidade",
    source: "INCM – Relatório de Qualidade dos Serviços 2024 (Carta de Moçambique)",
    url: "https://cartamz.com/destaque/46002/relatorio-de-qualidade-do-incm-revela-avancos-e-desafios-no-sector-das-telecomunicacoes/",
    date: "publicado a 05/09/2025",
  },
  tmcel4g: {
    id: "tmcel4g",
    label: "Lançamento do 4G em Marracuene",
    value: "1.ª fase do 4G da Tmcel: Maputo, Matola e distrito de Marracuene",
    source: "Correio da Manhã",
    url: "https://www.cmjornal.pt/mundo/detalhe/mocambique-telecom-lanca-4g-e-expande-servicos-com-financiamento-da-china",
    date: "24/08/2019",
  },
  ericsson: {
    id: "ericsson",
    label: "Consumo de dados por smartphone (África Subsariana)",
    value: "5,3 GB/mês (2025) → 12 GB/mês (2031) ⇒ +14,6 %/ano",
    source: "Ericsson Mobility Report",
    url: "https://www.ericsson.com/en/press-releases/1/2026/ericsson-mobility-report-sub-saharan-africa-to-see-fastest-5g-subscription-growth",
    date: "2026",
  },
};

// Dados reais do drive test do INCM em Marracuene (Tabela 8), em %.
export const incmMarracuene4G = [
  { operator: "Tmcel", none: 1, poor: 8, fair: 24, good: 66, meets: 98.9 },
  { operator: "Vodacom", none: 0, poor: 0, fair: 6, good: 93, meets: 100 },
  { operator: "Movitel", none: 0, poor: 3, fair: 18, good: 80, meets: 100 },
];

// Referências técnicas dos modelos.
export const references = [
  "COST Action 231 – Digital mobile radio towards future generation systems, Final Report (1999), cap. 4: modelo COST-231 Hata.",
  "M. Hata, “Empirical formula for propagation loss in land mobile radio services”, IEEE Trans. Veh. Technol., 1980.",
  "3GPP TR 36.814 v9.2.0, Tabela A.2.1.1-2: diagrama de radiação da antena sectorial.",
  "3GPP TS 36.211: estrutura de recursos LTE (12 subportadoras por bloco de recursos).",
  "H. Holma, A. Toskala, LTE for UMTS, 2.ª ed., Wiley, 2011, cap. 9: orçamento de enlace e área do site.",
  "ITU-R P.525: perda em espaço livre.",
];
