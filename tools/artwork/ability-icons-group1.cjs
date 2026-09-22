const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const p = pixels[y * size + x];
      raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; raw[o++] = p[3];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}
function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
function icon(hex) {
  const base = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const light = mix(base, [255, 255, 255], 0.45);
  const dark = mix(base, [0, 0, 0], 0.45);
  const size = 18, px = [];
  const c = (size - 1) / 2, max = 7.6;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - c, dy = y - c, d = Math.sqrt(dx * dx + dy * dy);
    if (d > max) { px.push([0, 0, 0, 0]); continue; }
    let t = d / max;
    let color = mix(light, dark, t);
    if (d > max - 1.4) color = mix(dark, [0, 0, 0], 0.35);
    if (dx < -1 && dy < -1) color = mix(color, [255, 255, 255], 0.35 * (1 - t));
    px.push([color[0], color[1], color[2], 255]);
  }
  return png(size, px);
}

const root = process.argv[2] || path.resolve(__dirname, '../../content/abilities');
const icons = {
  'flamebody_sear': 0xFF7A18,
  'gooey_cling': 0x6A8F3C,
  'lingering_aroma': 0xB45FD8,
  'mummy_wrap': 0xD8CBA0,
  'perish_body': 0x4B3A6B
};
const dirs = {
  'flamebody_sear': 'flamebody',
  'gooey_cling': 'gooey',
  'lingering_aroma': 'lingeringaroma',
  'mummy_wrap': 'mummy',
  'perish_body': 'perishbody'
};
for (const [id, hex] of Object.entries(icons)) {
  const out = path.join(root, dirs[id], 'resources', 'assets', 'world_combat', 'textures', 'mob_effect', id + '.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, icon(hex));
  console.log('wrote', out, fs.statSync(out).size);
}
