/**
 * 棉花防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上先鼓出一小团棉絮，随后一层层白绒向外推开、把自己裹住；绒衣在窗口里低密度地贴着身体，
 *   被撕光时绒毛簌簌落下。
 *
 * 色相家族：棉白（0xF6F3EA）为主体，暖米（0xE4D6C4）作外圈与烟，浅粉棕（0xE9C9B8）只做细节小点。没有第二个色相。
 * 层次：鼓絮（起）／向外推开的绒环、绒团与烟（击）／贴身的绒衣（收）／落下的绒（末）。
 * 起击收：bloom（鼓绒）→ wrap（裹住）→ coat（绒衣）→ bare（被撕光）。
 * 范围：绒环绑脚点、fit none，半径按 `data.scale`（实际鼓开半径 / 1.5）推出，画出来的圈就是绒衣护到的范围。
 * 运动：绒团由体内向外散、贴地飘；绒环一圈圈推开；绒衣期贴身缓缓上浮；被撕光时受重力落下。
 * 数：绒团量绑 `data.fluff`（体重派生），绒环层数绑 `data.layers`（等级派生），`data.scale` 同时放大整片半径与粒子尺寸。
 * 持续状态：绒衣窗口低密度、贴身、视线外（体表与身侧），玩家仍看得清目标。
 */
const CottonGuardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bloom: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "bloom_puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9, spin: 18,
                    lifetime: [8, 16], size: [0.14, 0.04],
                    color: 0xF6F3EA, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wrap: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "wrap_fluff", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "fluff", fallback: 26 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.5 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.93, gravity: 0.002, spin: 22,
                    lifetime: [16, 28], size: [0.22, 0.06],
                    color: 0xF6F3EA, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "wrap_ring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "layers", fallback: 3 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 1.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.44, 0.8], sizeMode: "index",
                    color: 0xE4D6C4, alpha: [0.55, 0], light: "world", maxParticles: 50
                },
                {
                    name: "wrap_puff", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [18, 30], size: [0.3, 0.6],
                    color: 0xE4D6C4, alpha: [0.28, 0], light: "world", maxParticles: 40
                }
            ]
        },
        coat: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "coat_fluff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 3, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03], spin: 14,
                    lifetime: [14, 22], size: [0.1, 0.03],
                    color: 0xF6F3EA, alpha: [0.3, 0], light: "world", maxParticles: 16
                },
                {
                    name: "coat_motes", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xE9C9B8, alpha: [0.3, 0], light: "world", maxParticles: 14
                }
            ]
        },
        bare: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bare_fall", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.04, drag: 0.92, spin: 20,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xEFE7D8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cottonguard", 1, CottonGuardDefinition);
