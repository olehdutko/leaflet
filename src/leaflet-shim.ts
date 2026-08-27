// Shim: use the global Leaflet instance loaded from CDN before the ES module runs
export const L = (window as any).L;
export default L;
