import katex from "katex";

export const mathNumber = (value: number, digits = 2) =>
  Number(value.toFixed(digits)).toString().replace(".", "{,}");

export function MathExpression({ tex }: { tex: string }) {
  return (
    <div
      className="math-expression"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          displayMode: true,
          output: "htmlAndMathml",
          throwOnError: true,
          trust: false,
        }),
      }}
    />
  );
}

export default function Equation({
  formula,
  substitution,
  result,
  note,
}: {
  formula: string;
  substitution?: string;
  result?: string;
  note?: string;
}) {
  return (
    <div className="equation">
      <MathExpression tex={formula} />
      {substitution && (
        <div className="equation-substitution">
          <MathExpression tex={substitution} />
        </div>
      )}
      {result && (
        <div className="equation-result">
          <span>Resultado</span>
          <strong>{result}</strong>
        </div>
      )}
      {note && <p className="equation-note">{note}</p>}
    </div>
  );
}
