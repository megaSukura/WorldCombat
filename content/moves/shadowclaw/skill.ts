/**
 * 暗影爪 / shadowclaw 的出手方式。
 *
 * 核心念头：脚下的影子先贴着真实地表一格格朝落点身后爬过去，绕过它、在身后按 `depth` 站起来；一只影爪
 * 从那一端反向抓回来，从对手照不到的一面抓进要害。正面挡没用，因为爪不是从正面来的。
 *
 * 两幕：
 *   起（windup，提交前）：影子在脚边聚拢，只播预告，可被打断。
 *   铺与抓（shade → rend，提交后）：影子按 `lag` 逐刻用共享 `SurfacePaths` 沿原生地表推进，从脚下铺向落点身后
 *       `shade` 格处；每个实际走出的短段都用同一组地面端点判定与表现。断崖、水面、实墙或缺地表都会让影头
 *       停在实际锚点——这时不再冒充绕到背后，只在锚点附近收成一记短爪。约 `lag` 刻后，影爪从暗带末端按
 *       `depth` 的高度反向抓向落点方向，真实首碰决定目标：抓到的第一个非友方吃 `rend` 接触伤害。目标此刻
 *       正在攻击别人（当前攻击目标不是施法者）时，这一爪吃满 `ambush` 加成；空闲目标不算偷袭。不追已经
 *       移开的锁定目标——爪走的是那条真实回抓线。
 *   空（miss）：回爪线上没有抓到任何非友方时，暗带照旧铺出，末端只留一道抓空的风。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的要害标记。
 *
 * 与同族分开：暗影拳是招式本身从对手影子下升起，出奇一击是施法者本人瞬移到背后；只有暗影爪是影先绕到
 * 落点身后、再从那一端反向探爪，且专挑对手没看它的那一刻。
 */
namespace PokemonSkills {
    define({
        id: shadowclawId,
        cooldownParameter: "recharge",
        name: "Shadow Claw",
        description: "影子先贴着真实地表逐刻爬到落点身后，再由那一端反向伸出一只影爪，从对手照不到的一面抓进要害：造成接触伤害，命中处留下一道短抓痕。影带走真实地表与通路，断崖、水面、实墙会把影带截断；这时只在锚点附近收成一记短爪。对手当前正在打别人、没在看着你时，这一爪更重；它的暴击率比同族高一档。",
        uses: ["影子绕到落点背后反向伸爪", "对手正打别人、没在看自己时这一爪更重", "沿用原生高暴击，命中留抓痕"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.4,
        prepare: 8,
        active: 18,
        recover: 8,
        cooldown: 32,
        style: "ghost",
        defaults: { deep: false, ai: { maxChase: 6, strikeUnseen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(shadowclawId, "reach", pokemon), geometry: "line", style: "ghost", color: 0x8E7BD8,
                label: config && config.deep === true ? "深影爪" : "暗影爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[shadowclawId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(shadowclawId, "tempo", context)),
                recover: Math.round(p(shadowclawId, "aftercast", context)),
                cooldown: Math.round(p(shadowclawId, "recharge", context)),
                active: skills[shadowclawId].active,
                range: p(shadowclawId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shadowclaw:windup", shadowclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(shadowclawScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const toward = action.targetPosition();
            const direction = NativeSemantics.aim(action, move, aim(action), 1.4);
            const reach = p(shadowclawId, "reach", action);
            const shade = p(shadowclawId, "shade", action);
            const half = p(shadowclawId, "claw", action);
            const depth = p(shadowclawId, "depth", action);
            const lag = Math.max(2, Math.round(p(shadowclawId, "lag", action)));
            const base = p(shadowclawId, "rend", action);
            const ambush = p(shadowclawId, "ambush", action);
            const shred = Math.max(6, Math.round(p(shadowclawId, "shred", action)));
            const scale = Math.max(0.6, Math.min(2.0, half / shadowclawReference));
            // 释放时锁定落点，不超过 reach；方向取实际朝向的水平分量。
            const heading = WorldGeometry.flatUnit(toward.minus(origin), direction);
            const distance = Math.min(reach, toward.minus(origin).length());
            const landing = origin.plus(heading.scale(distance));
            const feet = self === null ? origin : WorldCombat.point(origin.x(), self.boundsMin().y(), origin.z());
            const start = SurfacePaths.support(world, feet, 0.6, 3);
            const total = distance + shade;
            let seen = false;

            sound(action, "cobblemon:move.shadowball.actor");

            function arr(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

            /** 影头按 depth 从锚点站起，但不穿顶：有顶时贴到顶下方。 */
            function rise(current: CombatAction, anchor: CombatPoint): CombatPoint {
                const scope = current.world();
                const floor = Math.max(anchor.y(), landing.y());
                const low = WorldCombat.point(anchor.x(), anchor.y() + 0.05, anchor.z());
                const high = WorldCombat.point(anchor.x(), floor + depth, anchor.z());
                const ceiling = WorldGeometry.blockHit(scope, low, high);
                return ceiling === null ? high : WorldCombat.point(anchor.x(), Math.max(low.y(), ceiling.position().y() - 0.05), anchor.z());
            }

            /** 回爪：从暗带末端反向探向落点方向，真实首碰决定目标；没绕到背后时收成一记近处短爪。 */
            function claw(current: CombatAction, anchor: CombatPoint, behind: boolean): void {
                const scope = current.world();
                scenes.stop(current, "shade");
                const clawFrom = rise(current, anchor);
                const clawTo = behind ? WorldCombat.point(landing.x(), landing.y(), landing.z())
                    : WorldCombat.point(anchor.x() + heading.x() * Math.min(1.2, reach), anchor.y(),
                        anchor.z() + heading.z() * Math.min(1.2, reach));
                const hit = current.trace(clawFrom, clawTo, half, true);
                const point = hit.position();
                const contact = hit.hitEntity() ? hit.target() : null;
                const victim = contact !== null && scope.valid(contact) && !scope.friendly(contact) ? contact : null;

                if (victim !== null) {
                    const facts = scope.observe(victim);
                    const at = facts === null ? point : facts.position();
                    const attacking = facts === null ? null : facts.attacking();
                    // 暗算只认「目标当前正在攻击别人（攻击目标不是施法者）」；空闲目标不算背身。
                    seen = attacking !== null && String(attacking.ref()) !== String(actor.ref());
                    const power = seen ? base * (1 + ambush) : base;
                    const landed = impact(current, hit, shadowclawId, power,
                        { damage: damageSpec(shadowclawId, "rend"), contact: true });
                    // 三道爪痕：从暗带末端反向划到真实接触点，判定与表现共用同一组端点。
                    const back = at.minus(clawFrom);
                    const backDir = back.length() < 0.01 ? heading : back.unit();
                    const side = WorldCombat.point(-backDir.z(), 0, backDir.x());
                    for (let rake = -1; rake <= 1; rake++) {
                        const shift = side.scale(rake * half * 0.6);
                        WorldFeedback.emit(scope, shadowclawScene, 1, at,
                            { moment: rake === 0 ? "rend" : "rake", target: rake === 0 ? String(victim.ref()) : "",
                                path: [[clawFrom.x() + shift.x(), clawFrom.y() + shift.y(), clawFrom.z() + shift.z()],
                                    [at.x() + shift.x(), at.y() + shift.y(), at.z() + shift.z()]],
                                unseen: seen ? 1 : 0, shred: shred, notes: shred, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 24);
                    }
                    if (landed) {
                        // 命中处留一道短抓痕，绑定目标随身跟随。
                        WorldFeedback.emit(scope, shadowclawScene, 1, at,
                            { moment: "gouge", target: String(victim.ref()), depth: depth, scale: scale }, 20);
                        if (seen) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), shadowclawAmbushText, [], 26);
                        sound(current, seen ? "cobblemon:impact.dark" : "cobblemon:impact.ghost");
                    }
                } else {
                    WorldFeedback.emit(scope, shadowclawScene, 1, point,
                        { moment: "miss", path: [[clawFrom.x(), clawFrom.y(), clawFrom.z()], [point.x(), point.y(), point.z()]],
                            scale: scale }, 18);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), shadowclawMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                scenes.finish(current, done);
            }

            // 脚下没有可承影的地表：不铺影，只在身前收成一记近处短爪。
            if (start === null || total <= 0.05) {
                const anchor = origin.plus(heading.scale(0.3));
                scenes.show(action, "shade", anchor,
                    { moment: "shade", path: [], grounded: 0, shade: shade, depth: depth, lag: lag, scale: scale,
                        direction: [heading.x(), heading.y(), heading.z()] });
                action.after(lag, function (current: CombatAction) { claw(current, anchor, false); });
                return;
            }

            const stepLength = total / lag;
            let walked = 0, elapsed = 0;

            /** 逐刻推进真实地表影头：每个短段都走一遍原生顶面，水面/断崖/实墙即截断。 */
            function walk(current: CombatAction, head: CombatPoint): void {
                const scope = current.world();
                const want = Math.min(stepLength, total - walked);
                if (!(want > 1e-6)) { claw(current, head, walked >= distance + 0.15); return; }
                const advanced = SurfacePaths.advance(scope, head, heading, want,
                    { up: 0.6, down: 1.2, spacing: 0.35, samples: Math.max(2, Math.ceil(want / 0.35) + 1) });
                const accepted: CombatPoint[] = [head];
                let cut = advanced.ended;
                for (let i = 1; i < advanced.path.length; i++) {
                    const fluid = scope.fluid(advanced.path[i]);
                    if (fluid !== null && !fluid.empty()) { cut = true; break; }
                    accepted.push(advanced.path[i]);
                }
                let next = accepted[accepted.length - 1];
                for (let i = 1; i < accepted.length; i++) walked += accepted[i].minus(accepted[i - 1]).length();
                if (cut && walked >= total - 0.01) cut = false;
                scenes.show(current, "shade", next,
                    { moment: "shade", point: arr(next), head: arr(next), path: [arr(head), arr(next)],
                        direction: [heading.x(), heading.y(), heading.z()],
                        shade: shade, depth: depth, lag: lag, scale: scale, grounded: 1,
                        intensity: Math.max(0.5, Math.min(1.8, half / 0.55)) });
                elapsed++;
                if (cut || walked >= total - 0.01 || elapsed >= lag) {
                    claw(current, next, !cut && walked >= distance + 0.15);
                    return;
                }
                current.after(1, function (later: CombatAction) { walk(later, next); });
            }

            walk(action, start);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的标记与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_shadowclaw/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== shadowclawId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, shadowclawScene, 1, at,
            { moment: "crit", target: String(target.ref()), marks: Math.max(1, Math.min(4, Math.round(ratio))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), shadowclawVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
