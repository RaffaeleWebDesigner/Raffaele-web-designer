import type { RoomView } from '../../shared/types';

export type CardFormat = 'story' | 'square';

const SIZES: Record<CardFormat, [number, number]> = {
  story: [1080, 1920], // 9:16 per Instagram/WhatsApp Stories
  square: [1080, 1080],
};

const FONT = 'Fredoka, system-ui, sans-serif';
const MEDALS = ['🥇', '🥈', '🥉'];

/** Disegna la card dei risultati su un canvas e restituisce un PNG. */
export async function renderShareCard(view: RoomView, format: CardFormat): Promise<Blob> {
  await document.fonts?.ready;
  const [W, H] = SIZES[format];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const story = format === 'story';
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const results = view.results!;

  // Sfondo: gradiente notturno + bolle colorate
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a1060');
  bg.addColorStop(0.55, '#140b2e');
  bg.addColorStop(1, '#3b0c3f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, number, string][] = [
    [0.1, 0.08, 260, '#ff3d7f'],
    [0.95, 0.3, 300, '#4cc9f0'],
    [0.05, 0.75, 280, '#ffb020'],
    [0.9, 0.95, 320, '#3ddc97'],
  ];
  for (const [x, y, r, c] of blobs) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
    g.addColorStop(0, c + '66');
    g.addColorStop(1, c + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = story ? 230 : 90;

  // Titolo
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${story ? 92 : 70}px ${FONT}`;
  ctx.fillText('Quanto Mi Conosci?', W / 2, y);
  y += story ? 80 : 60;
  ctx.fillStyle = '#ffd166';
  ctx.font = `500 ${story ? 40 : 32}px ${FONT}`;
  ctx.fillText('🏆 La classifica della serata', W / 2, y);
  y += story ? 110 : 60;

  // Classifica
  const maxRows = story ? 10 : 5;
  const rowH = story ? 104 : 72;
  const rows = results.standings.slice(0, maxRows);
  const left = 90;
  const right = W - 90;
  rows.forEach((s, i) => {
    const p = byId.get(s.playerId);
    if (!p) return;
    const top = y + i * rowH;
    roundRect(ctx, left, top, right - left, rowH - 14, 28);
    ctx.fillStyle = i === 0 ? 'rgba(255, 209, 102, 0.22)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    const cy = top + (rowH - 14) / 2;
    ctx.textAlign = 'left';
    ctx.font = `600 ${story ? 44 : 36}px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(MEDALS[i] ?? `${i + 1}.`, left + 26, cy);
    ctx.fillText(`${p.emoji} ${truncate(p.name, 14)}`, left + 120, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`${s.score} pt`, right - 30, cy);
    ctx.textAlign = 'center';
  });
  y += rows.length * rowH + (story ? 80 : 20);

  // Titoli buffi
  const awards = results.awards.slice(0, story ? 5 : 2);
  if (awards.length) {
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${story ? 44 : 34}px ${FONT}`;
    ctx.fillText('I premi della serata', W / 2, y);
    y += story ? 70 : 50;
    for (const a of awards) {
      const p = byId.get(a.playerId);
      ctx.font = `600 ${story ? 40 : 32}px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`${a.emoji} ${a.title}`, W / 2, y);
      y += story ? 50 : 40;
      ctx.font = `500 ${story ? 36 : 28}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(p ? `${p.emoji} ${p.name}` : '', W / 2, y);
      y += story ? 84 : 52;
    }
  }

  // Piede con l'URL
  ctx.font = `600 ${story ? 38 : 30}px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('Sfida i tuoi amici 👉 ' + window.location.host, W / 2, H - (story ? 110 : 60));

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Impossibile creare l\'immagine'))), 'image/png'),
  );
}

/** Condivide l'immagine (menu nativo del telefono) oppure la scarica. */
export async function shareCard(view: RoomView, format: CardFormat): Promise<void> {
  const blob = await renderShareCard(view, format);
  const file = new File([blob], `quanto-mi-conosci-${format}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `Ecco com'è andata a Quanto Mi Conosci? 👀 ${window.location.origin}` });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // l'utente ha chiuso il menu
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
