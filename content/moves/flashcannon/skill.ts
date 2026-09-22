/**
 * 加农光炮 / flashcannon —— 注册与动作。
 *
 * 三幕：
 *   聚（converge，提交前）：全身的光被收进身前后一点、越收越亮（`action.present` 预告）。
 *   射（travel，提交后）：一条高速光矛沿准线射出；命中活物时结算一次特殊伤害，并按 `pierce` 继续穿过
 *       后面的目标，每穿过一人威力按 `falloff` 衰减；按概率用共享 `NativeEffects.boost(..., "spd", -1)` 压低特防。
 *   散（fizzle）：撞上墙或没打中人时只留一下散光。
 *
 * 与同族分开：磨防远击四式里唯一命中 100、不偏线、能一发贯穿一条线上多人的那个；单发最轻，且被墙挡住。
 * 配置 `focus`（集束）由 resolve 改时序、由公式改威力／贯穿数。
 */
namespace PokemonSkills {
    const flashcannonScene = "world_combat:move_flashcannon";
    const flashcannonSunderText = "world_combat.move.flashcannon.text.sunder";

    define({
        id: "flashcannon",
        name: "Flash Cannon",
        description: "把全身的光收进一点、射出一条高速光矛：命中第一个敌人造成特殊伤害，并可贯穿直线上的后续目标（逐个衰减）；可能把每个命中目标的特防压低 1 级。被墙挡住。",
        uses: ["一发扫掉排成一条线的敌人", "穿透并逐个压低沿线目标的特防", "中远距离的高精度单体射杀"],
        kind: "enemy",
        range: 14,
        maxRange: 20,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 32,
        style: "beam",
        defaults: { focus: false, ai: { maxChase: 16, lineUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flashcannon", "reach", pokemon), geometry: "line", style: "beam",
                color: 0xBFE8FF, label: config && config.focus === true ? "集束加农光炮" : "贯穿加农光炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flashcannon"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p("flashcannon", "converge", context)),
                recover: 10,
                cooldown: 32 + (focus ? -3 : 3),
                active: 0,
                range: p("flashcannon", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:flashcannon:" + action.id(), flashcannonScene, 1, action.origin(),
                JSON.stringify({ moment: "converge", beams: Math.round(p("flashcannon", "beams", action)),
                    focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("flashcannon", "core", action);
            const falloff = p("flashcannon", "falloff", action);
            const pierce = Math.max(0, Math.round(p("flashcannon", "pierce", action)));
            const speed = p("flashcannon", "velocity", action);
            const radius = p("flashcannon", "radius", action);
            const chance = p("flashcannon", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("flashcannon", "sunderStage", action)));
            const beams = Math.max(14, Math.round(p("flashcannon", "beams", action)));
            const scale = Math.max(0.5, Math.min(2.4, power / 80));
            let index = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:block.beacon.activate");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                lifetime: Math.max(24, Math.round(action.range() / Math.max(0.2, speed) + 16)),
                appearance: {
                    sprite: "cobblemon:generic/orb/energyorb", tint: 0xBFE8FF, glow: true, pierce: pierce,
                    scale: Math.max(0.9, Math.min(2.0, radius / 0.24))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, flashcannonScene, 1, hit.position(),
                            { moment: "fizzle", beams: beams, scale: scale }, 20);
                        return;
                    }
                    const shot = Math.max(1, power * Math.pow(falloff, index));
                    index++;
                    const landed = impact(current, hit, "flashcannon", shot, { damage: damageSpec("flashcannon", "core") });
                    if (!landed) return;
                    hits++;
                    WorldFeedback.emit(scope, flashcannonScene, 1, hit.position(),
                        { moment: "hit", target: String(victim.ref()), beams: beams, scale: scale,
                            intensity: Math.max(0.5, Math.min(2.2, shot / 80)), index: index }, 24);
                    sound(current, "cobblemon:impact.steel");
                    if (scope.valid(victim) && scope.random() < chance) {
                        NativeEffects.boost(scope, victim, "spd", -stages);
                        const at = scope.observe(victim);
                        if (at !== null)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), flashcannonSunderText, [stages], 30);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "flashcannon:trail:" + action.id(), flashcannonScene, 1, origin,
                { moment: "travel", projectile: flight, beams: beams, scale: scale }, 90);
        }
    });
}
