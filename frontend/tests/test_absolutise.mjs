// Standalone JS test of absolutiseMediaUrl logic (mirrored from /app/frontend/src/api/index.ts)
const UPSTREAM_BASE = "https://enterprise-supply-1.emergent.host";
function absolutiseMediaUrl(u) {
  if (!u) return undefined;
  const s = String(u).trim();
  if (s === "") return undefined;
  if (/^(blob:|data:|file:|content:)/i.test(s)) return undefined;
  if (/^(\/tmp\/|\/var\/|\/root\/|\/home\/|\/mnt\/)/.test(s)) return undefined;
  if (s.startsWith(UPSTREAM_BASE)) return s;
  const otherOriginMatch = s.match(/^https?:\/\/[^/]+(\/.*)$/);
  if (otherOriginMatch) {
    const path = otherOriginMatch[1];
    if (path.startsWith("/api/") || path.startsWith("/media/") || path.startsWith("/uploads/")) {
      return `${UPSTREAM_BASE}${path}`;
    }
    return s;
  }
  if (s.startsWith("/")) return `${UPSTREAM_BASE}${s}`;
  return s;
}
const cases = [
  ["/tmp/x.png", undefined],
  ["blob:https://foo", undefined],
  ["data:image/png;base64,xxx", undefined],
  ["file:///etc/passwd", undefined],
  ["/var/foo.jpg", undefined],
  ["/root/x.png", undefined],
  ["/home/user/x.png", undefined],
  ["/mnt/data/x.png", undefined],
  ["/api/media/abc", "https://enterprise-supply-1.emergent.host/api/media/abc"],
  ["https://enterprise-supply-1.emergent.host/api/media/abc", "https://enterprise-supply-1.emergent.host/api/media/abc"],
  ["https://images.unsplash.com/photo-xyz", "https://images.unsplash.com/photo-xyz"],
];
let pass = 0, fail = 0;
for (const [inp, expected] of cases) {
  const got = absolutiseMediaUrl(inp);
  const ok = got === expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}: absolutise(${JSON.stringify(inp)}) => ${JSON.stringify(got)}  (expected ${JSON.stringify(expected)})`);
}
console.log(`\n${pass}/${pass+fail} passed`);
process.exit(fail === 0 ? 0 : 1);
