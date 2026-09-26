/** powertrip：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: powertripId,
        cooldownParameter: "recharge",
        name: "Power Trip",
        description: "借身上的强化冲撞敌人。强化越多，冲得越远越快、伤害和推力越大；命中后保留强化。",
        uses: ["叠高能力等级后冲上去重击", "把一个人顶出很远", "猛进时一次撞穿两个人"],
        kind: "aim",
        range: 3.2,
        maxRange: 5.8,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "dark",
        defaults: { drive: false, ai: { maxChase: 10, boostFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(powertripId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "dark",
                color: 0x7A4BC8, label: config && config.drive === true ? "嚣张·猛进" : "嚣张" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[powertripId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(powertripId, "tempo", context)),
                recover: Math.round(p(powertripId, "settle", context)),
                cooldown: Math.round(p(powertripId, "recharge", context)),
                active: 0,
                range: p(powertripId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const boost = world.valid(actor) ? powertripBoosts(world, actor) : 0;
            const raised = world.valid(actor) ? powertripRaised(world, actor) : 0;
            action.present("powertrip:boast", powertripScene, 1, action.origin(),
                JSON.stringify({ moment: "boast", boost: boost, raised: raised,
                    plumes: Math.max(6, 8 + raised * 4 + boost * 2), drive: config && config.drive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(powertripScene);
            // 地面冲撞只取瞄准的水平路线；直上/下瞄准时沿自身水平朝向，零朝向由 flatUnit 回退至 +Z。
            const direction = WorldGeometry.flatUnit(aim(action),
                WorldGeometry.facing(action.sense(), action.actor()) || action.direction());
            action.releaseTarget();
            // 释放这一刻冻结本次架势、路线预算与主伤：途中增益到期不改同一次冲撞的画面与长度。
            const length = p(powertripId, "dash", action);
            const step = p(powertripId, "speed", action);
            const radius = p(powertripId, "collisionRadius", action);
            const power = p(powertripId, "swagger", action);
            const push = p(powertripId, "push", action);
            const boosts = powertripBoosts(action.world(), action.actor());
            const raised = powertripRaised(action.world(), action.actor());
            const wanted = Math.max(1, Math.round(p(powertripId, "targets", action)));
            const plumes = Math.max(8, Math.round(p(powertripId, "plumes", action)));
            const drive = config && config.drive === true;
            const scale = Math.max(0.7, Math.min(1.9, radius / 0.45));
            const intensity = Math.max(0.6, Math.min(2.6, power / 60));
            const seen: { [ref: string]: boolean } = Object.create(null);
            let travelled = 0, hits = 0, settled = false;

            sound(action, "cobblemon:move.pursuit.target");
            scenes.show(action, "rush", action.origin(),
                { moment: "rush", boost: boosts, raised: raised, plumes: plumes, scale: scale, intensity: intensity, drive: drive ? 1 : 0 });

            function finish(current: CombatAction, landed: boolean, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (landed) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), powertripHitText,
                        [Math.round(power * 10) / 10], 24);
                } else {
                    WorldFeedback.emit(scope, powertripScene, 1, at,
                        { moment: "miss", scale: scale, boost: boosts, plumes: plumes }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), powertripMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            /** 一个真实接触：伤害被拒时不记命中、不推人、不冒充施加上身。 */
            function contact(current: CombatAction, hit: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                if (impact(current, hit, powertripId, power, { damage: damageSpec(powertripId, "swagger"), contact: true })) {
                    hits++;
                    if (scope.valid(victim)) {
                        const away = hit.position().minus(current.origin());
                        if (away.length() > 0.2) scope.hitDisplace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    }
                    WorldFeedback.emit(scope, powertripScene, 1, hit.position(),
                        { moment: "hit", target: String(victim.ref()), boost: boosts, raised: raised, plumes: plumes, scale: scale, intensity: intensity }, 22);
                } else {
                    WorldFeedback.emit(scope, powertripScene, 1, hit.position(),
                        { moment: "blocked", target: String(victim.ref()), scale: scale }, 18);
                }
            }

            /** 逐小段扫掠：每个接触按碰撞顺序结算；穿身时只挪一小步，好让下一段扫掠抓住紧贴的第二个。 */
            function run(current: CombatAction): void {
                const scope = current.world();
                let frameBudget = Math.min(step, length - travelled);
                while (!settled && travelled < length - 0.02 && frameBudget > 0.001) {
                    const chunk = Math.min(frameBudget, length - travelled, 0.25);
                    const swept = sweepStep(current, direction.scale(chunk), radius);
                    const hit = swept.hit;
                    const sweptDistance = Math.max(swept.moved, 0);
                    travelled += sweptDistance;
                    frameBudget -= sweptDistance;
                    if (hit.blocked()) { finish(current, hits > 0, hit.position()); return; }
                    if (hit.hitEntity()) {
                        const victim = hit.target();
                        if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { finish(current, hits > 0, hit.position()); return; }
                        const ref = String(victim.ref());
                        if (!seen[ref]) {
                            seen[ref] = true;
                            contact(current, hit, victim);
                            if (hits >= wanted) { finish(current, true, hit.position()); return; }
                            if (hits > 0) {
                                WorldFeedback.emit(scope, powertripScene, 1, hit.position(),
                                    { moment: "through", target: ref, boost: boosts, plumes: plumes, scale: scale }, 18);
                                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), powertripThroughText, [hits], 20);
                            }
                        }
                        const pass = Math.min(length - travelled, frameBudget, 0.2);
                        if (pass > 0.001) {
                            const moved = scope.displace(current.actor(), direction.scale(pass));
                            if (moved < 0.001) { finish(current, hits > 0, current.origin()); return; }
                            travelled += moved;
                            frameBudget -= moved;
                        }
                    } else {
                        if (sweptDistance < 0.001) { finish(current, hits > 0, current.origin()); return; }
                    }
                }
                if (settled) return;
                if (travelled >= length - 0.02) { finish(current, hits > 0, current.origin()); return; }
                current.after(1, run);
            }
            run(action);
        }
    });
    WorldCombat.preview("world_combat:powertrip", JSON.stringify({ motion: "horizontal" }));
}
