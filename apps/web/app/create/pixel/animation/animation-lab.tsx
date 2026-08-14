"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Pixel = string | null;
type Frame = { pixels: Pixel[]; duration: number };
type Mode = "loop" | "pingpong";
type SavedAnimationLab = { frames?: Frame[]; mode?: Mode; tag?: string; timingUsed?: boolean; onionUsed?: boolean; playUsed?: boolean };
const R = 16, SIZE = 608, MAX = 8, STORAGE = "swd.pixel.animation.v1";
const COLORS = ["#181715","#f4ead7","#f2b705","#a44e2d","#315b83","#39745a","#74567d","#d98c3f"];
const blank = (): Pixel[] => Array.from({length:R*R},()=>null);
const frame = (): Frame => ({pixels:blank(),duration:160});
const at = (x:number,y:number) => y*R+x;

export function AnimationLab(){
  const editor=useRef<HTMLCanvasElement|null>(null), preview=useRef<HTMLCanvasElement|null>(null), drawing=useRef(false), direction=useRef<1|-1>(1);
  const [frames,setFrames]=useState<Frame[]>(()=>[frame(),frame(),frame(),frame()]);
  const [active,setActive]=useState(0),[playIndex,setPlayIndex]=useState(0),[playing,setPlaying]=useState(false);
  const [color,setColor]=useState(COLORS[0]!),[erase,setErase]=useState(false),[onion,setOnion]=useState(true),[mode,setMode]=useState<Mode>("loop"),[tag,setTag]=useState("idle");
  const [timingUsed,setTimingUsed]=useState(false),[onionUsed,setOnionUsed]=useState(false),[playUsed,setPlayUsed]=useState(false);

  useEffect(()=>{try{const raw=localStorage.getItem(STORAGE);if(raw){const saved=JSON.parse(raw) as SavedAnimationLab;if(saved.frames?.length)setFrames(saved.frames.slice(0,MAX));if(saved.mode)setMode(saved.mode);if(saved.tag)setTag(saved.tag);if(typeof saved.timingUsed==="boolean")setTimingUsed(saved.timingUsed);if(typeof saved.onionUsed==="boolean")setOnionUsed(saved.onionUsed);if(typeof saved.playUsed==="boolean")setPlayUsed(saved.playUsed)}}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({frames,mode,tag,timingUsed,onionUsed,playUsed} satisfies SavedAnimationLab))}catch{}},[frames,mode,tag,timingUsed,onionUsed,playUsed]);

  function draw(ctx:CanvasRenderingContext2D,pixels:Pixel[],size:number,alpha=1,checker=false){const cell=size/R;ctx.globalAlpha=alpha;for(let y=0;y<R;y++)for(let x=0;x<R;x++){const p=pixels[at(x,y)];if(!p&&!checker)continue;ctx.fillStyle=p??((x+y)%2?"#e1d4bc":"#f2e8d5");ctx.fillRect(x*cell,y*cell,Math.ceil(cell),Math.ceil(cell))}ctx.globalAlpha=1}
  useEffect(()=>{const c=editor.current,ctx=c?.getContext("2d"),current=frames[active];if(!c||!ctx||!current)return;c.width=SIZE;c.height=SIZE;ctx.imageSmoothingEnabled=false;draw(ctx,blank(),SIZE,1,true);if(onion&&frames.length>1){const previous=frames[(active-1+frames.length)%frames.length];if(previous){draw(ctx,previous.pixels,SIZE,.18);setOnionUsed(true)}}draw(ctx,current.pixels,SIZE);const cell=SIZE/R;ctx.beginPath();ctx.strokeStyle="rgba(42,35,27,.23)";for(let n=0;n<=R;n++){const p=Math.round(n*cell)+.5;ctx.moveTo(p,0);ctx.lineTo(p,SIZE);ctx.moveTo(0,p);ctx.lineTo(SIZE,p)}ctx.stroke()},[frames,active,onion]);
  useEffect(()=>{const c=preview.current,ctx=c?.getContext("2d"),current=frames[playIndex];if(!c||!ctx||!current)return;c.width=224;c.height=224;ctx.imageSmoothingEnabled=false;draw(ctx,blank(),224,1,true);draw(ctx,current.pixels,224)},[frames,playIndex]);
  useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>setPlayIndex(current=>{if(mode==="loop")return(current+1)%frames.length;let next=current+direction.current;if(next>=frames.length){direction.current=-1;next=Math.max(0,frames.length-2)}if(next<0){direction.current=1;next=Math.min(frames.length-1,1)}return next}),frames[playIndex]?.duration??160);return()=>clearTimeout(timer)},[playing,playIndex,frames,mode]);

  function cell(e:React.PointerEvent<HTMLCanvasElement>){const r=editor.current!.getBoundingClientRect();return{x:Math.max(0,Math.min(R-1,Math.floor((e.clientX-r.left)/r.width*R))),y:Math.max(0,Math.min(R-1,Math.floor((e.clientY-r.top)/r.height*R)))}}
  function paint(x:number,y:number){setFrames(current=>current.map((f,i)=>i===active?{...f,pixels:f.pixels.map((p,j)=>j===at(x,y)?(erase?null:color):p)}:f))}
  function begin(e:React.PointerEvent<HTMLCanvasElement>){drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);const p=cell(e);paint(p.x,p.y)}
  function move(e:React.PointerEvent<HTMLCanvasElement>){if(!drawing.current)return;const p=cell(e);paint(p.x,p.y)}
  function stop(){drawing.current=false}
  function add(copy=false){if(frames.length>=MAX)return;const source=frames[active];const next=copy&&source?{pixels:source.pixels.slice(),duration:source.duration}:frame();setFrames(current=>{const out=current.slice();out.splice(active+1,0,next);return out});setActive(active+1)}
  function remove(){if(frames.length<=2)return;setFrames(current=>current.filter((_,i)=>i!==active));setActive(Math.max(0,active-1))}
  function duration(value:number){setTimingUsed(true);setFrames(current=>current.map((f,i)=>i===active?{...f,duration:value}:f))}
  function play(){setPlayUsed(true);direction.current=1;setPlayIndex(active);setPlaying(value=>!value)}
  function exportSheet(){const scale=8,size=R*scale,c=document.createElement("canvas");c.width=size*frames.length;c.height=size;const ctx=c.getContext("2d")!;frames.forEach((f,fi)=>f.pixels.forEach((p,i)=>{if(!p)return;ctx.fillStyle=p;ctx.fillRect(fi*size+(i%R)*scale,Math.floor(i/R)*scale,scale,scale)}));const a=document.createElement("a");a.download=`swd-${tag}-spritesheet.png`;a.href=c.toDataURL("image/png");a.click()}
  function exportJson(){const data={format:"swd-animation-v1",tag,mode,frameWidth:R,frameHeight:R,frames:frames.map((f,i)=>({index:i,durationMs:f.duration,x:i*R,y:0,w:R,h:R}))};const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`swd-${tag}-animation.json`;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}

  const stats=useMemo(()=>{const distinct=new Set(frames.map(f=>f.pixels.join("|"))).size;const colors=new Set(frames.flatMap(f=>f.pixels.filter(Boolean))).size;return{distinct,colors}},[frames]);
  const ready=frames.length>=4&&stats.distinct>=3&&stats.colors>=2&&timingUsed&&onionUsed&&playUsed;

  return <div className="animation-shell">
    <aside className="animation-tools">
      <section><p className="eyebrow">Ritmo de Croma · Motion 01</p><h2>O tempo também desenha.</h2><p>Crie poses diferentes, altere a duração de pelo menos um frame e compare o movimento com onion skin.</p></section>
      <section><span>Ferramenta</span><div className="animation-buttons"><button className={!erase?"is-active":""} onClick={()=>setErase(false)}>Pencil</button><button className={erase?"is-active":""} onClick={()=>setErase(true)}>Eraser</button></div></section>
      <section><span>Paleta Croma</span><div className="animation-palette">{COLORS.map(c=><button key={c} className={color===c?"is-active":""} style={{background:c}} aria-label={`Cor ${c}`} onClick={()=>{setColor(c);setErase(false)}}/>)}</div></section>
      <section><label><input type="checkbox" checked={onion} onChange={e=>{setOnion(e.target.checked);if(e.target.checked)setOnionUsed(true)}}/> Onion anterior</label></section>
      <section className={`animation-mission ${ready?"is-ready":""}`}><strong>{ready?"Ritmo validado":"Missão em andamento"}</strong><small>{frames.length} frames · {stats.distinct} poses · {stats.colors} cores</small><small>Timing {timingUsed?"✓":"○"} · Onion {onionUsed?"✓":"○"} · Playback {playUsed?"✓":"○"}</small></section>
    </aside>
    <section className="animation-workbench">
      <div className="animation-bar"><button onClick={()=>add(false)} disabled={frames.length>=MAX}>+ Frame</button><button onClick={()=>add(true)} disabled={frames.length>=MAX}>Duplicar</button><button onClick={remove} disabled={frames.length<=2}>Excluir</button></div>
      <canvas ref={editor} className="animation-editor" onPointerDown={begin} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}/>
      <div className="animation-timeline">{frames.map((f,i)=><button key={i} className={active===i?"is-active":""} onClick={()=>{setActive(i);setPlayIndex(i)}}><b>F{i+1}</b><small>{f.duration} ms</small></button>)}</div>
      <label className="animation-duration">Duração do frame <input type="range" min="60" max="600" step="20" value={frames[active]?.duration??160} onChange={e=>duration(Number(e.target.value))}/><strong>{frames[active]?.duration??160} ms</strong></label>
    </section>
    <aside className="animation-preview-panel">
      <p className="eyebrow">Playback temporal</p><h3>Veja a duração, não só a ordem.</h3><canvas ref={preview} className="animation-preview"/><button className="animation-play" onClick={play}>{playing?"Pausar":"Reproduzir"}</button>
      <label>Modo <select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="loop">Loop</option><option value="pingpong">Ping-pong</option></select></label>
      <label>Tag <select value={tag} onChange={e=>setTag(e.target.value)}><option>idle</option><option>walk</option><option>attack</option><option>custom</option></select></label>
      <button onClick={exportSheet}>Spritesheet PNG</button><button onClick={exportJson}>Metadata JSON</button><p>Metadata inclui tag, modo e duração individual de cada frame.</p>
    </aside>
  </div>;
}
