/**
 * 点到为止 / falseswipe 的出手方式。
 *
 * 核心念头：**一记极准的浅切，刃峰贴着要害停住**——明明能切开，却只在皮上划出一道细缝，目标至少留下 1 HP 站着。
 *
 * 两幕：
 *   起（windup，提交前）：沉肩递刃，刃尖在身前聚起一条极细的亮线。
 *   切（cut → strike，提交后）：`kind: "aim"`——朝任意方向或世界点递出 `reach` 格长的短刃，刀路只取
 *       **真正的第一个接触**：`action.trace(from, end, edge, true)` 把友方身体与实墙都算作接触，所以前排的人或墙会先截住刀路，
 *       不会隔墙、隔人锁到后排。第一个接触是非友方活体时结算 `cut`；否则刀停在那里，不造成伤害。
 *       留手由本次伤害自带的 `minimumHealth: 1` 实现：宿主在该次原生 hurt 的所有 Pre 监听者之后截断生命减量，
 *       仍沿原生吸收链，不改动、也不保护任何其他攻击。
 *
 * 与同族分开：手下留情是一记面向前方的扇形横扫、能同时留手好几个；点到为止是单点精准的细切，快、窄、贴地，
 * 画面上只有一道细缝，且只碰准心前的第一个目标。
 *
 * 配置 `full`（全力收手）由 resolve 改时序、由公式改威力／切距：开启＝更沉更慢；关闭＝更轻更利落。
 */
namespace PokemonSkills {
    const falseSwipeId = "falseswipe";
    const falseSwipeScene = "world_combat:move_falseswipe";
    const falseSwipeSpareText = "world_combat.move.falseswipe.text.spare";
    const falseSwipeMissText = "world_combat.move.falseswipe.text.miss";

    define({
        id: falseSwipeId,
        cooldownParameter: "recharge",
        name: "False Swipe",
        description: "一记极准的浅切：朝瞄准方向递出一条细刃，只切中刀路上的第一个非友方，命中什么都只会削血，目标至少留下 1 HP。刀路很窄，墙和挡路的身体会先截住它，不会顺带划到后排。全力收手更沉更慢，轻手更轻更快。",
        uses: ["把目标削到 1 HP 便于捕捉", "对必须留活的对手保持压制", "在不杀死目标的前提下磨掉威胁"],
        kind: "aim",
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
            const actor = action.actor();
            const self = world.observe(actor);
            const base = self === null ? action.origin() : self.position();
            const aimPoint = action.targetPosition();
            const reach = p(falseSwipeId, "reach", action);
            const edge = p(falseSwipeId, "edge", action);
            const depth = p(falseSwipeId, "depth", action);
            const power = p(falseSwipeId, "cut", action);
            const hold = Math.max(8, Math.round(p(falseSwipeId, "hold", action)));
            const scale = Math.max(0.6, Math.min(2.0, edge / 0.34));
            const intensity = Math.max(0.6, Math.min(2.4, power / 44));
            // 刀口高度：身体越高，刃从脚尖抬得越高；刀路也从这里朝瞄准点递出。
            const half = self === null ? 0.7 : self.height() / 2;
            const lift = Math.max(-0.2, Math.min(0.9, depth - half));
            const from = base.plus(WorldCombat.point(0, lift, 0));
            const delta = aimPoint.minus(from);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const end = from.plus(direction.scale(reach));

            // 权威判定先行：刀路的第一接触（含友方身体与实墙）就是刃锋真实停下的地方。
            const contact = action.trace(from, end, edge, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const blade = [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]];

            WorldFeedback.emit(world, falseSwipeScene, 1, from,
                { moment: "cut", path: blade, hold: hold, scale: scale, intensity: intensity, depth: depth }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");

            if (victim !== null && world.valid(victim)) {
                const landed = impact(action, contact, falseSwipeId, power,
                    { damage: damageSpec(falseSwipeId, "cut"), contact: true, minimumHealth: 1 });
                if (landed) {
                    WorldFeedback.emit(world, falseSwipeScene, 1, at,
                        { moment: "strike", target: String(victim.ref()), hold: hold, scale: scale, intensity: intensity }, 18);
                    sound(action, "cobblemon:impact.normal");
                } else {
                    // 伤害被拒（如免疫）：不声称命中，只留一记软收。
                    WorldFeedback.emit(world, falseSwipeScene, 1, at, { moment: "miss", scale: scale, blocked: 0 }, 16);
                }
            } else {
                // 友方身体或实墙先截住刀路：刃停在接触点，不结算敌方伤害，也不声称命中。
                WorldFeedback.emit(world, falseSwipeScene, 1, at,
                    { moment: "miss", scale: scale, blocked: contact.blocked() ? 1 : 0 }, 18);
                if (!contact.blocked() && lander === null)
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), falseSwipeMissText, [], 20);
            }
            done(action);
        }
    });

    // 收手标记：这一击真正被 1 HP 下限截停、目标确实保住了 1 HP 时，在命中处补一记近白的收手标记与浮字。
    // 读 damage_applied 的实际结果（after <= 1），不把「伤害被接受」当成「到达 1 HP」。
    WorldCombat.on("world_combat:move_falseswipe/spare", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== falseSwipeId || !(data.actual > 0)) return;
        if (typeof data.after !== "number" || data.after > 1) return;
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
