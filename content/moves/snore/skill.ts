/**
 * 打鼾 / snore 的出手方式。
 *
 * 核心念头：睡着的人自己控制不了，身体漏出的一声鼾却会朝对手的方向喷出去；睡得越沉，这一声越响。
 * 它只能在睡着时成立——睡着的人本来什么都做不了，所以这一招是从睡眠里挤出来的一次反击。
 *
 * 两幕（回响开启时是同一幕连演两次）：
 *   起（windup，提交前）：翻身、口鼻边聚起一圈睡泡的预告。
 *   鼾（blast → hit/miss）：提交后从口鼻朝目标喷出一道声波；命中一震并掷一次畏缩，落空就散在空气里。
 *       回响开启时，隔 `gap` 刻再喷一声。
 *
 * 与同族的区分：吵闹是以醒着的自己为圆心、连喊数圈、阻止周围人入睡的持续声浪；
 * 打鼾是睡着时朝一个目标喷出的当场鼾声，只有一响或两响，直接把对手震懵。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const snoreScene = "world_combat:move_snore";
    const snoreFlinchEffect = "world_combat:snore_flinch";
    const snoreFlinchText = "world_combat.move.snore.text.flinch";
    const snoreHitText = "world_combat.move.snore.text.hit";
    const snoreMissText = "world_combat.move.snore.text.miss";

    function snoreFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, snoreFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "snore",
        cooldownParameter: "recharge",
        name: "Snore",
        description: "只能在睡觉时使用：朝目标喷出一声鼾，造成特殊伤害并可能把它震懵；开启回响会连喷两声，每声更轻。睡得越沉，鼾声越响、送得越远。",
        uses: ["睡眠中被打时的还手", "把近身的目标震懵，给自己争取醒来的空档", "用回响连掷两次畏缩"],
        kind: "enemy",
        range: 9,
        maxRange: 16,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "snore",
        defaults: { echo: false, ai: { maxChase: 12 } },
        fields: [],
        eligibility: function (context) {
            if (CombatStatus.behaves(context.world, context.actor, "sleep")) delete context.blocked.asleep;
            else context.blocked["not-asleep"] = true;
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["snore"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("snore", "stir", context)),
                recover: Math.round(p("snore", "settle", context)),
                cooldown: Math.round(p("snore", "recharge", context)),
                active: 0,
                range: p("snore", "span", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: p("snore", "span", pokemon), geometry: "line", style: "snore",
                label: config && config.echo === true ? "打鼾·回响" : "打鼾" };
        },
        windup: function (action, config, prepare) {
            action.present("snore:windup", snoreScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", echo: config && config.echo === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("snore", "blast", action);
            const span = p("snore", "span", action);
            const radius = p("snore", "width", action);
            const echoes = Math.max(1, Math.round(p("snore", "echoes", action)));
            const gap = Math.max(1, Math.round(p("snore", "gap", action)));
            const chance = p("snore", "flinchChance", action);
            const flinchTicks = Math.round(p("snore", "flinchTicks", action));
            const rings = Math.max(6, Math.round(8 + span * 1.2));
            const count = Math.max(8, Math.round(10 + power * 0.3));
            const intensity = Math.max(0.5, Math.min(2, power / 50));
            const scale = radius / 0.55;
            let fired = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            sound(action, "cobblemon:move.sing.actor");

            function burst(current: CombatAction, index: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                const mouth = (body === null ? current.origin() : body.position()).plus(WorldCombat.point(0, 0.4, 0));
                let direction = aim(current);
                const selected = current.target();
                if (selected !== null && scope.valid(selected)) {
                    const at = scope.observe(selected);
                    if (at !== null) {
                        const delta = at.position().minus(mouth);
                        if (delta.length() > 0.05) direction = delta.unit();
                    }
                }
                const end = mouth.plus(direction.scale(span));
                const hit = current.trace(mouth, end, radius);
                WorldFeedback.emit(scope, snoreScene, 1, mouth,
                    { moment: "blast", path: [[mouth.x(), mouth.y(), mouth.z()], [end.x(), end.y(), end.z()]],
                        direction: [direction.x(), direction.y(), direction.z()], rings: rings, count: count, scale: scale, intensity: intensity, echo: index }, 18);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const landed = impact(current, hit, "snore", power, { damage: damageSpec("snore", "blast"), sound: true });
                    if (landed && victim !== null && scope.valid(victim)) {
                        hits++;
                        WorldFeedback.emit(scope, snoreScene, 1, hit.position(),
                            { moment: "hit", target: String(victim.ref()), count: count, scale: scale, intensity: intensity }, 24);
                        if (scope.random() < chance && snoreFlinch(scope, victim, flinchTicks)) {
                            WorldFeedback.emit(scope, snoreScene, 1, hit.position(), { moment: "flinch", target: String(victim.ref()) }, 24);
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), snoreFlinchText, [], 26);
                        }
                    }
                    sound(current, "cobblemon:impact.normal");
                } else {
                    WorldFeedback.emit(scope, snoreScene, 1, end, { moment: "miss", scale: scale }, 16);
                }
                fired++;
                if (fired >= echoes) {
                    if (hits === 0) WorldFeedback.text(scope, mouth.plus(WorldCombat.point(0, 0.8, 0)), snoreMissText, [], 22);
                    else WorldFeedback.text(scope, mouth.plus(WorldCombat.point(0, 0.8, 0)), snoreHitText, [hits], 26);
                    finish(current);
                    return;
                }
                current.after(gap, function (next) { burst(next, index + 1); });
            }
            burst(action, 0);
        }
    });

    NativeLoadout.availableWhen("snore", function (world) {
        return CombatStatus.behaves(world, world.source(), "sleep") ? "" : "not-asleep";
    });
}
