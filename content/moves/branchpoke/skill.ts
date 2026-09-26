/**
 * 木枝突刺 / branchpoke 的出手方式。
 *
 * 核心念头：**从最远处把一根细枝绷直、用末梢的弹劲戳一下**——全组射程最长、线条最细的一记；
 * 而且**打在最远端最疼**：枝条伸到尽头时末梢弯到极限、回弹最猛，贴脸时反而只有枝根的一小段。
 * 刺枝式把尖头削硬、命中时挂住目标使其短暂减速。
 *
 * 两幕：
 *   起（coil，提交前）：枝叶在身侧收拢、枝尖聚一点绿光，只播预告。
 *   戳（thrust → hit / miss，提交后）：沿瞄准方向把枝条绷直，先由原生方块射线裁出实际枝线（方块挡枝，枝梢停在墙前）；
 *       再取这条细线上第一个非友方，伤害 = `poke` ×(1 + `bend` × 目标距离/枝长)，越远越疼；刺枝式再挂 `snareTicks` 的减速。
 *       `tip` 只在真的戳到目标时于接触点弹亮，近处命中只是一记轻回弹；空戳立即收回，不发光。
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
    const branchpokeHitText = "world_combat.move.branchpoke.text.hit";
    const branchpokeSnareText = "world_combat.move.branchpoke.text.snare";
    const branchpokeMissText = "world_combat.move.branchpoke.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function branchpokeHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 枝线判定与画面共用的顶点：原点到枝梢的一条细线。 */
    function branchpokeLine(origin: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const tip = origin.plus(heading.scale(reach));
        return [[origin.x(), origin.y(), origin.z()], [tip.x(), tip.y(), tip.z()]];
    }

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
            const heading = branchpokeHeading(aim(action));
            const reach = Math.max(2.2, p("branchpoke", "reach", action));
            const twig = Math.max(0.14, p("branchpoke", "twig", action));
            const bend = Math.max(0.1, p("branchpoke", "bend", action));
            const power = p("branchpoke", "poke", action);
            const leaves = Math.max(8, Math.round(p("branchpoke", "leaves", action)));
            const snareTicks = Math.max(10, Math.round(p("branchpoke", "snareTicks", action)));
            const snareLevel = Math.max(1, Math.round(p("branchpoke", "snareLevel", action)));
            const intensity = Math.max(0.6, Math.min(2.0, power / 38));
            const direction = [heading.x(), heading.y(), heading.z()];

            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            // 方块挡枝：原生方块射线裁出实际枝线，枝梢停在墙前，墙后的人不再被算入。
            let length = reach;
            const clip = world.clipBlocks(origin, origin.plus(heading.scale(reach)));
            if (clip !== null && clip.blocked()) {
                const wall = clip.blockPosition();
                if (wall !== null) length = Math.max(0.4, Math.min(reach, wall.minus(origin).length()));
            }
            const endpoint = origin.plus(heading.scale(length));
            const line = branchpokeLine(origin, heading, length);

            sound(action, "minecraft:block.wood.hit");
            WorldFeedback.emit(world, branchpokeScene, 1, origin,
                { moment: "thrust", path: line, direction: direction, reach: length, leaves: leaves,
                    thorn: thorn ? 1 : 0, intensity: intensity }, 16);

            const found: CombatActor[] = [];
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, length, twig, { below: 1.2, above: 1.6 }),
                function (candidate) { if (found.length === 0) found.push(candidate); });
            if (found.length === 0) {
                WorldFeedback.emit(world, branchpokeScene, 1, endpoint,
                    { moment: "miss", leaves: Math.round(leaves * 0.6), scale: 0.8 }, 16);
                WorldFeedback.text(world, endpoint.plus(WorldCombat.point(0, 1.0, 0)), branchpokeMissText, [], 20);
                done(action);
                return;
            }

            const victim = found[0];
            const foe = world.observe(victim);
            if (foe === null) { done(action); return; }
            const delta = foe.position().minus(origin);
            const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
            const ratio = Math.max(0, Math.min(1, flat / reach));
            const tipScale = 1 + bend * ratio;
            if (!hurt(action, victim, "branchpoke", power * tipScale, { damage: damageSpec("branchpoke", "poke"), contact: true })) { done(action); return; }
            sound(action, "cobblemon:impact.grass");

            const now = world.observe(victim);
            const at = now === null ? foe.position() : now.position();
            // tip 只在真的戳到目标时于接触点弹亮：越靠末梢（ratio 越大）回弹越猛，贴脸只是一记轻回弹。
            const tipLeaves = Math.max(4, Math.round(leaves * (0.4 + 0.6 * ratio)));
            WorldFeedback.emit(world, branchpokeScene, 1, at,
                { moment: "tip", leaves: leaves, tipLeaves: tipLeaves, scale: tipScale, thorn: thorn ? 1 : 0, intensity: intensity }, 16);
            WorldFeedback.emit(world, branchpokeScene, 1, at,
                { moment: "hit", target: String(victim.ref()), leaves: leaves, scale: tipScale, intensity: intensity }, 20);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), branchpokeHitText, [Math.round(tipScale * 100) / 100], 20);

            if (thorn && world.valid(victim)) {
                world.marker(victim, "minecraft:slowness", snareTicks, snareLevel);
                WorldFeedback.emit(world, branchpokeScene, 1, at,
                    { moment: "snare", target: String(victim.ref()), snareTicks: snareTicks, snareLevel: snareLevel, scale: tipScale }, 22);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), branchpokeSnareText, [snareLevel + 1], 22);
            }
            done(action);
        }
    });
}
