/**
 * 暗影爪 / shadowclaw 的出手方式。
 *
 * 核心念头：脚下的影子先贴着真实地表扬到落点后面，绕过它、在它身后站起来；一只影爪从那一端反向抓回来，
 * 从对手照不到的一面抓进要害。正面挡没用，因为爪不是从正面来的。
 *
 * 两幕：
 *   起（windup，提交前）：影子在脚边聚拢，只播预告，可被打断。
 *   铺与抓（shade → rend，提交后）：影子从脚下沿真实地表铺到落点身后 `shade` 格处，一条暗带经过落点脚下；
 *       影带需要有效地表与通路，实墙或无地表都会把它裁断。约 `lag` 刻后，影爪从暗带末端**反向**抓向
 *       释放点方向，真实首碰决定目标：抓到的第一个非友方吃 `rend` 接触伤害。目标此刻正攻击别人（没在看
 *       施法者）时，这一爪吃满 `ambush` 加成，画面更深。不追已经移开的锁定目标——爪走的是那条真实回抓线。
 *   空（miss）：回爪线上没有抓到任何非友方时，暗带照旧铺出，末端只留一道抓空的风。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的要害标记。
 *
 * 与同族分开：暗影拳是招式本身从对手影子下升起，出奇一击是施法者本人瞬移到背后；只有暗影爪是影先绕到
 * 落点身后、再从那一端反向探爪，且专挑对手没看它的那一刻。
 */
namespace PokemonSkills {
    /** 落点下方是否有可承影的实体地表（空气、水、岩浆都不算）。 */
    function shadowclawSurface(world: CombatWorld, point: CombatPoint): boolean {
        const below = world.block(point.plus(WorldCombat.point(0, -1, 0)));
        if (below === null) return false;
        const id = String(below.id()).toLowerCase();
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return false;
        return id.indexOf("water") < 0 && id.indexOf("lava") < 0;
    }

    /** 影带沿真实地表铺行：从 start 到 end，遇到无地表、实墙或陡坎就停在该点。返回同一组顶点供判定与表现共用。 */
    function shadowclawBandPath(world: CombatWorld, start: CombatPoint, end: CombatPoint):
        { points: number[][]; reached: CombatPoint; complete: boolean } {
        const samples = WorldGeometry.along(start, end, 0.45);
        const points: number[][] = [];
        let previous: CombatPoint | null = null, reached = start, complete = false;
        for (let index = 0; index < samples.length; index++) {
            const spot = WorldGeometry.ground(world, samples[index], 4);
            if (!shadowclawSurface(world, spot)) break;
            if (previous !== null) {
                if (!world.clear(previous, spot)) break;
                if (Math.abs(spot.y() - previous.y()) > 1.1) break;
            }
            points.push([spot.x(), spot.y(), spot.z()]);
            previous = spot;
            reached = spot;
            if (index === samples.length - 1) complete = true;
        }
        return { points: points, reached: reached, complete: complete };
    }

    define({
        id: shadowclawId,
        cooldownParameter: "recharge",
        name: "Shadow Claw",
        description: "影子先贴着地面铺到落点身后，再由那一端反向伸出一只影爪，从对手照不到的一面抓进要害：造成接触伤害，命中处留下一道短抓痕。影带走真实地表与通路，实墙会把影带裁断；没有地表时只收成一记近处短爪。对手当前没有在看着你时，这一爪更重；它的暴击率比同族高一档。",
        uses: ["影子绕到落点背后反向伸爪", "对手没在看自己时这一爪更重", "沿用原生高暴击，命中留抓痕"],
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
            const groundStart = WorldGeometry.ground(world, origin, 6);
            const groundEnd = WorldGeometry.ground(world, landing.plus(heading.scale(shade)), 6);
            const band = shadowclawBandPath(world, groundStart, groundEnd);
            const grounded = band.points.length >= 2;
            const anchor = grounded ? band.reached : groundStart;
            let landed = false, unseen = false;

            scenes.show(action, "shade", groundStart,
                { moment: "shade", path: band.points, shade: shade, depth: depth, lag: lag, scale: scale,
                    direction: [heading.x(), heading.y(), heading.z()], grounded: grounded ? 1 : 0 });
            sound(action, "cobblemon:move.shadowball.actor");

            action.after(lag, function (current: CombatAction) {
                scenes.stop(current, "shade");
                const scope = current.world();
                // 回爪：从暗带末端反向探向释放点方向，真实首碰决定目标；无地表时收成一记近处短爪。
                const clawFrom = grounded ? WorldCombat.point(anchor.x(), Math.max(anchor.y(), landing.y()), anchor.z())
                    : origin.plus(heading.scale(0.3));
                const clawTo = grounded ? landing : origin.plus(heading.scale(Math.min(1.2, reach)));
                const hit = current.trace(clawFrom, clawTo, half, true);
                const point = hit.position();
                const contact = hit.hitEntity() ? hit.target() : null;
                const victim = contact !== null && scope.valid(contact) && !scope.friendly(contact) ? contact : null;

                if (victim !== null) {
                    const facts = scope.observe(victim);
                    const at = facts === null ? point : facts.position();
                    const attacking = facts === null ? null : facts.attacking();
                    // 分心加成只依据「目标当前的攻击目标不是施法者」，不假称做过视线检测。
                    unseen = attacking === null || String(attacking.ref()) !== String(actor.ref());
                    const power = unseen ? base * (1 + ambush) : base;
                    landed = impact(current, hit, shadowclawId, power,
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
                                unseen: unseen ? 1 : 0, shred: shred, notes: shred, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 24);
                    }
                    if (landed) {
                        // 命中处只留一道短抓痕，不再拖一条持久无作用的尾。
                        WorldFeedback.emit(scope, shadowclawScene, 1, at,
                            { moment: "gouge", target: String(victim.ref()), depth: depth, scale: scale }, 20);
                        if (unseen) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), shadowclawAmbushText, [], 26);
                        sound(current, unseen ? "cobblemon:impact.dark" : "cobblemon:impact.ghost");
                    }
                } else {
                    WorldFeedback.emit(scope, shadowclawScene, 1, point,
                        { moment: "miss", path: [[clawFrom.x(), clawFrom.y(), clawFrom.z()], [point.x(), point.y(), point.z()]],
                            scale: scale }, 18);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), shadowclawMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                scenes.finish(current, done);
            });
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
