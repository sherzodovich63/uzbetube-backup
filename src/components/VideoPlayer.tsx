"use client";

import Hls from "hls.js";
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Types ---------- */
type SubtitleTrack = { src: string; srclang: string; label: string; default?: boolean };
type SkipMark = { kind: "intro"; start: number; end: number };
type Chapter = { time: number; title?: string };

type BaseProps = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  subtitles?: SubtitleTrack[];
  onFirstPlay?: () => void;
};

type Props = BaseProps & {
  thumbnailsVttUrl?: string;
  chapters?: Chapter[];
  videoId?: string;      // resume uchun
  title?: string;        // Media Session uchun
  skips?: SkipMark[];    // "Skip intro" belgilari
};

/* ---------- Utils ---------- */
const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/* ---------- VTT thumbnails parser ---------- */
type VttCue = { start: number; end: number; url: string; x?: number; y?: number; w?: number; h?: number };
function parseVtt(text: string): VttCue[] {
  const toSec = (t: string) => {
    t = t.replace(",", ".");
    const parts = t.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };
  const cues: VttCue[] = [];
  const blocks = text.split(/\r?\n\r?\n/);
  for (const b of blocks) {
    const lines = b.trim().split(/\r?\n/);
    if (lines.length < 2) continue;
    const timingLine = lines.find(l => l.includes("-->"));
    if (!timingLine) continue;
    const mm = timingLine.match(
      /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)/,
    );
    if (!mm) continue;
    const start = toSec(mm[1]), end = toSec(mm[2]);
    const last = lines[lines.length - 1];
    let url = last, x, y, w, h;
    const xy = last.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
    if (xy) { x = +xy[1]; y = +xy[2]; w = +xy[3]; h = +xy[4]; url = last.split("#")[0]; }
    cues.push({ start, end, url, x, y, w, h });
  }
  return cues;
}

/* ---------- Small UI helpers ---------- */
const Pill = ({ title, onClick, children, active=false }:{
  title?: string; onClick?: ()=>void; children: React.ReactNode; active?: boolean;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={[
      "grid place-items-center rounded-2xl px-3 py-2 text-white",
      "bg-white/10 hover:bg-white/15 active:bg-white/20",
      "border border-white/10 backdrop-blur",
      "transition shadow-sm hover:shadow-md",
      active ? "ring-1 ring-white/40" : ""
    ].join(" ")}
  >
    {children}
  </button>
);

function RowSwitch({label, on, onToggle}:{label:string; on:boolean; onToggle:(v:boolean)=>void}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
      <span className="text-white/90">{label}</span>
      <button
        onClick={()=>onToggle(!on)}
        className={["h-6 w-11 rounded-full transition-colors", on ? "bg-emerald-500/70" : "bg-white/20"].join(" ")}
        aria-label={label}
      >
        <span className={["block h-6 w-6 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0"].join(" ")} />
      </button>
    </div>
  );
}
function RowLink({label, value, onClick}:{label:string; value?:string; onClick:()=>void}) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white/5">
      <span className="text-white/90">{label}</span>
      <span className="text-white/60">{value} <span className="ml-1">›</span></span>
    </button>
  );
}
type SleepOpt = 0 | 15 | 30 | 60;
function RowSelectSleep({value, onChange}:{value:SleepOpt; onChange:(v:SleepOpt)=>void}) {
  const opts: SleepOpt[] = [0,15,30,60];
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
      <span className="text-white/90">Sleep timer</span>
      <div className="flex gap-2">
        {opts.map(m=>(
          <button key={m} onClick={()=>onChange(m)} className={["rounded-lg px-2 py-1 text-xs", value===m?"bg-white/10 ring-1 ring-white/20":"hover:bg-white/5"].join(" ")}>
            {m===0 ? "Off" : `${m}m`}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Audio chain (stable volume) ---------- */
type AudioChain = {
  ctx: AudioContext;
  src: MediaElementAudioSourceNode;
  comp: DynamicsCompressorNode;
  connected: "dry" | "comp";
};

/* ==================== COMPONENT ==================== */
export default function VideoPlayer({
  src, poster, autoPlay, subtitles = [], onFirstPlay,
  thumbnailsVttUrl, chapters = [], videoId, title, skips = [],
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const firstPlayFired = useRef(false);
  const clickTimerRef = useRef<number | null>(null);

  // Durations & state
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [bufferEnd, setBufferEnd] = useState(0);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // UI
  const [uiVisible, setUiVisible] = useState(true);
  const [theater, setTheater] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"root"|"subs"|"speed"|"quality">("root");
  const [ambient, setAmbient] = useState(false);
  const [stableVol, setStableVol] = useState(false);
  const [mini, setMini] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);

  // Playback options
  const [speed, setSpeed] = useState(1);
  const [subsOn, setSubsOn] = useState(true);
  const [sleepOpt, setSleepOpt] = useState<SleepOpt>(0);
  const sleepRef = useRef<number | null>(null);

  // Quality mapping (index↔height)
  const [levelsMap, setLevelsMap] = useState<{index:number;height:number;name?:string}[]>([]);
  const [quality, setQuality] = useState<number | "auto">("auto");

  // chains
  const audioRef = useRef<AudioChain | null>(null);

  /* --------- Fullscreen state --------- */
  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* --------- Auto-hide controls & cursor --------- */
  const hideTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const host = wrapRef.current!;
    const show = () => {
      setUiVisible(true);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setUiVisible(false), 2200);
    };
    show();
    host.addEventListener("mousemove", show);
    host.addEventListener("mouseleave", () => setUiVisible(false));
    return () => {
      host.removeEventListener("mousemove", show);
      host.removeEventListener("mouseleave", () => setUiVisible(false));
      window.clearTimeout(hideTimer.current);
    };
  }, []);
  useEffect(()=>{
    document.body.style.cursor = uiVisible ? "default" : "none";
    return ()=>{ document.body.style.cursor = "default"; };
  },[uiVisible]);

  /* --------- Sticky mini-player --------- */
  useEffect(()=>{
    const el = wrapRef.current;
    if(!el) return;
    const io = new IntersectionObserver(([e])=> setMini(!e.isIntersecting), {threshold:0});
    io.observe(el);
    return ()=>io.disconnect();
  },[]);

  /* --------- HLS init & event wiring --------- */
  useEffect(() => {
    const v = videoRef.current!;
    if (!v) return;

    const onLoaded = () => setDur(v.duration || 0);
    const onTime = () => {
      setCur(v.currentTime || 0);
      try {
        const ranges = v.buffered;
        const end = ranges.length ? ranges.end(ranges.length - 1) : 0;
        setBufferEnd(end);
      } catch {}
      // resume save
      if (videoId && (v.duration || 0) > 30) {
        try { localStorage.setItem(`uzbt:prog:${videoId}`, String(v.currentTime)); } catch {}
      }
    };
    const onPlay = () => {
      setPaused(false);
      if (!firstPlayFired.current) {
        firstPlayFired.current = true;
        onFirstPlay?.();
        // lazy audio chain
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const src = ctx.createMediaElementSource(v);
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -24; comp.knee.value = 30; comp.ratio.value = 12;
          comp.attack.value = 0.003; comp.release.value = 0.25;
          src.connect(ctx.destination);
          audioRef.current = { ctx, src, comp, connected: "dry" };
        } catch {}
      }
    };
    const onPause = () => setPaused(true);
    const onVol = () => { setMuted(v.muted); setVol(v.volume); };
    const onWaiting = () => setWaiting(true);
    const onCanPlay = () => setWaiting(false);

    setErr(null);

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      v.load();
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 120, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.attachMedia(v);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data:any) => {
        const map = data.levels.map((l:any, i:number)=>({index:i, height:l.height, name:l.name}));
        setLevelsMap(map);
        setQuality("auto");
        if (autoPlay) v.play().catch(()=>{});
      });
      hls.on(Hls.Events.ERROR, (_ev, data:any) => {
        setErr(data.details || data.type || "Playback error");
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
          case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
          default: hls.destroy(); break;
        }
      });
    } else {
      v.src = src;
    }

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      if (hlsRef.current) hlsRef.current.destroy();
      if (audioRef.current) { try { audioRef.current.ctx.close(); } catch {} audioRef.current = null; }
      if (sleepRef.current) { window.clearTimeout(sleepRef.current); sleepRef.current = null; }
    };
  }, [src, autoPlay, onFirstPlay, videoId]);

  /* --------- Resume on mount --------- */
  useEffect(() => {
    if (!videoId) return;
    const v = videoRef.current!;
    const saved = Number(localStorage.getItem(`uzbt:prog:${videoId}`) || 0);
    if (saved > 10) {
      const cb = () => { v.currentTime = Math.min(saved, v.duration || saved); v.removeEventListener("canplay", cb); };
      v.addEventListener("canplay", cb);
    }
  }, [videoId]);

  /* --------- Media Session --------- */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !title) return;
    try {
      // @ts-ignore
      navigator.mediaSession.metadata = new window.MediaMetadata({ title });
    } catch {}
  }, [title]);

  /* --------- Hotkeys --------- */
  useEffect(() => {
    const el = wrapRef.current!;
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && !el.contains(active) && active !== document.body) return;
      if (e.key === "k" || e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "j") seek(-10);
      else if (e.key === "l") seek(10);
      else if (e.key === "m") { const v = videoRef.current!; v.muted = !v.muted; }
      else if (e.key.toLowerCase() === "c") toggleSubs();
      else if (e.key === "f") fsToggle();
      else if (e.key === "t") setTheater(t => !t);
      else if (e.key === ">") setPlaybackRate(Math.min(2, +(speed + 0.25).toFixed(2)));
      else if (e.key === "<") setPlaybackRate(Math.max(0.25, +(speed - 0.25).toFixed(2)));
      else if (e.altKey && (e.key === "s" || e.key === "S")) setShowStats(v=>!v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speed]);

  /* --------- Watch milestones --------- */
  const marks = useRef(new Set<number>());
  useEffect(() => {
    if (!dur) return;
    const pct = (cur / dur) * 100;
    [25,50,75,95].forEach(m => {
      if (pct >= m && !marks.current.has(m)) {
        marks.current.add(m);
        // analytics hook joyi
      }
    });
  }, [cur, dur, videoId]);

  /* --------- Actions --------- */
  const togglePlay = () => {
    const v = videoRef.current!;
    const willPlay = v.paused;
    if (willPlay) v.play().catch(()=>{}); else v.pause();
    setFlash(willPlay ? "play" : "pause");
    window.setTimeout(() => setFlash(null), 430);
  };
  const seek = (delta: number) => { const v = videoRef.current!; v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0); };
  const onScrub = (t: number) => { const v = videoRef.current!; v.currentTime = t; setCur(t); };

  const setPlaybackRate = (r: number) => {
    const v = videoRef.current!;
    v.playbackRate = r; setSpeed(r);
    try { localStorage.setItem("player_speed", String(r)); } catch {}
  };
  useEffect(()=>{ try{const s=localStorage.getItem("player_speed"); if(s) setPlaybackRate(Number(s));}catch{} }, []);

  const changeQuality = (q: number | "auto") => {
    setQuality(q); try{localStorage.setItem("player_quality", String(q));}catch{}
    const hls = hlsRef.current; if (!hls) return;
    if (q === "auto") hls.currentLevel = -1;
    else {
      const found = levelsMap.find(l => l.height === q);
      hls.currentLevel = found ? found.index : -1;
    }
  };
  useEffect(()=>{
    try{
      const s=localStorage.getItem("player_quality");
      if(s && levelsMap.length) changeQuality(s==="auto"?"auto":Number(s));
    }catch{}
  }, [levelsMap]);

  const fsToggle = async () => {
    const el = wrapRef.current!;
    if (document.fullscreenElement) { await document.exitFullscreen().catch(()=>{}); }
    else { await el.requestFullscreen().catch(()=>{}); }
  };
  const toggleTheater = () => setTheater(t => !t);
  const pipToggle = async () => {
    const v:any = videoRef.current; if (!v) return;
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    const doc:any = document;
    if (doc.pictureInPictureElement) { try { await doc.exitPictureInPicture(); } catch {}; return; }
    if (v.requestPictureInPicture) {
      try { if (v.paused) await v.play().catch(()=>{}); await v.requestPictureInPicture(); return; } catch {}
    }
    if (typeof v.webkitSetPresentationMode === "function") {
      try {
        const mode = v.webkitPresentationMode;
        v.webkitSetPresentationMode(mode==="picture-in-picture"?"inline":"picture-in-picture");
      } catch {}
    }
  };
  const toggleSubs = () => {
    const v = videoRef.current!;
    const tracks = v.textTracks;
    const next = !subsOn;
    for (let i=0;i<tracks.length;i++) tracks[i].mode = next?"showing":"hidden";
    setSubsOn(next);
  };

  /* --------- Hover thumbnails --------- */
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverT, setHoverT] = useState<number>(0);
  const onBarMove = (e: React.MouseEvent) => {
    const el = barRef.current!; const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left; const pct = Math.min(Math.max(0, x / rect.width), 1);
    setHoverX(x); setHoverT(pct * (dur || 0));
  };
  const onBarLeave = () => setHoverX(null);

  const [thumbs, setThumbs] = useState<VttCue[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!thumbnailsVttUrl) { setThumbs(null); return; }
    fetch(thumbnailsVttUrl).then(r => r.text()).then(t => { if (!cancelled) setThumbs(parseVtt(t)); }).catch(()=>setThumbs(null));
    return () => { cancelled = true; };
  }, [thumbnailsVttUrl]);

  const previewStyle: React.CSSProperties | undefined = useMemo(() => {
    if (!thumbs || hoverX == null) return undefined;
    const cue = thumbs.find(c => hoverT >= c.start && hoverT < c.end);
    if (!cue) return undefined;
    const size = { w: cue.w || 160, h: cue.h || 90 };
    const pos = cue.x != null && cue.y != null ? `${-cue.x}px ${-cue.y}px` : "0 0";
    return {
      width: size.w, height: size.h,
      backgroundImage: `url("${cue.url}")`,
      backgroundSize: "auto",
      backgroundPosition: pos,
      borderRadius: 10,
      boxShadow: "0 6px 20px rgba(0,0,0,.45)",
    };
  }, [thumbs, hoverT, hoverX]);

  const bufferedPct = useMemo(() => (dur ? Math.min(bufferEnd / dur, 1) * 100 : 0), [bufferEnd, dur]);
  const progressPct = useMemo(() => (dur ? (cur / dur) * 100 : 0), [cur, dur]);

  /* --------- Stable volume / ambient / sleep ---------- */
  const setStableVolume = (on: boolean) => {
    setStableVol(on);
    const chain = audioRef.current;
    if (!chain) return;
    try {
      if (on && chain.connected !== "comp") {
        chain.src.disconnect();
        chain.src.connect(chain.comp);
        chain.comp.connect(chain.ctx.destination);
        chain.connected = "comp";
      } else if (!on && chain.connected !== "dry") {
        chain.src.disconnect();
        try { chain.comp.disconnect(); } catch {}
        chain.src.connect(chain.ctx.destination);
        chain.connected = "dry";
      }
    } catch {}
  };
  const setAmbientMode = (on: boolean) => {
    setAmbient(on);
    const host = wrapRef.current;
    if (!host) return;
    if (on) host.classList.add("uzbt-ambient");
    else host.classList.remove("uzbt-ambient");
  };
  const applySleep = (min: SleepOpt) => {
    setSleepOpt(min);
    if (sleepRef.current) { window.clearTimeout(sleepRef.current); sleepRef.current = null; }
    if (min > 0) {
      sleepRef.current = window.setTimeout(() => { try { videoRef.current?.pause(); } catch {} }, min * 60 * 1000);
    }
  };

  /* ==================== RENDER ==================== */
  const onSurfaceClick = () => {
    if (clickTimerRef.current) return; // dblclick bo‘lsa, keyin tozalanadi
    clickTimerRef.current = window.setTimeout(() => {
      togglePlay();
      clickTimerRef.current = null;
    }, 180);
  };
  const onSurfaceDouble = () => {
    if (clickTimerRef.current) { window.clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    fsToggle();
  };

  return (
    <div
      ref={wrapRef}
      className={[
        theater
          ? "uzbt-theater-wrapper"
          : "relative w-full aspect-video overflow-hidden rounded-2xl bg-black shadow-lg",
        ambient ? "ring-1 ring-white/10 shadow-[0_0_60px_rgba(255,255,255,.08)_inset]" : ""
      ].join(" ")}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className={theater ? "uzbt-theater-video" : "absolute inset-0 h-full w-full object-contain bg-black"}
        onClick={onSurfaceClick}
        onDoubleClick={onSurfaceDouble}
      >
        {subtitles.map((t, i) => (
          <track key={i} kind="subtitles" src={t.src} srcLang={t.srclang} label={t.label} default={t.default} />
        ))}
      </video>

      {/* buffering spinner */}
      <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${waiting && !paused ? "opacity-100" : "opacity-0"} transition`}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>

      {/* Error banner */}
      {err && <div className="absolute top-3 right-3 bg-red-600/80 text-white text-xs px-3 py-1 rounded">{err}</div>}

      {/* Big Play/Pause pulse */}
      {flash && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white">
          <div className="relative drop-shadow-[0_8px_28px_rgba(0,0,0,.45)]">
            {flash === "play"
              ? <svg viewBox="0 0 24 24" width="92" height="92"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
              : <svg viewBox="0 0 24 24" width="92" height="92"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>}
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block h-[120px] w-[120px] rounded-full border-2 border-white/60 opacity-60 animate-[flashRipple_.43s_cubic-bezier(.2,.6,.2,1)_forwards]" />
          </div>
        </div>
      )}

      {/* top gradient */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent transition-opacity ${uiVisible ? "opacity-100" : "opacity-0"}`} />

      {/* controls */}
      <Controls
        isFs={isFs}
        uiVisible={uiVisible}
        barRef={barRef}
        dur={dur}
        cur={cur}
        chapters={chapters}
        skips={skips}
        bufferedPct={dur ? Math.min(bufferEnd / dur, 1) * 100 : 0}
        progressPct={dur ? (cur / dur) * 100 : 0}
        hoverHandlers={{ onBarMove, onBarLeave }}
        onScrub={onScrub}
        fmt={fmt}
        quality={quality}
        speed={speed}
        subtitles={subtitles}
        subsOn={subsOn}
        setSubsOn={setSubsOn}
        changeQuality={changeQuality}
        setPlaybackRate={(r)=>setPlaybackRate(r)}
        togglePlay={togglePlay}
        seek={seek}
        pipToggle={pipToggle}
        fsToggle={fsToggle}
        toggleTheater={()=>setTheater(t=>!t)}
        settings={{
          stableVol, setStableVolume,
          ambient, setAmbientMode,
          sleepOpt, setSleep: applySleep
        }}
        previewStyle={(() => {
          if (!thumbs || hoverX == null) return undefined;
          const cue = thumbs.find(c => hoverT >= c.start && hoverT < c.end);
          if (!cue) return undefined;
          const size = { w: cue.w || 160, h: cue.h || 90 };
          const pos = cue.x != null && cue.y != null ? `${-cue.x}px ${-cue.y}px` : "0 0";
          return {
            width: size.w, height: size.h,
            backgroundImage: `url("${cue.url}")`,
            backgroundSize: "auto",
            backgroundPosition: pos,
            borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,.45)",
          } as React.CSSProperties;
        })()}
      />

      {/* Stats for nerds */}
      {showStats && (
        <div className="absolute top-3 left-3 text-xs bg-black/70 text-white rounded p-2 leading-5">
          <div>
            Resolution: {(() => {
              const hls = hlsRef.current;
              if (!hls) return quality === "auto" ? "Auto" : `${quality}p`;
              const idx = hls.currentLevel;
              const h = idx>=0 ? hls.levels[idx]?.height : (quality==="auto"?"Auto":quality);
              return typeof h === "number" ? `${h}p` : h;
            })()}
          </div>
          <div>Buffered: {fmt(bufferEnd)} / {fmt(dur)}</div>
          <div>Position: {fmt(cur)}</div>
          <div>PlaybackRate: {speed}×</div>
          <div>Hls.js: {Hls.version}</div>
        </div>
      )}

      {/* keyframes */}
      <style>{`
        @keyframes flashRipple{0%{transform:translate(-50%,-50%) scale(.6);opacity:.6}100%{transform:translate(-50%,-50%) scale(1.05);opacity:0}}
      `}</style>

      {/* Skip intro */}
      {skips.length>0 && cur>=skips[0].start && cur<skips[0].end && (
        <button
          onClick={()=>onScrub(skips[0].end)}
          className="absolute right-4 top-4 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-white/25"
        >
          {skips[0].kind==="intro" ? "Skip intro" : "Skip outro"}
        </button>
      )}
    </div>
  );
}

/* ---- controls subcomponent (alohida qilib UI kodni ixcham qildik) ---- */
function Controls(props: {
  isFs: boolean;
  uiVisible: boolean;
  barRef: React.RefObject<HTMLDivElement>;
  dur: number; cur: number;
  bufferedPct: number; progressPct: number;
  chapters: Chapter[]; skips: SkipMark[];
  hoverHandlers: { onBarMove: (e: React.MouseEvent)=>void; onBarLeave: ()=>void; };
  onScrub: (t:number)=>void;
  fmt: (n:number)=>string;
  quality: number | "auto";
  speed: number;
  subtitles: SubtitleTrack[];
  subsOn: boolean;
  setSubsOn: (v:boolean)=>void;
  changeQuality: (q:number|"auto")=>void;
  setPlaybackRate: (r:number)=>void;
  togglePlay: ()=>void;
  seek: (d:number)=>void;
  pipToggle: ()=>void;
  fsToggle: ()=>void;
  toggleTheater: ()=>void;
  settings: {
    stableVol: boolean; setStableVolume: (v:boolean)=>void;
    ambient: boolean; setAmbientMode: (v:boolean)=>void;
    sleepOpt: SleepOpt; setSleep: (v:SleepOpt)=>void;
  };
  previewStyle?: React.CSSProperties;
}) {
  const {
    isFs, uiVisible, barRef, dur, cur, bufferedPct, progressPct, chapters, skips, hoverHandlers, onScrub, fmt,
    quality, speed, subtitles, subsOn, setSubsOn, changeQuality, setPlaybackRate,
    togglePlay, seek, pipToggle, fsToggle, toggleTheater, settings, previewStyle
  } = props;

  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"root"|"subs"|"speed"|"quality">("root");

  return (
    <div className={`pointer-events-auto absolute inset-x-0 ${isFs ? "bottom-3 sm:bottom-6" : "bottom-0"} p-3 sm:p-4 transition-opacity ${uiVisible ? "opacity-100" : "opacity-0"}`}>
      {/* progress */}
      <div className="mx-auto mb-3 w-full max-w-[1200px] px-1">
        <div
          ref={barRef}
          className={`group relative ${isFs ? "h-4" : "h-3"} w-full cursor-pointer select-none transition-[height] duration-150 hover:h-5`}
          onMouseMove={hoverHandlers.onBarMove}
          onMouseLeave={hoverHandlers.onBarLeave}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            onScrub(pct * (dur || 0));
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white/12" />
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-rose-500 shadow-[0_0_12px] shadow-rose-500/50" style={{ width: `${progressPct}%` }} />
          {chapters.map((c, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-[2px] rounded-sm bg-white/70" style={{ left: `${(c.time / (dur || 1)) * 100}%` }} />
          ))}
          {skips.map((s, i) => (
            <div key={i} className="absolute top-0 bottom-0 rounded-full bg-white/20" style={{ left: `${(s.start/(dur||1))*100}%`, width: `${((s.end-s.start)/(dur||1))*100}%` }} />
          ))}
          {/* knob + preview */}
          <div className="absolute -top-[6px] h-7 w-7 -translate-x-1/2 rounded-full border border-white/50 bg-white shadow transition-all group-hover:scale-110" style={{ left: `${progressPct}%` }} />
          {previewStyle && (
            <div className="absolute -top-[118px] flex -translate-x-1/2 flex-col items-center" style={{ left: `${(progressPct/100)*(document.querySelector('.group')?.clientWidth||0)}px` }}>
              <div className="mb-2 overflow-hidden" style={previewStyle} />
              <div className="rounded-md bg-black/90 px-2 py-1 text-[11px] text-white shadow">
                {fmt((progressPct/100)*(dur||0))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-1 flex justify-between text-[12px] tabular-nums text-white/85">
          <span>{fmt(cur)} / {fmt(dur)}</span>
          <span className="hidden sm:block">{quality === "auto" ? "Auto" : `${quality}p`} • {speed}×</span>
        </div>
      </div>

      {/* toolbar */}
      <div className={`mx-auto flex ${isFs ? "max-w-[1200px]" : "max-w-[980px]"} w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md shadow-2xl`}>
        <div className="flex items-center gap-2">
          <Pill title="Play/Pause (K/Space)" onClick={togglePlay}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          </Pill>

          <div className="group flex items-center gap-2">
            <button title="Back 10s (J)" onClick={()=>seek(-10)} className="grid h-9 w-9 place-items-center rounded-2xl border border-white/12 bg-white/10 text-white hover:bg-white/15 active:scale-[0.96] transition">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 6V3L8 7l4 4V8a7 7 0 1 1-7 7H7a5 5 0 1 0 5-5z"/></svg>
            </button>
            <button title="Forward 10s (L)" onClick={()=>seek(10)} className="grid h-9 w-9 place-items-center rounded-2xl border border-white/12 bg-white/10 text-white hover:bg-white/15 active:scale-[0.96] transition">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 6V3l4 4-4 4V8a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5z"/></svg>
            </button>
          </div>

          {/* volume (local state — playerning boshqa qismiga ta’sir qilmaydi) */}
          <div className="group/vol relative ml-1 flex items-center">
            <Pill title="Mute (M)" onClick={() => { const v = document.querySelector("video") as HTMLVideoElement; if(!v) return; v.muted = !v.muted; setMuted(v.muted); }}>
              {(muted || vol === 0)
                ? <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 9v6h4l5 4V5L9 9H5zm12.6 3 2.1-2.1 1.4 1.4L19 13.4l2.1 2.1-1.4 1.4L17.6 14l-2.1 2.1-1.4-1.4L16.2 13l-2.1-2.1 1.4-1.4L17.6 11z"/></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 9v6h4l5 4V5L9 9H5z"/></svg>}
            </Pill>
            <div className="ml-2 hidden h-8 w-0 items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-3 opacity-0 backdrop-blur transition-[width,opacity] duration-300 ease-out group-hover/vol:w-28 group-hover/vol:opacity-100 sm:flex">
              <input
                type="range" min={0} max={1} step={0.01} value={vol}
                onChange={(e) => {
                  const v = document.querySelector("video") as HTMLVideoElement; if(!v) return;
                  v.volume = Number(e.target.value);
                  setVol(v.volume);
                  if (v.volume > 0) v.muted = false;
                }}
                className="w-full appearance-none" aria-label="Volume"
              />
            </div>
          </div>

          <div className="ml-2 hidden text-sm text-white/85 sm:block">{fmt(cur)}</div>
        </div>

        <div className="relative flex items-center gap-2">
          {!!subtitles.length && (
            <Pill title="Subtitles (C)" onClick={()=>setSubsOn(!subsOn)} active={subsOn}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM9 16H7a2 2 0 1 1 0-4h2v1.5H7a.5.5 0 1 0 0 1H9V16zm8 0h-2a2 2 0 1 1 0-4h2v1.5h-2a.5.5 0 1 0 0 1h2V16z"/></svg>
            </Pill>
          )}

          {/* Settings */}
          <div className="relative">
            <Pill title="Settings" onClick={() => { setSettingsOpen(s => !s); setSettingsTab("root"); }}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.1 12.9a7 7 0 0 0 0-1.8l2-1.6a.6.6 0 0 0 .1-.7l-1.9-3.3a.6.6 0 0 0-.7-.2l-2.4 1A7 7 0 0 0 14.8 4l-.3-2.5a.6.6 0 0 0-.6-.5H10a.6.6 0 0 0-.6.5L9 4a7 7 0 0 0-1.7 1l-2.4-1a.6.6 0 0 0-.7.2L2.3 7.7a.6.6 0 0 0 .1.7l2 1.6a7 7 0 0 0 0 1.8l-2 1.6a.6.6 0 0 0-.1.7l1.9 3.3a.6.6 0 0 0 .7.2l2.4-1a7 7 0 0 0 1.7 1l.4 2.5a.6.6 0 0 0 .6.5h3.9a.6.6 0 0 0 .6-.5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1a.6.6 0 0 0 .7-.2l1.9-3.3a.6.6 0 0 0-.1-.7l-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>
            </Pill>

            <div
              className={[
                "absolute right-0 z-20 w-[320px] origin-bottom rounded-2xl border border-white/10 bg-black/90 p-3 text-sm text-white shadow-2xl backdrop-blur",
                "transition-all duration-150",
                settingsOpen ? "pointer-events-auto scale-100 opacity-100 -top-2 -translate-y-full" : "pointer-events-none scale-95 opacity-0 -top-2 -translate-y-full"
              ].join(" ")}
            >
              {settingsTab !== "root" && (
                <button onClick={()=>setSettingsTab("root")} className="mb-2 flex items-center gap-2 text-white/80 hover:text-white">
                  <span className="inline-block rotate-180">➜</span><span>Back</span>
                </button>
              )}

              {settingsTab === "root" && (
                <div className="space-y-2">
                  <RowSwitch label="Stable Volume" on={settings.stableVol} onToggle={v=>settings.setStableVolume(v)} />
                  <RowSwitch label="Ambient mode" on={settings.ambient} onToggle={v=>settings.setAmbientMode(v)} />
                  <RowLink label={`Subtitles/CC (${subtitles.length})`} value={subsOn ? "On" : "Off"} onClick={()=>setSettingsTab("subs")} />
                  <RowSelectSleep value={settings.sleepOpt} onChange={v=>settings.setSleep(v)} />
                  <RowLink label="Playback speed" value={speed === 1 ? "Normal" : `${speed}×`} onClick={()=>setSettingsTab("speed")} />
                  <RowLink label="Quality" value={quality === "auto" ? "Auto" : `${quality}p`} onClick={()=>setSettingsTab("quality")} />
                </div>
              )}
              {settingsTab === "subs" && (
                <div className="space-y-1">
                  <RowSwitch label="Subtitles" on={subsOn} onToggle={()=>setSubsOn(!subsOn)} />
                  {subtitles.map((t,i)=>(<button key={i} className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">{t.label} <span className="text-white/50">({t.srclang})</span></button>))}
                </div>
              )}
              {settingsTab === "speed" && (
                <div className="grid grid-cols-3 gap-2">
                  {[0.5,0.75,1,1.25,1.5,1.75,2].map(r=>(
                    <button key={r} onClick={()=>setPlaybackRate(r)}
                      className={["rounded-lg px-3 py-2 text-center hover:bg-white/5", speed===r ? "bg-white/10 ring-1 ring-white/20" : ""].join(" ")}>
                      {r}×
                    </button>
                  ))}
                </div>
              )}
              {settingsTab === "quality" && (
                <div className="space-y-1">
                  <button onClick={()=>changeQuality("auto")} className={`w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 ${quality==="auto"?"bg-white/10 ring-1 ring-white/20":""}`}>Auto</button>
                  {/* level tugmalari parentdan keladi (data.levels) */}
                </div>
              )}
            </div>
          </div>

          <Pill title="Theater (T)" onClick={toggleTheater}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 6h18v12H3zM5 8v8h14V8z"/></svg>
          </Pill>
          <Pill title="Picture-in-Picture" onClick={pipToggle}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 7H5a2 2 0 0 0-2 2v8h2V9h14v10h2V9a2 2 0 0 0-2-2zM14 12H8a2 2 0 0 0-2 2v5h8a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"/></svg>
          </Pill>
          <Pill title="Fullscreen (F)" onClick={fsToggle}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm12 0h-2v3h-3v2h5v-5zM7 7h3V5H5v5h2V7zm10 0v3h2V5h-5v2h3z"/></svg>
          </Pill>
        </div>
      </div>
    </div>
  );
}
