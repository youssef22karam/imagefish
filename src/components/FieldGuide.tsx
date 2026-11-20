import { useState } from 'react';
import { ArrowUpRight, BookOpen, Camera, ChevronRight, Dna, Fish, Ruler, RotateCw, ScanLine, Waves, X } from 'lucide-react';
import Profile from './Profile';
import Thumb from './Thumb';
import { HABITAT } from '../gen/habitats';
import { LINEAGES, NICHE_INFO } from '../gen/lineages';
import { STRATEGY_INFO } from '../gen/pigment';
import { SPECIES_BY_ID, type GenFish } from '../gen/generate';

const REPO = 'youssef22karam/fish-images';
const ART = new Set(['tiger-shark', 'reef-manta-ray', 'warty-frogfish', 'longhorn-cowfish', 'peacock-flounder', 'guppy', 'porcupinefish', 'siamese-fighting-fish', 'great-white-shark', 'blue-shark', 'southern-stingray', 'atlantic-mudskipper']);
interface ImgProps { id: string; thumb?: boolean; className?: string; alt?: string }
export function RefImg(props: ImgProps) { return <Photo key={props.id} {...props} />; }
function Photo({ id, thumb, className, alt }: ImgProps) {
  const [attempt, setAttempt] = useState(0);
  const path = `${id}/01_${id}.jpg`;
  const cdn = `https://cdn.jsdelivr.net/gh/${REPO}@main/${path}`;
  const raw = `https://raw.githubusercontent.com/${REPO}/main/${path}`;
  const urls = [
    ...(ART.has(id) ? [`/references/${id}.webp`] : []),
    ...(thumb ? [`https://wsrv.nl/?url=${encodeURIComponent(cdn)}&w=120&h=84&fit=cover&output=webp`] : []),
    cdn, raw,
  ];
  const sp = SPECIES_BY_ID[id];
  if (attempt >= urls.length) return <span className={`${className ?? ''} photo-empty`}>
    {sp ? <Thumb sp={sp} w={thumb ? 42 : 180} h={thumb ? 24 : 65} /> : <Fish size={24} />}
    {!thumb && <small>Reference photograph unavailable</small>}
  </span>;
  return <img src={urls[attempt]} loading={thumb ? 'lazy' : 'eager'} decoding="async" alt={alt ?? ''} className={className} onError={() => setAttempt((n) => n + 1)} />;
}
interface Props {
  fish: GenFish;
  census: GenFish[];
  onPick: (f: GenFish) => void;
  onRecensus: () => void;
  onClose: () => void;
}
const lengthLabel = (m: number) => m >= 1 ? `${m.toFixed(m >= 10 ? 1 : 2).replace(/0$/, '')} m` : `${Math.round(m * 100)} cm`;
export default function FieldGuide({ fish, census, onPick, onRecensus, onClose }: Props) {
  const sp = fish.species, H = HABITAT[fish.habitat];
  const base = SPECIES_BY_ID[fish.anchor];
  const strategy = fish.strategy === 'inherited' ? null : STRATEGY_INFO[fish.strategy];
  const lineage = fish.clade ?? LINEAGES[fish.lineage].name, niche = NICHE_INFO[fish.niche].name;
  return <>
    <header className="field-header">
      <div><span className="section-label"><BookOpen size={16} /> Field Guide</span><span className="field-subtitle">Specimen data &amp; reference</span></div>
      <button aria-label="Close field guide" title="Close field guide" className="icon-button" onClick={onClose}><X size={16} /></button>
    </header>
    <div className="field-scroll scroll-area" key={fish.key}>
      {fish.origin === 'uploaded' && fish.uploadedSourceUrl ? <section className="reference-section">
        <div className="section-heading"><h2 className="section-label"><Camera size={15} /> Uploaded 2D Source Plate</h2></div>
        <div className="reference-photo">
          <img src={fish.uploadedSourceUrl} alt={`${fish.common} uploaded 2D source`} className="reference-image" style={{ objectFit: 'contain', background: 'rgba(6, 18, 28, 0.72)' }} />
          <span className="reference-caption"><span>2D → 3D Procedural Synthesis</span><ScanLine size={15} /></span>
        </div>
        <p className="reference-note">Directly reconstructed from your uploaded 2D image: measured silhouette, anatomical fins, cylindrical skin albedo, scales, and dermal outgrowths.</p>
      </section> : fish.plan ? <section className="reference-section">
        <div className="section-heading"><h2 className="section-label"><Camera size={15} /> De-novo specimen</h2></div>
        <div className="reference-photo novo-card">
          <Thumb sp={sp} w={300} h={150} />
          <span className="reference-caption"><span>{fish.clade}</span></span>
        </div>
        <p className="reference-note">No atlas parent and no photograph exists: this body outline, head, fin architecture and tail were grown from the {H.name.toLowerCase()}&rsquo;s physics and a {niche.toLowerCase()} diet.</p>
      </section> : <section className="reference-section">
        <div className="section-heading"><h2 className="section-label"><Camera size={15} /> Reference photograph</h2></div>
        <a className="reference-photo" href={`https://github.com/${REPO}/tree/main/${fish.anchor}`} title="Open the reference in fish-images" target="_blank" rel="noreferrer">
          <RefImg id={fish.anchor} alt={`${base?.name ?? fish.common}, reference photograph`} className="reference-image" />
          <span className="reference-caption"><span>{base?.name ?? fish.common}</span><ArrowUpRight size={15} /></span>
        </a>
        {!fish.real && <p className="reference-note">Primary parent reference</p>}
      </section>}
      <section className="field-section profile-section">
        <div className="section-heading"><h2 className="section-label"><Ruler size={15} /> Morphometrics</h2><span className="mono profile-label">LATERAL</span></div>
        <div className="profile-frame"><Profile sp={sp} /></div>
        <div className="profile-legend"><span><i className="legend-jaw"/> Oral cleft</span><span><i className="legend-hinge"/> Jaw hinge</span><span><i className="legend-eye"/> Orbit</span></div>
        <dl className="metric-grid">
          <div><dt>Est. length</dt><dd>{lengthLabel(sp.lenM)}</dd></div>
          <div><dt>Body depth</dt><dd>{(sp.body.D * 100).toFixed(1)}<small>% SL</small></dd></div>
          <div><dt>Gape</dt><dd>{(sp.mouth.gape * 100).toFixed(1)}<small>% SL</small></dd></div>
        </dl>
      </section>
      <section className="field-section specimen-notes">
        <h2 className="section-label"><ScanLine size={15} /> Species notes</h2>
        <h3>{fish.common}</h3>
        <p className="guide-latin">{fish.latin}</p>
        <div className="guide-tags"><span>{H.name}</span><span>{niche}</span>{strategy && <span>{strategy.name}</span>}</div>
        <p className="species-prose">{fish.description}</p>
        {fish.parents.length > 0 && <p className="parentage"><strong>Parentage</strong> {fish.parents.map((p) => `${p.name} (${Math.round(p.share * 100)}%)`).join(' × ')}</p>}
        <p className="lineage-label">{lineage}</p>
      </section>
      {fish.genome.length > 0 && <section className="field-section genome-section">
        <h2 className="section-label"><Dna size={15} /> Genome traits</h2>
        <div className="genome-bars">{fish.genome.map((g) => <div key={g.k} title={`${g.lo} → ${g.hi}`}><span>{g.k}</span><span className="genome-bar"><b style={{ width: `${Math.round(Math.min(1, Math.max(0, g.v)) * 100)}%` }} /></span></div>)}</div>
      </section>}
      {fish.notes.length > 0 && <section className="field-section guide-adaptations">
        <h2 className="section-label"><Waves size={15} /> Adaptations</h2>
        {fish.notes.map((n, i) => <div key={i}><strong>{n.title}</strong><p>{n.text}</p></div>)}
      </section>}
      <section className="field-section census-section">
        <div className="section-heading"><h2 className="section-label"><Fish size={15} /> Ecosystem census</h2><button className="icon-button" title="Refresh census" aria-label="Refresh census" onClick={onRecensus}><RotateCw size={14} /></button></div>
        <p>Other specimens in the {H.name.toLowerCase()}.</p>
        {census.map((f) => <button key={f.key} className={`specimen-row ${f.key === fish.key ? 'selected' : ''}`} onClick={() => onPick(f)}><Thumb sp={f.species} w={49} h={27} /><span><strong>{f.common}</strong><small>{NICHE_INFO[f.niche].name} · {f.real ? 'Known' : 'Procedural'}</small></span><ChevronRight size={13} /></button>)}
      </section>
    </div>
  </>;
}
