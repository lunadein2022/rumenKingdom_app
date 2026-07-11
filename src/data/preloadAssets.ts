// 왕궁 로비/방 이미지들을 앱 시작 시 미리 불러와 방 이동 시 흰 화면(white-flash) 없이
// 즉시 전환되도록 합니다. 실패해도 앱 동작에는 영향 없는 fire-and-forget 프리로드입니다.
const PALACE_ASSET_PATHS = [
  "/assets/bottom-bar-final.png",
  "/assets/home-bg.webp",
  "/assets/palace-main.webp",
  "/assets/throne.webp",
  "/assets/library.webp",
  "/assets/office.webp",
  "/assets/garden.webp",
  "/assets/bedroom.webp",
  "/assets/princess-full-final.png",
  "/assets/serin-full-transparent.webp",
  "/assets/princess-bust-transparent.webp",
  "/assets/serin-bust-transparent.webp",
];

let hasStarted = false;

export function preloadPalaceAssets(extraPaths: string[] = []) {
  if (hasStarted || typeof window === "undefined") return;
  hasStarted = true;
  const paths = Array.from(new Set([...PALACE_ASSET_PATHS, ...extraPaths]));
  paths.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}
