/**
 * 空气斩 / airslash —— 注册与动作。
 *
 * 核心念头：把空气压成一道极薄的月牙、笔直甩出去——它没有重量、不受重力，一路切开沿途的敌人而不停住，
 *   还能斩到空中的对手；被刃风扫过的人有机会一滞。
 *
 * 两幕：
 *   起（windup，提交前）：口边/身前的空气被拢成一道将成未成的刃线，只播预告，可被打断。
 *   斩（execute → hit / miss）：提交后月牙沿瞄准方向飞出（可穿透 pierce 个额外目标）；
 *       每个被切中的非友方各结算一次 `blade` 特殊伤害，并按 `flinchChance` 掷一次畏缩；
 *       整条线没人被切到则刃飞到尽头自行散去。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `razor`（利刃式）由 resolve 改时序、由公式改飞行/贯穿/判定，提交后才触碰世界。
 */
namespace PokemonSkills {
    function airslashFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, airslashFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: airslashId,
        name: "Air Slash",
        description: "The user attacks with a blade of air that slices even the sky. This may also make the target flinch.",
        uses: ["沿一条直线切开成排的敌人", "远距离先手，起手窗口里逼对手走位", "把空中的目标也用风刃切下来"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "air",
        defaults: { razor: false, ai: { maxChase: 15 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(airslashId, "radius", pokemon) * 3.2, geometry: "line", style: "air", color: 0xDCE9F0,
                label: config && config.razor === true ? "利刃空气斩" : "空气斩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[airslashId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(airslashId, "tempo", context)),
                recover: Math.round(p(airslashId, "aftercast", context)),
                cooldown: Math.round(p(airslashId, "recharge", context)),
                active: 0,
                range: p(airslashId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("airslash:gather", airslashScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", razor: config && config.razor === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p(airslashId, "blade", action);
            const speed = p(airslashId, "flight", action);
            const radius = p(airslashId, "radius", action);
            const cap = Math.max(0, Math.round(p(airslashId, "pierce", action)));
            const chance = p(airslashId, "flinchChance", action);
            const flinchTicks = Math.round(p(airslashId, "flinchTicks", action));
            const shards = Math.max(12, Math.round(p(airslashId, "shards", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / airslashReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));
            let settled = false, hits = 0;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/slash", tint: 0xE8F4FA, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.3)),
                pierce: cap
            };

            sound(action, "cobblemon:move.gust.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), gravity: 0, radius: radius, lifetime: 180,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || hits > cap) return;
                    const landed = impact(current, hit, airslashId, power,
                        { damage: damageSpec(airslashId, "blade"), slice: true });
                    if (!landed) return;
                    hits++;
                    WorldFeedback.emit(scope, airslashScene, 1, point,
                        { moment: "cut", target: String(victim.ref()), shards: shards, scale: scale,
                            intensity: intensity, hits: hits }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)), airslashHitText, [hits], 22);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    if (scope.random() < chance && airslashFlinch(scope, victim, flinchTicks)) {
                        WorldFeedback.emit(scope, airslashScene, 1, point, { moment: "flinch", target: String(victim.ref()) }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), airslashFlinchText, [], 22);
                    }
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                if (hits === 0 && body !== null) {
                    WorldFeedback.emit(scope, airslashScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.05, 0)), airslashMissText, [], 20);
                    sound(current, "cobblemon:move.gust.target");
                }
                done(current);
            });
            WorldFeedback.keep(world, "airslash:flight:" + action.id(), airslashScene, 1, action.origin(),
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity, shards: shards }, 120);
        }
    });

}
