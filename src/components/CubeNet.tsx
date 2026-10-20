import { Face, Facelets, FACE_NAMES, PALETTE } from '../lib/cube';
type Props = { faces: Facelets; onSticker: (face: Face, index: number) => void; disabled?: boolean };
export default function CubeNet({ faces, onSticker, disabled = false }: Props) {
  const grid = (face: Face) => <div className="net-face" key={face}><div className="net-face-title">{FACE_NAMES[face]} <b>{face}</b></div><div className="sticker-grid">{faces[face].map((color, index) => <button key={index} aria-label={`${FACE_NAMES[face]} sticker ${index + 1}: ${PALETTE[color].name}`} className={`sticker ${index === 4 ? 'center-sticker' : ''}`} style={{ backgroundColor: PALETTE[color].color }} disabled={disabled || index === 4} onClick={() => onSticker(face, index)} title={index === 4 ? 'Fixed center' : 'Tap to change color'} />)}</div></div>;
  return <div className="net-layout" aria-label="Editable six-face cube net"><div className="net-empty" />{grid('U')}<div className="net-empty" /><div className="net-empty" />{grid('L')}{grid('F')}{grid('R')}{grid('B')}<div className="net-empty" />{grid('D')}<div className="net-empty" /><div className="net-empty" /></div>;
}
