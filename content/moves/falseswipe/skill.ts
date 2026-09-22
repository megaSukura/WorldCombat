/**
 * 点到为止 / falseswipe 的出手方式。
 *
 * 核心念头：**一记极准的浅切，刃峰贴着要害停住**——明明能切开，却只在皮上划出一道细缝，目标至少留下 1 HP 站着。
 *
 * 两幕：
 *   起（windup，提交前）：沉肩递刃，刃尖在身前聚起一条极细的亮线。
 *   切（cut → strike，提交后）：沿身前 `reach` 格长、`edge` 半宽的窄缝划一记接触浅切，缝里的非友方各挨一下；
 *       命中处闪出一道近白的收手标记。任何可能致命的数值都由 `world_combat:falseswipe_mercy` 拦截效果截停在「至少剩 1 HP」，
 *       所以这一刀只会削血，不会打倒。
 *
 * 与同族分开：手下留情是一记面向前方扇形的横扫、能同时留手好几个；点到为止是单点精准的细切，快、窄、贴地，
 * 画面上只有一道细缝。
 *
 * 配置 `full`（全力收手）由 resolve 改时序、由公式改威力／切距：开启＝更沉更慢；关闭＝更轻更利落。
 */
namespace PokemonSkills {
    const falseSwipeId = "falseswipe";
    const falseSwipeScene = "world_combat:move_falseswipe";
    const falseSwipeMercy = "world_combat:falseswipe_mercy";
    const falseSwipeSpareText = "world_combat.move.falseswipe.text.spare";
    const falseSwipeMissText = "world_combat.move.falseswipe.text.miss";

    /** 拦截这一刀的致命数值：把 incoming 数额截到「目标结算后至少剩 1 HP」，其余结算不变。 */
    WorldCombat.effect(falseSwipeMercy, 1, 40, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(falseSwipeMercy, "start", function (effect) {
        effect.listen("world_combat:incoming", "world_combat:intercept", "intercept");
    });
    WorldCombat.effectHandler(falseSwipeMercy, "intercept", function (effect) {
        const event = effect.event();
        if (String(event.target().key()) !== String(effect.target().key())) return;
        if (String(event.source().key()) !== String(effect.source().key())) return;
        const data = JSON.parse(String(event.payload()));
        if (String(data.move) !== falseSwipeId || !(data.amount > 0)) return;
        const world = effect.world(), body = world.observe(effect.target());
        if (body === null) { effect.end(); return; }
        const cap = Math.max(0, body.health() - 1);
        if (data.amount > cap) { data.amount = cap; data.mercy = true; event.payload(JSON.stringify(data)); }
        effect.end();
    });

    /** 窄缝四角：origin 起，朝 direction 长 reach、半宽 half；判定与表现共用。 */
    function falseSwipeLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: falseSwipeId,
        name: "False Swipe",
        description: "一记极准的浅切：沿身前一条细缝划过去，命中什么都只会削血，目标至少留下 1 HP。全力收手更沉更慢，轻手更轻更快。",
        uses: ["把目标削到 1 HP 便于捕捉", "对必须留活的对手保持压制", "在不杀死目标的前提下磨掉威胁"],
        kind: "enemy",
        range: 2.2,
        maxRange: 2.8,
        prepare: 8,
        active: 14,
        recover: 7,
        cooldown: 26,
        style: "slash",
        defaults: { full: false, ai: { maxChase: 6, spareHigh: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(falseSwipeId, "reach", pokemon), geometry: "line", style: "slash",
                color: 0xF2F6FF, label: config && config.full === true ? "全力收手" : "点到为止" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[falseSwipeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(falseSwipeId, "tempo", context)),
                recover: Math.round(p(falseSwipeId, "aftercast", context)),
                cooldown: Math.round(p(falseSwipeId, "recharge", context)),
                active: skills[falseSwipeId].active,
                range: p(falseSwipeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_falseswipe:windup", falseSwipeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", full: config && config.full === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const reach = p(falseSwipeId, "reach", action);
            const edge = p(falseSwipeId, "edge", action);
            const depth = p(falseSwipeId, "depth", action);
            const power = p(falseSwipeId, "cut", action);
            const hold = Math.max(8, Math.round(p(falseSwipeId, "hold", action)));
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const scale = Math.max(0.6, Math.min(2.0, edge / 0.34));
            const intensity = Math.max(0.6, Math.min(2.4, power / 44));
            const path = falseSwipeLane(origin, direction, reach, edge);
            let hits = 0; const first = { ref: "" };

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, edge, { below: 0.8, above: depth }),
                function (victim, facts) {
                    world.effect(falseSwipeMercy, victim, "{}", 12);
                    if (!hurt(action, victim, falseSwipeId, power, { damage: damageSpec(falseSwipeId, "cut"), contact: true })) return;
                    if (hits === 0) first.ref = String(victim.ref());
                    hits++;
                    WorldFeedback.emit(world, falseSwipeScene, 1, facts.position(),
                        { moment: "strike", target: String(victim.ref()), hold: hold, scale: scale, intensity: intensity }, 18);
                });

            WorldFeedback.emit(world, falseSwipeScene, 1, origin,
                { moment: "cut", path: path, hold: hold, hits: hits, depth: depth,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (hits === 0) {
                WorldFeedback.emit(world, falseSwipeScene, 1, origin.plus(direction.scale(reach)), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), falseSwipeMissText, [], 20);
            }
            done(action);
        }
    });

    // 收手标记：这一击被 mercy 截停、目标保住了 1 HP 时，在命中处补一记近白的收手标记与浮字。
    WorldCombat.on("world_combat:move_falseswipe/spare", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== falseSwipeId || data.mercy !== true) return;
        const world = event.world(), target = event.target();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, falseSwipeScene, 1, at,
            { moment: "spare", target: String(target.ref()), hold: Math.max(1, Math.round(Math.min(4, (data.before || 1) / 40 + 1))),
                scale: 1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), falseSwipeSpareText, [], 30);
        world.sound("minecraft:entity.player.attack.nodamage", at, 14, "{}");
    });
}
