/**
 * 火焰踢 / blazekick 的出手方式。
 *
 * 核心念头：拧身而起，把裹火的腿从脚侧低点沿一条上扬的短弧挑到身前高点——一记近身上挑踢。
 *   它是本族唯一把目标挑起的一招：命中时按原生击飞给一个向上的速度冲量（能否离地由击飞抗性与事件决定），
 *   火则按概率留在身上。
 *
 * 两幕：
 *   起（windup，提交前）：身体拧起来、火从脚跟裹到脚尖，只播预告。
 *   踢（execute → sweep / kick / ignite / launch / miss）：提交后腿在 2～3 刻内扫过脚侧低点→身前中点→前上点；
 *       每段做权威首碰，最先碰到的实体或墙就是落点并立即停扫。只对最先碰到的非友方结算一次 `kick` 接触伤害，
 *       按 `burnChance` 点燃（共享身份 world_combat:status/burn，宝可梦同步为原生灼伤），并尝试用原生击飞挑离地面。
 *       命中点、判定的落点与表现的火脚头共用同一组真实端点；踢空、先碰友方或撞墙只留划过空气的火弧。
 *
 * 选取 kind: "aim"：可点敌人，也可只朝一个方向近身空踢；目标点被截进 2.1～3.4 的真实踢程内，够不到不会隔空踢。
 *
 * 与同族分开：火焰拳是直拳点火、火会蔓延到旁边的人；闪焰冲锋是整身撞过去、自己也受反震；
 *   火焰踢是单腿的上挑弧线，把人挑起来才是它的价值，代价是这一脚不重。
 *
 * 配置 ignite（烈焰式）由 resolve 改时序、由公式改威力/点燃/挑高，提交后才触碰世界。
 */
namespace PokemonSkills {
    const blazekickScene = "world_combat:move_blazekick";
    const blazekickHitText = "world_combat.move.blazekick.text.hit";
    const blazekickBurnText = "world_combat.move.blazekick.text.burn";
    const blazekickMissText = "world_combat.move.blazekick.text.miss";

    define({
        id: "blazekick",
        cooldownParameter: "recharge",
        name: "Blaze Kick",
        description: "拧身而起，把裹火的腿从脚侧低点沿一条上扬的短弧挑到身前高点：可以点敌人，也可以只朝一个方向近身空踢。最先碰到的那个敌人受到一次接触伤害、按概率使目标灼伤（灼伤使其物理伤害减半并持续掉血）；能否把它挑离地面按原生击飞规则，被拒绝时只保留伤害、不画升空轨迹。烈焰式更容易点着、挑得更高；重踢式踢得更重但火难留。",
        uses: ["一记把目标挑离地面的上挑火焰踢", "贴身点着对手，靠灼伤压低它的攻击", "近身把目标挑离站位，打乱它的落脚"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.4,
        prepare: 7,
        active: 12,
        recover: 7,
        cooldown: 22,
        style: "kick",
        maximumTicks: 200,
        defaults: { ignite: false, ai: { maxChase: 6, preferUnlit: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("blazekick", "reach", pokemon) : 2.4, geometry: "cone", style: "fire",
                color: 0xE2531B, label: config && config.ignite === true ? "烈焰踢" : "火焰踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["blazekick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("blazekick", "tempo", context)),
                recover: Math.round(p("blazekick", "settle", context)),
                cooldown: Math.round(p("blazekick", "recharge", context)),
                active: skills["blazekick"].active,
                range: p("blazekick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const embers = Math.max(6, Math.round(p("blazekick", "embers", action) * 0.6));
            action.present("blazekick:coil", blazekickScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, embers: embers, ignite: config && config.ignite ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = String(actor.ref());
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const look = WorldGeometry.facing(world, actor);
            // The kick is a ground-level leg sweep; flattening the aim keeps a low target from burying it in the floor.
            const heading = WorldGeometry.flatUnit(aim(action), look === null ? action.direction() : look);
            const frame = WorldGeometry.basis(heading);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            action.releaseTarget();
            const reach = Math.max(2.0, action.range());
            const power = p("blazekick", "kick", action);
            const chance = p("blazekick", "burnChance", action);
            const burnTicks = Math.max(40, Math.round(p("blazekick", "burnTicks", action)));
            const launch = Math.max(0.1, p("blazekick", "launch", action));
            const bulge = p("blazekick", "arc", action);
            const embers = Math.max(8, Math.round(p("blazekick", "embers", action)));
            const scale = Math.max(0.6, Math.min(1.8, bulge / 0.75));
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            const radius = Math.max(0.24, Math.min(0.6, bulge * 0.45));
            const halfWidth = body === null ? 0.4 : Math.max(0.2, Math.min(0.5, body.width() * 0.35));
            const feetY = body === null ? origin.y() - 0.7 : origin.y() - body.height() * 0.5;
            // Clamp the aimed point into the real kick reach so a far target is never kicked from range.
            const rawEnd = targetBody !== null ? targetBody.position() : origin.plus(heading.scale(reach));
            const toEnd = rawEnd.minus(origin), span = toEnd.length();
            const end = span < 0.01 || span <= reach ? rawEnd : origin.plus(toEnd.unit().scale(reach));
            // Foot-side low point -> front middle -> front upper point, all in real world coordinates.
            const low = WorldCombat.point(origin.x() + frame.right.x() * halfWidth, feetY + 0.12, origin.z() + frame.right.z() * halfWidth);
            const mid = origin.plus(end.minus(origin).scale(0.55)).plus(WorldCombat.point(0, 0.25, 0));
            const high = end.plus(WorldCombat.point(0, 0.35, 0));
            const points = [low, mid, high];
            const scenes = WorldFeedback.actionScenes(blazekickScene);
            const headingData = [heading.x(), heading.y(), heading.z()];
            let resolved = false;

            function conclude(current: CombatAction, contact: CombatImpact | null): void {
                if (resolved) return;
                resolved = true;
                scenes.stop(current);
                const scope = current.world();
                const victim = contact !== null && contact.hitEntity() ? contact.target() : null;
                if (victim !== null && String(victim.ref()) !== self && scope.valid(victim) && !scope.friendly(victim)) {
                    const at = contact!.position();
                    const landed = hurt(current, victim, "blazekick", power,
                        { damage: damageSpec("blazekick", "kick"), contact: true, status: "burn", chance: chance, statusTicks: burnTicks });
                    WorldFeedback.emit(scope, blazekickScene, 1, at,
                        { moment: "kick", target: String(victim.ref()), embers: embers, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 80)) }, 24);
                    sound(current, "cobblemon:impact.fire");
                    if (landed && scope.valid(victim)) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), blazekickHitText, [], 22);
                        const away = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
                        const lift = away.length() < 0.05 ? WorldCombat.point(heading.x() * 0.2, launch, heading.z() * 0.2)
                            : away.unit().scale(0.25).plus(WorldCombat.point(0, launch, 0));
                        // Lift is a velocity impulse, not a guaranteed block of height; resistance/events can refuse it.
                        const lifted = scope.hitImpulse(victim, lift);
                        if (CombatStatus.has(scope, victim, "burn")) {
                            scope.ignite(victim, Math.max(20, Math.min(60, Math.round(burnTicks * 0.2))));
                            WorldFeedback.emit(scope, blazekickScene, 1, at, { moment: "ignite", target: String(victim.ref()), embers: embers, scale: scale }, 24);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), blazekickBurnText, [], 24);
                            sound(current, "minecraft:entity.blaze.burn");
                        }
                        if (lifted) WorldFeedback.emit(scope, blazekickScene, 1, at,
                            { moment: "launch", target: String(victim.ref()), launch: launch, embers: embers, scale: scale, intensity: intensity }, 22);
                    }
                    scenes.finish(current, done);
                    return;
                }
                const missAt = contact !== null ? contact.position() : end;
                WorldFeedback.emit(scope, blazekickScene, 1, missAt, { moment: "miss", embers: Math.round(embers * 0.5), scale: scale }, 18);
                WorldFeedback.text(scope, missAt.plus(WorldCombat.point(0, 0.8, 0)), blazekickMissText, [], 20);
                sound(current, "cobblemon:move.gust.actor");
                scenes.finish(current, done);
            }

            function sweep(current: CombatAction, index: number): void {
                if (resolved) return;
                const from = points[index], to = points[index + 1];
                // Judgement and presentation share the exact endpoints: the fire front is drawn along this very sub-segment.
                scenes.show(current, "sweep", to,
                    { moment: "sweep", path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                        direction: headingData, embers: embers, scale: scale, intensity: intensity });
                const hit = current.trace(from, to, radius, true);
                const inner = hit.hitEntity() ? hit.target() : null;
                if (inner !== null && String(inner.ref()) === self) {
                    if (index + 2 < points.length) { current.after(1, function (next: CombatAction) { sweep(next, index + 1); }); return; }
                    conclude(current, null);
                    return;
                }
                if (hit.hitEntity() || hit.blocked()) { conclude(current, hit); return; }
                if (index + 2 < points.length) { current.after(1, function (next: CombatAction) { sweep(next, index + 1); }); return; }
                conclude(current, null);
            }

            sound(action, "minecraft:entity.blaze.shoot");
            sweep(action, 0);
        }
    });
}
