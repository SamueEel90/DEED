import { Emo } from "@/components/icons";
import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { C, GRAD, glassTmavy, SPACE, RADIUS } from "@/theme";
import { useGaleria } from "@/components/context";
import { CelaGaleria } from "@/components/celaGaleria";
import { pressable } from "@/components/pressable";

// ---- FOTO s fallbackom na emoji ----
// Pipeline: Unsplash URL → srcset 400/800/1200 (mobil neťahá veľký asset) +
// jemný fade-in po načítaní (pozadie kontajnera funguje ako placeholder).
const jeUnsplash = (src?: string) => !!src && src.includes("images.unsplash.com") && /[?&]w=\d+/.test(src);
const unsplashW = (src: string, w: number) => src.replace(/([?&]w=)\d+/, `$1${w}`);

export function Foto({ src, emoji, h, w, radius = 0, style, onClick, sizes, alt, prednost }: { src?: string; emoji?: any; h?: number | string; w?: number | string; radius?: number | string; style?: CSSProperties; onClick?: (e: React.MouseEvent) => void; sizes?: string; alt?: string; prednost?: boolean }) {
  const [err, setErr] = useState(false);
  const [nacitane, setNacitane] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // obrázok z cache je hotový skôr než príde onLoad — nedrž ho neviditeľný
  useEffect(() => { setNacitane(false); if (ref.current?.complete) setNacitane(true); }, [src]);
  if (err || !src) {
    return (
      <div onClick={onClick} style={{ width: w || "100%", height: h, background: "rgba(var(--glass-rgb),.05)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: Math.min((typeof h === "number" ? h : 90) / 3, 30), color: C.textTer, borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined, ...style }}>
        <Emo e={emoji} />
      </div>
    );
  }
  const responzivne = jeUnsplash(src);
  // alt: obsahové fotky posielajú názov príspevku; bez altu = dekoratívne (alt="")
  // prednost (hero v detaile): eager + fetchpriority=high (lepšie LCP) a namiesto
  // fade-in drží plochu rozmazaný LQIP (32px blur verzia) — žiadny biely flash
  return <img ref={ref} src={src} alt={alt ?? ""} onError={() => setErr(true)} onClick={onClick} draggable={false}
    loading={prednost ? "eager" : "lazy"} decoding="async"
    {...(prednost ? ({ fetchpriority: "high" } as Record<string, string>) : {})}
    srcSet={responzivne ? `${unsplashW(src, 400)} 400w, ${unsplashW(src, 800)} 800w, ${unsplashW(src, 1200)} 1200w` : undefined}
    sizes={responzivne ? (sizes ?? "(max-width: 760px) 100vw, 620px") : undefined}
    onLoad={() => setNacitane(true)}
    style={{ width: w || "100%", height: h, objectFit: "cover", display: "block", borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined,
      ...(prednost && responzivne
        ? { backgroundImage: `url(${unsplashW(src, 32)}&blur=100)`, backgroundSize: "cover", backgroundPosition: "center", opacity: 1 }
        : { opacity: nacitane ? 1 : 0.001, transition: "opacity .3s ease" }),
      ...style }} />;
}

export function Avatar({ src, emoji, size, border, aura }: { src?: string; emoji?: any; size?: number; border?: string; aura?: string }) {
  if (!aura) {
    return <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" style={{ border: border || `1px solid ${C.line}` }} />;
  }
  // aura okolo avataru — gold (karma) alebo aurora gradient
  const pozadie = aura === "gold"
    ? "conic-gradient(from 210deg, #F0C75A, #F09A5E, #F5DD9A, #F0C75A)"
    : GRAD;
  const ziara = aura === "gold" ? "0 0 16px rgba(240,199,90,.45)" : "0 0 16px color-mix(in srgb, var(--a-green) 45%, transparent)";
  return (
    <div style={{ width: (size || 0) + 6, height: (size || 0) + 6, borderRadius: RADIUS.round, padding: SPACE.xxs, background: pozadie, boxShadow: ziara, flex: "0 0 auto" }}>
      <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" />
    </div>
  );
}

// klikateľné foto v príspevku — otvorí galériu, ukáže počet fotiek
// disableGaleria=true → klik na foto neotvára galériu, ale prebublá na kartu (otvorí detail skutku/žiadosti)
export function FotoPrispevku({ fotky, emoji, h, w, radius = 0, style, index = 0, disableGaleria, alt, prednost }: { fotky?: string[]; emoji?: any; h?: number | string; w?: number | string; radius?: number | string; style?: CSSProperties; index?: number; disableGaleria?: boolean; alt?: string; prednost?: boolean }) {
  const otvor = useGaleria();
  const viac = fotky && fotky.length > 1;
  return (
    <div style={{ position: "relative", width: w || "100%", height: h, flex: w ? "0 0 auto" : undefined }}>
      <Foto src={fotky && fotky[index]} emoji={emoji} h={h} w={w} radius={radius} style={style} alt={alt} prednost={prednost}
        onClick={disableGaleria ? undefined : (e) => { e.stopPropagation(); if (fotky && fotky.length) otvor(fotky, index); }} />
      {viac && (
        <span style={{ position: "absolute", bottom: 7, right: 7, ...glassTmavy(10, .55), color: "#fff",
          fontSize: 10, fontWeight: 600, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px`, pointerEvents: "none" }}>
          ⧉ {fotky!.length}
        </span>
      )}
    </div>
  );
}

// ---- VIDEO príspevku — poster + ▶, po kliknutí hrá inline s ovládaním ----
export function Video({ src, poster, h = 200, radius = 0, style, badge = true }: { src?: string; poster?: string; h?: number | string; radius?: number | string; style?: CSSProperties; badge?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [start, setStart] = useState(false);

  const spusti = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (v) v.play();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: h, background: "#05070d", borderRadius: radius, overflow: "hidden", ...style }}>
      <video
        ref={ref} src={src} poster={poster} preload="metadata" playsInline controls={start}
        onClick={(e) => e.stopPropagation()}
        onPlay={() => setStart(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#05070d" }}
      />
      {!start && (
        <div {...pressable(spusti as (e: React.MouseEvent | React.KeyboardEvent) => void, "Prehrať video")} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "linear-gradient(0deg, rgba(0,0,0,.42), rgba(0,0,0,.05) 55%)" }}>
          <span style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", paddingLeft: 5, boxShadow: "0 10px 34px rgba(0,0,0,.45)" }}>▶</span>
        </div>
      )}
      {badge && !start && (
        <span style={{ position: "absolute", top: 10, right: 10, ...glassTmavy(10, .55), color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, pointerEvents: "none" }}>▶ video</span>
      )}
    </div>
  );
}

// ---- VIDEO EMBED — YouTube/Vimeo odkazom (spec Formatovanie §9) ----
// Fáza 1: LEN embed — farnosti už YT kanály majú, nič nehostujeme.
// Vloží sa bežný odkaz, appka ukáže prehrávateľné video (nocookie doména).
export function vlozenieVidea(url?: string | null): { embed: string } | null {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { embed: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vim = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (vim) return { embed: `https://player.vimeo.com/video/${vim[1]}` };
  return null;
}

export function VideoEmbed({ url, radius = 12, style }: { url: string; radius?: number | string; style?: CSSProperties }) {
  const v = vlozenieVidea(url);
  if (!v) return null;
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: radius, overflow: "hidden", background: "#05070d", ...style }}>
      <iframe src={v.embed} title="Video" loading="lazy" allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
    </div>
  );
}

// pásik miniatúr pod hlavnou fotkou (detail príspevku)
export function MiniFotky({ fotky }: { fotky?: string[] }) {
  const otvor = useGaleria();
  if (!fotky || fotky.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: SPACE.xs, padding: `${SPACE.xs}px ${SPACE.gutter}px 0`, overflowX: "auto" }}>
      {fotky.map((f, i) => (
        <Foto key={i} src={f} emoji="🖼" h={46} w={62} radius={10}
          onClick={() => otvor(fotky, i)} style={{ border: `1px solid ${C.line}` }} />
      ))}
    </div>
  );
}

// ---- LIGHTBOX — OPRAVY 155/2: jedna galéria na celú obrazovku pre celú appku (CelaGaleria) ----
export function Lightbox({ fotky, index = 0, popisy, onClose }: { fotky: string[]; index?: number; popisy?: (string | undefined)[]; onClose: () => void }) {
  return <CelaGaleria media={fotky.map((src, i) => ({ typ: "foto" as const, src, popis: popisy?.[i] }))} start={index} onClose={onClose} />;
}

