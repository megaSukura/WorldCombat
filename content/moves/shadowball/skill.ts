/**
 * 暗影球 / shadowball —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：黑影在身前被攥成一团、向内收紧（`action.present` 预告）。
 *   飞（travel，提交后）：暗影团沿瞄准方向沿直线高速飞出，带剥落的阴气尾迹；瞄准点为空也照样射出。
 *   击（burst / fizzle）：命中活物时结算一次特殊伤害，爆散的强度读取这次实际造成的伤害回执（0 伤害不冒爆）；
 *       按概率用共享的 `NativeEffects.boost(..., "spd", -1)` 削掉目标特防，只有真的降级成功才在目标身上短暂
 *       贴住一层影子（`cling`）。打空、被吸收或撞到方块只留一下散影。
 *
 * 与同族分开：磨防四式里只有它是真实投射物、只打单体、命中后影子会附着在目标身上。
 * 配置 `dense`（凝影）由 resolve 改时序、由公式改威力／速度／射程。
 */
namespace PokemonSkills {
    const shadowballScene = "world_combat:move_shadowball";
    const shadowballSunderText = "world_combat.move.shadowball.text.sunder";

    define({
        id: "shadowball",
        name: "Shadow Ball",
        description: "掷出一团活的暗影，直线飞行命中目标：造成特殊伤害，并可能把目标特防压低 1 级，触发时影子会短暂贴在目标身上。",
        uses: ["中距离的单体点射", "用暗影附着磨掉对手的特防", "隔着一段距离先手压血"],
        kind: "aim",
        range: 13,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "ghost",
        defaults: { dense: false, ai: { maxChase: 16, sunderFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shadowball", "reach", pokemon), geometry: "line", style: "ghost", color: 0x6B4FA8, label: "暗影球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shadowball"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const dense = !!(config && config.dense);
            return {
                prepare: Math.round(p("shadowball", "tempo", context)),
                recover: 8,
                cooldown: 34 + (dense ? 4 : 0),
                active: 0,
                range: p("shadowball", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:shadowball:" + action.id(), shadowballScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config && config.dense ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("shadowball", "core", action);
            const speed = p("shadowball", "velocity", action);
            const radius = p("shadowball", "radius", action);
            const chance = p("shadowball", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("shadowball", "sunderStage", action)));
            const cling = Math.max(40, Math.round(p("shadowball", "clingTicks", action)));
            const shards = Math.max(12, Math.round(p("shadowball", "shards", action)));
            const scale = Math.max(0.6, Math.min(2.4, power / 70));
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 爆散由实际伤害回执驱动：把这一次施法的基准碎缕数与尺度交给 damage_applied 处理器。
            action.data("shadowball/burst", JSON.stringify({ shards: shards, scale: scale }));

            sound(action, "cobblemon:move.shadowball.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/largefadeorb", tint: 0x6B4FA8, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.22))
            };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "shadowball", power, { damage: damageSpec("shadowball", "core") });
                        // 爆散不由这里发：真实的伤害回执（damage_applied）决定强度，未被吸收才冒爆。
                        if (!landed) {
                            WorldFeedback.emit(scope, shadowballScene, 1, point, { moment: "fizzle", shards: shards, scale: scale }, 22);
                            return;
                        }
                        if (scope.valid(victim) && scope.random() < chance) {
                            const applied = NativeEffects.boost(scope, victim, "spd", -stages);
                            if (applied !== 0) {
                                const body = scope.observe(victim);
                                if (body !== null) {
                                    WorldFeedback.keep(scope, "shadowball:cling:" + String(victim.ref()), shadowballScene, 1, body.position(),
                                        { moment: "cling", target: String(victim.ref()), stages: stages, shards: shards, scale: scale }, cling);
                                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), shadowballSunderText, [stages], 30);
                                }
                            }
                        }
                        sound(current, "cobblemon:move.shadowball.target");
                    } else {
                        WorldFeedback.emit(scope, shadowballScene, 1, point, { moment: "fizzle", shards: shards, scale: scale }, 22);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "shadowball:trail:" + action.id(), shadowballScene, 1, origin,
                { moment: "travel", projectile: flight, scale: scale, shards: shards }, 90);
        }
    });

    // 命中爆散：由共享结算给出的实际伤害回执驱动，强度随真实伤害变化；被吸收（0 伤害）不冒爆。
    // 本招基准碎缕数与尺度经施法动作的 data 传入，动作结束后回退到默认。
    WorldCombat.on("world_combat:shadowball/impact", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const action = event.action();
        // 以伤害元数据里的招式为据；个别投射物回执没有 move 时用施法动作的 content 兜底。
        const owned = action !== null && String(action.content()) === "world_combat:shadowball";
        if (String(data.move || "") !== "shadowball" && !owned) return;
        const target = event.target();
        if (target === null || typeof data.x !== "number" || typeof data.y !== "number" || typeof data.z !== "number") return;
        let shards = 14, scale = 1;
        if (action !== null) {
            const raw = action.data("shadowball/burst");
            if (raw !== null) {
                try {
                    const value = JSON.parse(raw);
                    if (typeof value.shards === "number" && isFinite(value.shards)) shards = value.shards;
                    if (typeof value.scale === "number" && isFinite(value.scale)) scale = value.scale;
                } catch (error) { /* keep the defaults */ }
            }
        }
        const intensity = Math.max(0.5, Math.min(2.2, 0.5 + data.actual / 40));
        WorldFeedback.emit(event.world(), shadowballScene, 1, WorldCombat.point(data.x, data.y, data.z),
            { moment: "burst", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 28);
    });
}
