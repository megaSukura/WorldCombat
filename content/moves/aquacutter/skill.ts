/**
 * 水波刀 / aquacutter 的出手方式。
 *
 * 核心念头：把水压成一道细而极快的线，像刀刃一样笔直喷出去——它切过谁就把谁淋透，笔直穿过成排的
 * 目标而不是停在一个人身上。它是四记要害斩里最快、最直、最窄的一击，也是唯一留下「湿」的一击。
 *
 * 三幕：
 *   起（windup，提交前）：水在口边收成一道细线、低鸣着蓄压，只播预告，可被打断。
 *   喷（jet → cut，提交后）：水线沿瞄准方向笔直高速喷出，拖着细密的水尾；切中的非友方各吃一记 `jet`
 *       切斩，被溅湿（共享身份 world_combat:status/soaked），最多贯穿 `bore` 个。
 *   空（miss）：没切到人则水线飞到尽头自行散开，只留一声水响。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的水花。
 *
 * 与同族分开：精神利刃是一轮更宽、会拐弯追人的月牙，命中切一个十字；水波刀是一条笔直、极快、细窄的
 * 水线，能贯穿成排目标并把切中的溅湿。玩家从「直、快、细、留下湿」把它认出来。
 */
namespace PokemonSkills {
    define({
        id: aquacutterId,
        cooldownParameter: "recharge",
        name: "Aqua Cutter",
        description: "The user expels pressurized water to cut at the target like a blade. This move has a heightened chance of landing a critical hit.",
        uses: ["一道笔直极快的水线切穿对手", "一路贯穿成排的目标", "把切中的溅湿，留一段水湿窗口"],
        kind: "enemy",
        range: 10,
        maxRange: 16,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "water",
        defaults: { lance: false, ai: { maxChase: 14, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(aquacutterId, "radius", pokemon) * 2.2, geometry: "line", style: "water", color: 0x4FC3E8,
                label: config && config.lance === true ? "贯流水波刀" : "水波刀" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[aquacutterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(aquacutterId, "tempo", context)),
                recover: Math.round(p(aquacutterId, "aftercast", context)),
                cooldown: Math.round(p(aquacutterId, "recharge", context)),
                active: 0,
                range: p(aquacutterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_aquacutter:windup", aquacutterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", lance: config && config.lance === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const power = p(aquacutterId, "jet", action);
            const speed = p(aquacutterId, "pressure", action);
            const bore = Math.max(1, Math.round(p(aquacutterId, "bore", action)));
            const radius = p(aquacutterId, "radius", action);
            const soak = Math.max(40, Math.round(p(aquacutterId, "soakTicks", action)));
            const spray = Math.max(8, Math.round(p(aquacutterId, "spray", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / aquacutterReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            let settled = false, hits = 0;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/water/waterjet_head", tint: 0x4FC3E8, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / aquacutterReference)),
                pierce: Math.max(0, bore - 1)
            };

            sound(action, "cobblemon:move.waterpulse.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), gravity: 0, radius: radius, lifetime: 160,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || hits >= bore) return;
                    const landed = impact(current, hit, aquacutterId, power,
                        { damage: damageSpec(aquacutterId, "jet"), slice: true });
                    if (!landed) return;
                    hits++;
                    // 加压的水切开时把目标淋透：借共享身份 soaked，与水流尾、波动冲、水流裂破是同一件事。
                    if (!CombatStatus.has(scope, victim, "soaked"))
                        CombatStatus.apply(scope, victim, "soaked", aquacutterSoaked, soak);
                    WorldFeedback.emit(scope, aquacutterScene, 1, point,
                        { moment: "cut", target: String(victim.ref()), spray: spray, scale: scale,
                            intensity: intensity, hits: hits }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)), aquacutterCutText, [hits], 24);
                    sound(current, "cobblemon:impact.water");
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                if (hits === 0 && body !== null) {
                    WorldFeedback.emit(scope, aquacutterScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.0, 0)), aquacutterMissText, [], 20);
                    sound(current, "cobblemon:impact.water");
                }
                done(current);
            });
            WorldFeedback.keep(world, "aquacutter:jet:" + action.id(), aquacutterScene, 1, action.origin(),
                { moment: "jet", projectile: flight, scale: scale, intensity: intensity, spray: spray }, 90);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的白色水花与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_aquacutter/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== aquacutterId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, aquacutterScene, 1, at,
            { moment: "crit", target: String(target.ref()), spray: Math.max(12, Math.min(50, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), aquacutterVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
