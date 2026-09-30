import { scenario } from "@/data/scenario";
export default function ScenarioContext() {
  return (
    <section className="panel scenario-context">
      <h3>{scenario.title}</h3>
      <div className="panel-heading">
        <h3>Justificação da Área de Estudo</h3>
        <span className="subtle-tag">SIMULAÇÃO</span>
      </div>
      <p>{scenario.justification}</p>
      <details>
        <summary>Objectivo e origem dos dados</summary>
        <p>{scenario.objective}</p>
        <p>{scenario.provenance}</p>
        <div className="application-tags">
          <span>
            DADOS REAIS · apenas fontes identificadas ou medições inseridas
          </span>
          <span>DADOS DE SIMULAÇÃO · parâmetros do cenário</span>
          <span>DADOS DE DEMONSTRAÇÃO · exemplos de campo</span>
          <span>RESULTADOS CALCULADOS · fórmulas e amostragem</span>
        </div>
        <p>
          Referência geográfica:{" "}
          <a href={scenario.mapSource} target="_blank" rel="noreferrer">
            OpenStreetMap · Marracuene
          </a>
          . Centro confirmado em {scenario.verifiedOn}. A área quadrada é
          configurável e não representa um limite administrativo ou um
          levantamento de expansão urbana. As posições iniciais das BTS e pontos
          de demonstração são construções geométricas de projecto, não
          instalações ou medições observadas.
        </p>
      </details>
    </section>
  );
}
