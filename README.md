# NexaCell

## Marracuene LTE Planning

**Dimensionamento e Análise de uma Rede Móvel 4G LTE numa Área de Expansão Urbana de Marracuene, Província de Maputo.** Rede académica hipotética: o projecto não pressupõe ausência de rede móvel ou 4G na região e não representa nenhuma operadora.

Centro verificado em 26/09/2026 directamente na API OpenStreetMap: [nó 561322955](https://www.openstreetmap.org/node/561322955), latitude −25.739978, longitude 32.676333. A área quadrada é conceptual. BTS e pontos de demonstração são posições geométricas propostas a partir desse centro, nunca coordenadas de instalações reais identificadas. Os valores iniciais de 12 km² e 18 000 habitantes são parâmetros de simulação editáveis, não estatísticas locais.

O cenário usa `nexacell-marracuene-v1` e `nexacell-marracuene-community-v1`. Os dados anteriores permanecem nas respectivas chaves antigas do navegador, sem alteração; medições reais não são deslocadas nem reatribuídas. Utilizadores e login são preservados. O relatório mantém 17 secções, parâmetros actuais, diagrama geométrico e distinção entre resultados calculados, simulação, demonstração e medições declaradas pelos estudantes.

## Acesso e equipa

Entre com o nome completo e o código de acesso: Fahima Samsudin **20220144**, Muhammad Shahin **20240568**, Saudah Salim **20220057**. O botão Utilizadores no menu lateral (ou o avatar no topo) abre a gestão de utilizadores. Qualquer membro autenticado pode adicionar um nome e um código único de oito algarismos, e terminar sessão. Novos utilizadores persistem neste navegador; a sessão persiste apenas na sessão do separador.

Este login é uma **demonstração local**, não autenticação segura: os códigos não são palavras-passe, ficam no armazenamento local e podem ser inspeccionados. Não protege dados de um servidor. Todos os utilizadores partilham o mesmo projecto neste navegador. Para produção, substituir por autenticação e autorização no servidor e base de dados.

## Rede para as pessoas

O novo módulo divide a área em quatro zonas conceptuais, com fronteiras ajustáveis, nome, uso, peso populacional e prioridade editáveis. Os pesos redistribuem os utilizadores globais sem duplicação; assume-se densidade uniforme dentro de cada zona. A cobertura é amostrada em 400 pontos por zona. A diferença entre zonas é a amplitude das coberturas em pontos percentuais, não um índice social validado. Estes resultados complementam o modelo global, que mantém a hipótese uniforme original.

O orçamento usa custos académicos configuráveis em MZN, sem cotações reais. Soma instalação, sectores e operação durante um ano para todas as BTS instaladas, inclusive inactivas. Uma sugestão testa 36 posições candidatas e maximiza o ganho de utilizadores cobertos ponderado pela prioridade, respeitando o saldo do primeiro ano. É uma heurística geométrica, sem garantia RF ou capacidade local. A proposta só pode ser aplicada às entradas para as quais foi calculada.

Pode guardar uma configuração BTS de referência e comparar com a actual usando os mesmos pesos, população e custos actuais. O relatório inclui uma secção comunitária. Os dados deste módulo são guardados separadamente em `nexacell-marracuene-community-v1`.

Aplicação académica de dimensionamento LTE para uma área de expansão urbana/periurbana de Marracuene, Província de Maputo. Next.js, TypeScript, Leaflet, Recharts e Lucide. Interface portuguesa, tema claro/escuro, 11 módulos, persistência local, mapa editável, relatório A4 e representação urbana conceptual em CSS 3D.

## Executar

```sh
npm install
npm run dev
```

Abrir http://localhost:3000. Para produção: `npm run build` e `npm start`. Validação: `npm run typecheck` e `npm test`.

## Utilização

Navegue pela barra lateral. No mapa, arraste BTS, clique para editar ou faça duplo clique para adicionar. Use Camadas para sectores, círculos e pontos de campo. Na simulação, aplique explicitamente parâmetros globais às BTS e execute para obter uma fotografia dos resultados. O relatório usa sempre os parâmetros actuais; Imprimir permite guardar PDF. Configurações permite exportar JSON. Dados guardados no localStorage deste navegador; há identificação local por código, sem backend, autenticação de servidor ou sincronização. A exportação JSON inclui o plano comunitário, mas não os códigos dos utilizadores.

## Modelos e limites

- Voz: A = NCT/3600 em Erlangs. Dados: utilizadores activos × débito por utilizador em Mbps.
- Capacidade: largura de banda MHz × eficiência bit/s/Hz × sectores / reuso. Hipótese agregada, sem escalonador LTE, overhead ou SINR.
- Área útil: área hexagonal × (1 − reserva de sobreposição). BTS necessárias: máximo dos arredondamentos superiores de cobertura e capacidade (3 sectores por nova BTS).
- Cobertura: união dos círculos das BTS activas amostrada numa grelha de 60×60 pontos dentro de uma área quadrada centrada em −25.739978, 32.676333. A área é um cenário configurável, não um limite administrativo. A sobreposição é a fracção amostrada com dois ou mais círculos. Camadas opcionais de sobreposição e ausência de cobertura usam uma grelha visual de 30×30 pontos, sem limiares RF. Distribuição uniforme de utilizadores assumida.
- FSPL: 32,44 + 20 log10(d_km) + 20 log10(f_MHz). Referência: [ITU-R P.525](https://www.itu.int/rec/R-REC-P.525-5-202411-I/en). Perdas de cabo, outras perdas e desvanecimento são separados. Potência recebida total não é RSRP.
- Raio geométrico editável, independente da potência e frequência. Não existe motor RF. Altura, tilt, polarização e beamwidth documentam o projecto sem alterar a cobertura. Não se calcula interferência, RSRP, RSRQ, SINR ou disponibilidade.
- Testes de campo iniciais são demonstrações. Registos manuais só são classificados como reais mediante declaração do utilizador. Sem previsão RSRP, comparação RF directa indisponível.
- Optimização é uma distribuição em grelha, sem estudo RF. Digital Twin é uma representação conceptual CSS, não uma réplica geográfica.
- Perfil horário ilustrativo determinístico. Não existem resultados aleatórios nem dados atribuídos a operadoras.

Os mosaicos OpenStreetMap e as fontes Google precisam de Internet; fontes do sistema servem de fallback. Os dados do projecto são locais. A estrutura segue a documentação de [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation).
