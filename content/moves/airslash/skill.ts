/**
 * 空气斩 / airslash —— 注册与动作。
 *
 * 核心念头：把空气压成一道极薄的月牙、笔直甩出去——它没有重量、不受重力，一路切开沿途的敌人而不停住，
 *   还能斩到空中的对手；被刃风扫过的人有机会一滞。
 *
 * 两幕：
 *   起（windup，提交前）：口边/身前的空气被拢成一道将成未成的刃线，只播预告，可被打断。
 *   斩（execute → hit / wall / miss）：提交后月牙沿玩家选定的方向/点飞出（可穿透 pierce 个额外目标）；
 *       每个被切中的非友方沿这条月牙只结算一次 `blade` 特殊伤害，并按 `flinchChance` 掷一次畏缩；
 *       刃撞到方块就断刃（`wallbreak`），整条线没人被切到且没撞墙则飞到尽头自行散去。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，瞄空中也成立；方块只做拦截，命中权限仍由命中层判断。
 *   `execute` 用 `aim(action)` 读取方向，不要求提交时存在敌人。
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
        cooldownParameter: "recharge",
        name: "Air Slash",
        description: "把空气压成一道笔直甩出的月牙：它一路切开沿途的敌人、也能斩到空中的目标，被刃风扫中的人有几率一滞。利刃式飞得更快、能多贯穿一个目标，但刃更窄更轻；阔风式刃身更宽、每刀更重。",
        uses: ["沿一条直线切开成排的敌人", "远距离先手，起手窗口里逼对手走位", "连空中的目标也一并切中"],
        kind: "aim",
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
            action.present("airslash:gather", airslashScene, 1, action.origin(), JSON.stringify({ moment: "gather" }));
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
            let settled = false, hits = 0, wall = false;

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
                direction: aim(action),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    // 方块只拦截：撞墙即断刃，给出明确的断口，不当作落空。
                    if (victim === null) {
                        if (!hit.blocked()) return;
                        wall = true;
                        WorldFeedback.emit(scope, airslashScene, 1, point,
                            { moment: "wallbreak", scale: scale, intensity: intensity, shards: shards }, 24);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), airslashWallText, [], 22);
                        sound(current, "minecraft:item.shield.break");
                        return;
                    }
                    if (!scope.valid(victim) || scope.friendly(victim) || hits > cap) return;
                    const landed = impact(current, hit, airslashId, power,
                        { damage: damageSpec(airslashId, "blade"), slice: true });
                    if (!landed) return;
                    hits++;
                    // 每次实体命中都在刃身该处裂开一个小口。
                    WorldFeedback.emit(scope, airslashScene, 1, point,
                        { moment: "cut", target: String(victim.ref()), shards: shards, scale: scale,
                            intensity: intensity }, 22);
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
                if (hits === 0 && !wall && body !== null) {
                    WorldFeedback.emit(scope, airslashScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.05, 0)), airslashMissText, [], 20);
                    sound(current, "cobblemon:move.gust.target");
                }
                done(current);
            });
            WorldFeedback.keep(world, "airslash:flight:" + action.id(), airslashScene, 1, action.origin(),
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity, shards: shards }, 180);
        }
    });

}
