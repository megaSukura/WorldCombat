/**
 * 木枝突刺 / branchpoke 的出手方式。
 *
 * 核心念头：**从最远处把一根细枝绷直、用末梢的弹劲戳一下**——全组射程最长、线条最细的一记；
 * 而且**打在最远端最疼**：枝条伸到尽头时末梢弯到极限、回弹最猛，贴脸时反而只有枝根的一小段。
 * 刺枝式把尖头削硬、命中时挂住目标使其短暂减速。
 *
 * 两幕：
 *   起（coil，提交前）：枝叶在身侧收拢、枝尖聚一点绿光，只播预告。
 *   戳（thrust → hit / miss，提交后）：沿**真实 3D 瞄准**绷出一根细枝；先用原生方块射线在真实接触点截枝
 *       （`WorldGeometry.blockHit` 的 `position()`，枝梢停在墙前）；再沿这条细枝用真实身体箱找**最近的**一个非友方，
 *       伤害 = `poke` ×(1 + `bend` × 接触距离/枝长)，越远越疼；刺枝式再按成功回执挂一记减速。
 *       `tip` 只在真的戳到目标时于接触点弹亮。
 *   主体过程由自定义场景 `move_branchpoke_twig` 画：一根细枝逐刻绷直、末梢在接触点弯弹、再收回，细叶随枝线陪衬；
 *       判定与表现共用同一组枝根/枝梢端点。
 *
 * 选取：`kind: "aim"`——可点任意阵营实体或一个世界点，朝空地也能戳空；命中权限仍由命中层判断。
 *
 * 与同族分开：藤鞭是一道远而宽的横扫鞭痕并连续抽；啄是中距单发；角撞是顶住推走；龙爪是两带交叉宽面；
 * 木枝突刺凭「最长、最细、越远越疼的一记直戳」认出来。
 *
 * 配置 `thorn` 由公式改威力、枝身与弹劲，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const branchpokeScene = "world_combat:move_branchpoke";
    const branchpokeTwigScene = "world_combat:move_branchpoke_twig";
    const branchpokeHitText = "world_combat.move.branchpoke.text.hit";
    const branchpokeSnareText = "world_combat.move.branchpoke.text.snare";
    const branchpokeMissText = "world_combat.move.branchpoke.text.miss";

    define({
        id: "branchpoke",
        cooldownParameter: "recharge",
        name: "Branch Poke",
        description: "从最远处把一根细枝绷直、用末梢的弹劲戳一下：全组射程最长、线条最细的一记，只戳中线上一个敌人。打在最远端最疼——枝条伸到尽头时末梢弯到极限、回弹最猛，贴脸时反而只有枝根的一小段。方块会把枝条挡在墙前；空戳立即收回。刺枝式再把尖头削硬，命中时挂住目标、短暂压低其移动速度。",
        uses: ["从最远处一记最细、最长的直戳", "站在枝条末端打满，越远越疼", "刺枝式扎住目标使其减速"],
        kind: "aim",
        range: 2.9,
        maxRange: 3.8,
        prepare: 6,
        active: 10,
        recover: 6,
        cooldown: 14,
        style: "stab",
        defaults: { thorn: false, ai: { maxChase: 7, fullExtension: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("branchpoke", "reach", pokemon), geometry: "line", style: "stab", color: 0x8CC24E,
                label: config && config.thorn === true ? "刺枝式" : "木枝突刺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["branchpoke"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("branchpoke", "tempo", context)),
                recover: Math.round(p("branchpoke", "aftercast", context)),
                cooldown: Math.round(p("branchpoke", "recharge", context)),
                active: skills["branchpoke"].active,
                range: p("branchpoke", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_branchpoke:coil", branchpokeScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, thorn: config && config.thorn === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const thorn = config && config.thorn === true;
            const aimed = aim(action);
            const heading = aimed.length() < 1e-6 ? action.direction() : aimed;
            const reach = Math.max(2.2, p("branchpoke", "reach", action));
            const twig = Math.max(0.14, p("branchpoke", "twig", action));
            const bend = Math.max(0.1, p("branchpoke", "bend", action));
            const power = p("branchpoke", "poke", action);
            const leaves = Math.max(8, Math.round(p("branchpoke", "leaves", action)));
            const snareTicks = Math.max(10, Math.round(p("branchpoke", "snareTicks", action)));
            const snareLevel = Math.max(1, Math.round(p("branchpoke", "snareLevel", action)));
            const intensity = Math.max(0.6, Math.min(2.0, power / 38));
            const actorRef = String(actor.ref());

            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            // 方块挡枝：在真实接触点截枝，枝梢停在墙前，墙后的人不再被算入。
            let length = reach;
            const wall = WorldGeometry.blockHit(world, origin, origin.plus(heading.scale(reach)));
            if (wall !== null) length = Math.max(0.1, Math.min(reach, wall.position().minus(origin).length()));
            const endpoint = origin.plus(heading.scale(length));

            // 真实 3D 细枝：用真实身体箱沿这条枝找最近的一个非友方，按接触距离排序，第一个拦下整枝。
            const candidates: { actor: CombatActor; at: CombatPoint; along: number }[] = [];
            if (length > 0.01) {
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(origin, endpoint, twig),
                    function (candidate, facts) {
                        if (String(candidate.ref()) === actorRef || facts.friendly()) return;
                        if (!world.clear(origin, facts.position())) return;
                        const near = world.closestPoint(candidate, origin);
                        candidates.push({ actor: candidate, at: near, along: near.minus(origin).length() });
                    });
                candidates.sort(function (a, b) { return a.along - b.along; });
            }
            const contactDistance = candidates.length > 0 ? candidates[0].along : length;
            const ratio = Math.max(0, Math.min(1, contactDistance / reach));
            const tipScale = 1 + bend * ratio;
            const contact = candidates.length > 0 ? candidates[0].at : endpoint;
            const direction = [heading.x(), heading.y(), heading.z()];

            sound(action, "minecraft:block.wood.hit");
            // 主体过程：一根细枝从枝根逐刻绷直、末梢在接触点弯弹、再收回；端点与判定共用。
            WorldFeedback.emit(world, branchpokeTwigScene, 1, origin,
                { moment: "twig", origin: [origin.x(), origin.y(), origin.z()], tip: [endpoint.x(), endpoint.y(), endpoint.z()],
                    contact: [contact.x(), contact.y(), contact.z()], hit: candidates.length > 0 ? 1 : 0,
                    length: length, twig: twig, ratio: ratio, scale: tipScale, leaves: leaves,
                    direction: direction, start: world.tick(), grow: 4, hold: 4, pull: 6 }, 18);

            const victim = candidates.length > 0 ? candidates[0].actor : null;
            if (victim === null) {
                WorldFeedback.emit(world, branchpokeScene, 1, endpoint,
                    { moment: "miss", leaves: Math.round(leaves * 0.6), scale: 0.8 }, 16);
                WorldFeedback.text(world, endpoint.plus(WorldCombat.point(0, 1.0, 0)), branchpokeMissText, [], 20);
                done(action);
                return;
            }

            if (!hurt(action, victim, "branchpoke", power * tipScale, { damage: damageSpec("branchpoke", "poke"), contact: true })) { done(action); return; }
            sound(action, "cobblemon:impact.grass");

            const now = world.observe(victim);
            const at = now === null ? contact : now.position();
            // tip 只在真的戳到目标时于接触点弹亮：越靠末梢（ratio 越大）回弹越猛，贴脸只是一记轻回弹。
            const tipLeaves = Math.max(4, Math.round(leaves * (0.4 + 0.6 * ratio)));
            WorldFeedback.emit(world, branchpokeScene, 1, at,
                { moment: "tip", leaves: leaves, tipLeaves: tipLeaves, scale: tipScale, thorn: thorn ? 1 : 0, intensity: intensity }, 16);
            WorldFeedback.emit(world, branchpokeScene, 1, at,
                { moment: "hit", target: String(victim.ref()), leaves: leaves, scale: tipScale, intensity: intensity }, 20);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), branchpokeHitText, [Math.round(tipScale * 100) / 100], 20);

            // 状态按成功回执：只有这次挂枝真的改变了目标身上的缓慢载体，才报出减速。
            if (thorn && world.valid(victim)) {
                const before = world.mobEffect(victim, "minecraft:slowness");
                world.marker(victim, "minecraft:slowness", snareTicks, snareLevel);
                const after = world.mobEffect(victim, "minecraft:slowness");
                const snared = after !== null && (before === null || String(after.key()) !== String(before.key()));
                if (snared) {
                    // 挂枝标记跟着实际载体：吸附在被挂住的这一个身上，并持续到这次减速真正结束的长度。
                    WorldFeedback.emit(world, branchpokeScene, 1, at,
                        { moment: "snare", target: String(victim.ref()), snareTicks: snareTicks, snareLevel: snareLevel, scale: tipScale }, snareTicks);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), branchpokeSnareText, [snareLevel + 1], 22);
                }
            }
            done(action);
        }
    });
}
