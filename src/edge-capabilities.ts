type ContextProbe = { getContext(name: string): unknown };

export function supportsWebGL(createProbe: () => ContextProbe = () => document.createElement("canvas")): boolean {
  try {
    const probe = createProbe();
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}
