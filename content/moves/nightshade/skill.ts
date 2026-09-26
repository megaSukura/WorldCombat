/**
 * 黑夜魔影 / nightshade 的出手方式。
 *
 * 念头的形状：沉入阴影、把一段自己的等级凝成幽影（windup 预告）→ 幽影脱手、自己追向目标（flight）→
 * 钻进它心里、在原地盘踞一小会儿（haunt）→ 炸影式还会在命中点向周围摊开（splash）。
 * 目标全程不位移；这是它和地球上投最直观的区别。伤害在 haunt 那一刻直接结算，等于自己的等级。
 *
 * 选取：`kind: "aim"`——朝方向或世界点掷出，空放也成立；选中敌人时幻影才带有限追踪，空点则沿直线飞。
 * 幻影撞墙即停。命中显示的是原生受伤入口实际扣掉的生命；被属性免疫/护盾/伤害上限挡下时显示「被挡」
 * （blocked），不显示成功钻心；一路没人或飞到射程末端按 fizzle 消散。
 *
 * 三幕 + 收：windup（charge）→ flight → haunt（+ splash / fizzle / blocked）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const nightshadeScene = "world_combat:move_nightshade";
    const nightshadeHauntText = "world_combat.move.nightshade.text.haunt";
    const nightshadeFizzleText = "world_combat.move.nightshade.text.fizzle";
    const nightshadeBlockText = "world_combat.move.nightshade.text.blocked";

    define({
        id: "nightshade",
        name: "Night Shade",
        description: "远程掷出一段自己等级凝成的恐怖幻影：朝方向或指定地点掷出，选中敌人时幻影会追向它；命中造成等于自身等级的固定伤害（特攻极高时更高），目标不会被打退。炸影式把这一记摊成范围爆发、同时波及周围几个敌人，但每一发变轻、收招与冷却更久。",
        uses: ["在远处用等级伤害消耗对手", "让幻影自己追上会跑的敌人", "炸影式清理聚集的一群"],
        kind: "aim",
        range: 7,
        maxRange: 11.5,
        prepare: 9,
        active: 36,
        recover: 9,
        cooldown: 42,
        style: "ghost",
        defaults: { splash: false, ai: { maxChase: 11, crowd: 2, bulwark: 90, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("nightshade", "collisionRadius", pokemon), geometry: "line", style: "ghost", color: 0x6E5AA8, label: "黑夜魔影" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["nightshade"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const splash = !!(config && config.splash);
            return {
                prepare: p("nightshade", "haunt", context),
                recover: p("nightshade", "recover", context) + (splash ? 2 : 0),
                cooldown: p("nightshade", "cooldown", context) + (splash ? 10 : 0),
                range: p("nightshade", "boltRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_nightshade:charge", nightshadeScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", splash: !!(config && config.splash) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const splash = !!(config && config.splash);
            const damage = p("nightshade", "damage", action);
            const speed = p("nightshade", "boltSpeed", action);
            const range = p("nightshade", "boltRange", action);
            const radius = p("nightshade", "collisionRadius", action);
            const splashRadius = p("nightshade", "splashRadius", action);
            const cap = Math.max(1, Math.round(p("nightshade", "maximumTargets", action)));
            const direction = aim(action);
            const target = action.target();
            const struck: { [ref: string]: boolean } = Object.create(null);
            let settled = false, resolved = false;
            sound(action, "minecraft:entity.vex.charge");

            const appearance: any = { sprite: "cobblemon:particle/generic/orb/smokeorb", tint: 0x6E5AA8, glow: true, scale: 0.9 };
            if (target !== null && world.valid(target))
                appearance.homing = { target: String(target.ref()), turn: 10, delay: 2, range: range };

            const flight: LivingActions.Flight = {
                speed: speed, range: range, radius: radius, direction: direction, gravity: 0,
                lifetime: Math.max(24, Math.round(range / Math.max(0.2, speed) + 24)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    resolved = true;
                    if (victim === null || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, nightshadeScene, 1, point, { moment: "fizzle", scale: radius / 0.32 }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1, 0)), nightshadeFizzleText, [], 22);
                        return;
                    }
                    struck[String(victim.ref())] = true;
                    const actual = nightshadeRawHit(current, victim, damage, false);
                    if (actual > 0) {
                        WorldFeedback.emit(scope, nightshadeScene, 1, point,
                            { moment: "haunt", target: String(victim.ref()), count: Math.round(12 + Math.min(40, actual * 0.6)), scale: radius / 0.32 }, 28);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), nightshadeHauntText, [Math.round(actual)], 26);
                        if (splash) {
                            const found = scope.query(point, splashRadius, false);
                            let extra = 0;
                            for (let index = 0; index < found.length && extra < cap; index++) {
                                const other = found[index], ref = String(other.ref());
                                if (ref === String(self.ref()) || struck[ref]) continue;
                                const facts = scope.observe(other);
                                if (facts === null || facts.friendly()) continue;
                                struck[ref] = true;
                                if (nightshadeRawHit(current, other, damage, false) > 0) extra++;
                            }
                            // 炸影阶段只在真实命中后、按实际被波及的敌人数播报。
                            WorldFeedback.emit(scope, nightshadeScene, 1, point,
                                { moment: "splash", count: Math.round(12 + extra * 9), scale: splashRadius / 1.7 }, 26);
                        }
                        scope.sound("cobblemon:impact.ghost", point, 14, "{}");
                        return;
                    }
                    // 被属性免疫、护盾或原生伤害上限完全挡下：幻影在接触点散去，不显示成功钻心。
                    WorldFeedback.emit(scope, nightshadeScene, 1, point, { moment: "blocked", scale: radius / 0.32 }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1, 0)), nightshadeBlockText, [], 22);
                }
            };
            const projectile = LivingActions.projectile(action, flight, function (current: CombatAction) {
                // 空放的幻影按射程飞到瞄准点后自然收束，在这里补上消散。
                if (!resolved) {
                    const end = current.targetPosition();
                    WorldFeedback.emit(current.world(), nightshadeScene, 1, end, { moment: "fizzle", scale: radius / 0.32 }, 22);
                    WorldFeedback.text(current.world(), end.plus(WorldCombat.point(0, 1, 0)), nightshadeFizzleText, [], 22);
                }
                if (settled) { done(current); return; }
                settled = true;
                done(current);
            });
            WorldFeedback.keep(world, "nightshade:flight:" + action.id(), nightshadeScene, 1, action.origin(),
                { moment: "flight", projectile: projectile, scale: radius / 0.32 }, flight.lifetime! + 10);
        }
    });
}
