const aspectRatio = (photo) => Number.isFinite(photo.width / photo.height) && photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 3;

// Find row breaks across the entire chapter, preserving the photo sequence.
// Rows share an image height; captions stay in normal document flow below them.
export function packGallery(photos, { width, gap = 24, maxHeight = Infinity } = {}) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Gallery width must be positive.');
  if (!Number.isFinite(gap) || gap < 0) throw new RangeError('Gallery gap must be nonnegative.');
  if (!(maxHeight > 0)) throw new RangeError('Gallery height limit must be positive.');
  const ratios = photos.map(aspectRatio);
  if (width <= 660) return photos.map((photo, index) => {
    const height = Math.min(width / ratios[index], maxHeight);
    return { indices: [index], ratios: [ratios[index]], height, width: height * ratios[index] };
  });
  const target = Math.min(maxHeight, 380, Math.max(240, width * 0.3));
  const maxItems = Math.min(6, Math.max(3, Math.ceil(width / 280)));
  const costs = Array(photos.length + 1).fill(Infinity);
  const choices = [];
  costs[photos.length] = 0;
  for (let start = photos.length - 1; start >= 0; start -= 1) {
    let ratioSum = 0;
    for (let count = 1; count <= maxItems && start + count <= photos.length; count += 1) {
      const end = start + count;
      ratioSum += ratios[end - 1];
      const available = width - gap * (count - 1);
      if (available <= 0) break;
      const naturalHeight = available / ratioSum;
      // Keep a single-photo row from becoming a towering portrait.
      const height = Math.min(maxHeight, naturalHeight, count === 1 ? target * 1.5 : Infinity);
      const rowWidth = height * ratioSum + gap * (count - 1);
      let cost = ((height - target) / target) ** 2;
      cost += 4 * (1 - rowWidth / width) ** 2;
      if (count === 1 && photos.length > 1 && ratios[start] < 2) cost += 1.5;
      for (let index = start; index < end; index += 1) {
        const photoWidth = height * ratios[index];
        if (photoWidth < 180) cost += ((180 - photoWidth) / 90) ** 2;
        // Existing wide hints favor prominence without forcing empty half rows.
        if (photos[index].wide && count > 1) cost += 0.12 * (1 - photoWidth / width);
      }
      cost += costs[end];
      if (cost < costs[start]) {
        costs[start] = cost;
        choices[start] = { indices: Array.from({ length: count }, (_, offset) => start + offset), ratios: ratios.slice(start, end), height, width: rowWidth };
      }
    }
  }
  const rows = [];
  for (let start = 0; start < photos.length;) {
    const row = choices[start];
    rows.push(row);
    start += row.indices.length;
  }
  return rows;
}

export function galleryRowStyle(row, width, gap = 24) {
  return `--row-columns:${row.ratios.map((ratio) => `${ratio.toFixed(8)}fr`).join(' ')};--row-width:${Math.min(100, row.width / width * 100).toFixed(6)}%;--row-ratio:${row.ratios.reduce((sum, ratio) => sum + ratio, 0).toFixed(8)};--row-gaps:${gap * (row.indices.length - 1)}px`;
}
