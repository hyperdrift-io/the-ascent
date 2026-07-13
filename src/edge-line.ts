export type EdgeLinePoint = { x: number; y: number };

function cubic(t: number, start: number, controlOne: number, controlTwo: number, end: number): number {
  const inverse = 1 - t;
  return inverse ** 3 * start
    + 3 * inverse ** 2 * t * controlOne
    + 3 * inverse * t ** 2 * controlTwo
    + t ** 3 * end;
}

export function getEdgeLinePoint(value: number): EdgeLinePoint {
  const t = Math.max(0, Math.min(100, value)) / 100;
  return {
    x: Number(cubic(t, 1, 20, 82, 99).toFixed(3)),
    y: Number(cubic(t, 10.5, 10.2, 2.4, 0.5).toFixed(3)),
  };
}
