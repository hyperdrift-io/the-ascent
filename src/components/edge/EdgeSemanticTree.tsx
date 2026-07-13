import { buildSceneComposition, getEdgeNodeLabel } from "../../edge-scene";
import type { EdgeViewportState } from "../../edge-navigation";

export function EdgeSemanticTree({
  viewport,
  enter,
  back,
  home,
  select,
}: {
  viewport: EdgeViewportState;
  enter: (nodeId: string) => void;
  back: () => void;
  home: () => void;
  select: (nodeId: string | null) => void;
}) {
  const composition = buildSceneComposition(viewport);

  return (
    <nav className="edge-semantic-tree" aria-label="The Edge depth">
      <div className="edge-lineage" aria-label="Current lineage">
        {viewport.path.map((nodeId, index) => (
          <span key={`${nodeId}-${index}`} aria-current={index === viewport.path.length - 1 ? "location" : undefined}>
            {index > 0 && <i aria-hidden="true">/</i>}
            {getEdgeNodeLabel(nodeId)}
          </span>
        ))}
      </div>

      <div className="edge-depth-controls">
        <button type="button" className="edge-home" onClick={home} disabled={viewport.path.length === 1}>
          Edge
        </button>
        <button type="button" className="edge-back" onClick={back} disabled={viewport.path.length === 1}>
          Back
        </button>
      </div>

      {composition.children.length > 0 && (
        <div className="edge-visible-branches" aria-label={`Branches within ${composition.current.label}`}>
          {composition.children.map((node) => (
            <button
              type="button"
              key={node.id}
              className={viewport.selectedNodeId === node.id ? "selected" : ""}
              aria-label={`Enter ${node.label}`}
              aria-pressed={viewport.selectedNodeId === node.id}
              onFocus={() => select(node.id)}
              onPointerEnter={() => select(node.id)}
              onPointerLeave={() => select(null)}
              onClick={() => enter(node.id)}
            >
              {node.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
