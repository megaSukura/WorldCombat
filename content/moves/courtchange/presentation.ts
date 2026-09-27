/**
 * 换场 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：选点处先结出一圈品红的法阵（就是实际换场半径），随后念力一圈圈向外扫过战场；每一处真正换了主人的领域
 *   在它自己的位置亮起：被自己接管的朝施法者方向连出亮品红光带，交给敌人的朝新主人方向连出近白光带；没有可换的
 *   领域时只留下一声空响。
 *
 * 色相家族：品红（0xE07AD8）为主体，近白（0xFBE3F6）做高光与法阵边缘；没有第二个色相。
 * 层次：结阵（起手，选点处按真实半径向里收）／扫场（swap 大环一圈圈向外）／归属（owners 逐场画出新主人方向）／空。
 * 起击收：sigil（结阵，放选点）→ swap（扫场）→ owners（逐场归属）→（无领域时）empty。
 * 范围：`sigil` 与 `swap` 的大环绑落点、fit none，半径按 `data.scale`（实际换场半径 / 4）推出，画出来的圈就是
 *   法阵波及的范围；`owners` 是自定义场景，读 `data.cases`（每处成功换主的领域位置、半径与新主人位置），逐场画环与连线。
 * 运动：念力从落点向外扫开；领域处在原位标出归属方向；无领域时空环收缩。
 * 数：法阵圈数绑 `data.waves`（等级派生，用 burst.repeats 逐圈推），光点数绑 `data.motes`（特攻派生），
 *   实际被换的领域数 `data.fields`（以及收到的 taken、交出的 given）决定亮度 `data.intensity`。
 */
const CourtChangeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sigil: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "sigil_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 16, shape: { kind: "ring", radius: 4.0 },
                    direction: "inward", speed: [0.04, 0.12], spin: 8,
                    lifetime: [10, 16], size: [0.3, 0.6], sizeMode: "index",
                    color: 0xE07AD8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "sigil_mote", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 14, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFBE3F6, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        swap: {
            duration: 44,
            exit: { stop: 18, drain: 28 },
            emitters: [
                {
                    name: "swap_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 26, interval: 9, repeats: { data: "waves", fallback: 2 } },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [18, 28], size: [0.6, 1.1], sizeMode: "index",
                    color: 0xFBE3F6, alpha: [0.55, 0], light: "full", maxParticles: 44
                },
                {
                    name: "swap_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xE07AD8, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        empty: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "empty_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.3, 0.06],
                    color: 0xFBE3F6, alpha: [0.3, 0], light: "world", maxParticles: 18
                },
                {
                    name: "empty_mote", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xE07AD8, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_courtchange", 1, CourtChangeDefinition);

// 逐场归属：每个成功换主的领域在它自己的位置画一圈（半径就是该领域的真实半径），并朝新主人方向连一条光带——
// 接管用亮品红、交出用近白，一眼看清哪处归了谁、交给谁。数据来自 execute 里世界 reassign 的真实回执。
WorldCombatClient.scene("world_combat:move_courtchange_owners", 1, function (frame) {
    const entry: CombatSceneEntry<{ cases: { x: number; y: number; z: number; r: number; taken: number; ox: number; oy: number; oz: number }[] }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const cases = entry.data.cases || [];
    for (let i = 0; i < cases.length; i++) {
        const one = cases[i];
        const colour = one.taken ? 0xD0E07AD8 : 0xC0FBE3F6;
        frame.ring(one.x, one.y + 0.08, one.z, Math.max(0.3, one.r), colour);
        frame.line(one.x, one.y + 0.3, one.z, one.ox, one.oy + 0.3, one.oz, colour);
    }
});
