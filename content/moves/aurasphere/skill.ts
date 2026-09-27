/**
 * 波导弹 / aurasphere —— 注册与动作。
 *
 * 核心念头：一颗会自己拐弯的波导球。球飞出去以后按 `turn` 每刻朝目标修正方向，所以正常走位甩不掉；
 *   但转向有上限、墙体能挡、目标若跑出锁定距离也会跟丢——「必中」是贴近的，不是无条件。
 *
 * 两幕：
 *   起（windup，提交前）：波导之力从体内被逼到掌前，凝成一颗脉动的球，只播预告。
 *   放（launch → burst，提交后）：球沿瞄准线射出，按 `turn` 每刻朝目标转向、按 `lockRange` + `aurasphereHomingBuffer`
 *       咬住目标（这就是实际飞行路程）；命中活体且伤害回执成立才结算 `pulse` 并炸开一圈格斗冲击，被拒绝或撞墙只散球。
 *       飞尽则在 `world.projectilePosition` 的真实末点散去，不用原方向/满射程假造终点。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体、也能只给一个方向或世界点空放；不再因为 `target` 为 null 就提前结束，
 *   没有活体时球沿提交方向直飞（不再锁定），撞墙由原生地形拦下、在接触点散球。攻击许可仍由命中层按敌我关系判断。
 *
 * 与同族分开：魔法叶、高速星星是散成一群、各追各的；波导弹只有一颗，密度高、射程最远、追得最死、单发最重。
 */
namespace PokemonSkills {
    define({
        id: aurasphereId,
        cooldownParameter: "recharge",
        name: "Aura Sphere",
        description: "从体内逼出一颗波导球射向对手；球会一路拐弯追去，通常甩不掉，但转向有限、撞墙会散、目标跑出锁定距离也会跟丢。远追射程更远、追得更死；撞波更粗更快更重、射程更近。",
        uses: ["远距离点名一个目标", "追打走位、拉距离的对手", "用一颗密度高的球压住中距离"],
        kind: "aim",
        range: 16,
        maxRange: 22,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "aura",
        defaults: { seek: false, ai: { maxChase: 20, pursue: true, finish: true } },
        fields: [flag("seek", "远追")],
        indicator: function (config, pokemon) {
            return { radius: p(aurasphereId, "reach", pokemon), geometry: "line", style: "aura", color: 0x6FA8FF,
                label: config && config.seek === true ? "波导弹·远追" : "波导弹·撞波" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aurasphereId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aurasphereId, "tempo", context)),
                recover: Math.round(p(aurasphereId, "aftercast", context)),
                cooldown: Math.round(p(aurasphereId, "recharge", context)),
                active: 0,
                range: p(aurasphereId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aurasphere:charge", aurasphereScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, seek: !!(config && config.seek) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(aurasphereId, "pulse", action);
            const speed = Math.max(0.5, p(aurasphereId, "velocity", action));
            const turn = Math.max(4, p(aurasphereId, "turn", action));
            const radius = Math.max(0.15, p(aurasphereId, "radius", action));
            const reach = Math.max(4, p(aurasphereId, "reach", action));
            const lock = Math.max(reach, p(aurasphereId, "lockRange", action));
            const motes = Math.max(10, Math.round(p(aurasphereId, "motes", action)));
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.32));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            // 有活体目标时球能一路咬住 lock，再留 aurasphereHomingBuffer 格飞行余量追上移动中的目标；
            // 这就是实际飞行路程，不再是一个隐藏常数。空放时收敛到 reach。
            const trackingRange = lock + aurasphereHomingBuffer;
            const selected = action.target();
            const reference = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const offset = action.targetPosition().minus(origin);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            const flightRange = reference === "" ? reach : trackingRange;
            const scenes = WorldFeedback.actionScenes(aurasphereScene);
            let contacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "minecraft:entity.breeze.wind_burst");

            const appearance: any = { sprite: "cobblemon:generic/orb/energyorb", tint: 0x6FA8FF, glow: true, scale: scale };
            if (reference !== "") appearance.homing = { target: reference, turn: turn, delay: 1, range: trackingRange };

            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: speed, range: flightRange, radius: radius, lifetime: 200, direction: direction,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    contacted = true;
                    // 飞行是这次 execute 的持续过程：真实接触的一刻停掉同行表现，再播命中或散球。
                    scenes.stop(current, "flight");
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    // 只有伤害回执成立才播成功爆点；免疫/无效目标/墙只散球。
                    const landed = victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        && impact(current, hit, aurasphereId, power, { damage: damageSpec(aurasphereId, "pulse") });
                    if (landed) {
                        WorldFeedback.emit(scope, aurasphereScene, 1, point,
                            { moment: "burst", target: String(victim!.ref()), motes: motes, scale: scale, intensity: intensity }, 24);
                        scope.sound("cobblemon:impact.fighting", point, 16, "{}");
                    } else {
                        WorldFeedback.emit(scope, aurasphereScene, 1, point,
                            { moment: "miss", target: victim !== null && scope.valid(victim) ? String(victim.ref()) : "",
                                motes: Math.round(motes * 0.6), scale: scale }, 22);
                        scope.sound("minecraft:entity.breeze.deflect", point, 12, "{}");
                    }
                }
            }, function (current: CombatAction) {
                if (!contacted) {
                    // 飞尽无碰：读弹体真实的最后接触/结束点，不再用原方向与满射程推算一个假终点。
                    const end = current.world().projectilePosition(flight);
                    if (end !== null) {
                        WorldFeedback.emit(current.world(), aurasphereScene, 1, end,
                            { moment: "miss", motes: Math.round(motes * 0.6), scale: scale }, 20);
                        WorldFeedback.text(current.world(), end.plus(WorldCombat.point(0, 1.2, 0)), aurasphereMissText, [], 22);
                    }
                }
                finish(current);
            });
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, motes: motes, scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] });
        }
    });
}
