/**
 * 信号光束 / signalbeam —— 注册与动作。
 *
 * 核心念头：从身体**左右两个信号源各射出一条细束**，两束在手动瞄点处交叉。瞄近点，交叉后张开扫向两侧；
 * 瞄远点，前段还宽。每条束单独被真实墙裁剪，实体命中各按半量结算——交点同时被两束照到的目标才吃满伤害。
 *
 * 两幕：
 *   起（windup，提交前）：左右信号源各收一枚亮点，只播预告。
 *   照（execute）：提交后从左右发射点各拉出一条细束，各自沿“发射点 → 瞄点”的直线延伸到原 reach；
 *       每条束用原生方块射线裁墙，用三维段筛选落在束里的非友方，各结算一次 half 伤害（全局最多 maxTargets 个目标，
 *       同一目标两条束最多各半）；交点两束重叠即满额。命中后按 confuseChance 掷本单元自己的共享身份载体
 *       world_combat:status/confusion。删除旧版“错乱后挨别人打再额外扣最大生命”的尾钩。
 *
 * 与幻象光线（会拐弯追人的单弹）、极光束（会折射的单束）、加农光炮（贯穿单体炮）分开：本招的机制是
 * **双发射点的焦点几何**——玩家用瞄点距离决定两束在哪里交叉、张开多远。
 */
namespace PokemonSkills {
    /** 每束细束的判定半径：细，但按身体宽度微调，保证交点能罩住正常体型的目标。 */
    function signalbeamRadius(body: CombatObservation | null): number {
        const width = body === null ? 0.9 : body.width();
        return Math.max(0.3, Math.min(0.7, width * 0.32));
    }

    /** 把错乱挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function signalbeamJam(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", signalbeamEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, signalbeamScene, 1, at, { moment: "jam", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), signalbeamDazeText, [], 28);
        return true;
    }

    define({
        id: signalbeamId,
        cooldownParameter: "recharge",
        name: "Signal Beam",
        description: "从身体左右两个信号源各射出一条细束，两束在瞄点交叉：每条束单独被真墙裁剪，命中各按半量结算，交点同时被两束照到的目标才吃满伤害。命中后可能让目标信号错乱，出手会失手。瞄近点交叉后张开扫两侧，瞄远点前段还宽。",
        uses: ["一次点名排成一线的多个敌人", "用远近焦点控制两束的张开几何", "对单个目标把交点对准身体打满"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 11,
        active: 1,
        recover: 8,
        cooldown: 28,
        style: "bug",
        defaults: { pulse: false, ai: { maxChase: 17, crowd: true, finish: true } },
        fields: [flag("pulse", "脉冲")],
        indicator: function (config, pokemon) {
            return { radius: p(signalbeamId, "reach", pokemon), geometry: "line", style: "bug", color: 0xD8C24A,
                label: config && config.pulse === true ? "信号光束·脉冲" : "信号光束·连续" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[signalbeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(signalbeamId, "tempo", context)),
                recover: Math.round(p(signalbeamId, "aftercast", context)),
                cooldown: Math.round(p(signalbeamId, "recharge", context)),
                active: 1,
                range: p(signalbeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:signalbeam:windup", signalbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", pulse: config && config.pulse === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const reach = action.range();
            const gauge = p(signalbeamId, "gauge", action);
            const power = p(signalbeamId, "beam", action);
            const chance = Math.max(0.02, Math.min(0.9, p(signalbeamId, "confuseChance", action)));
            const daze = Math.max(40, Math.round(p(signalbeamId, "dazeTicks", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p(signalbeamId, "fumble", action))) * 100);
            const motes = Math.max(12, Math.round(p(signalbeamId, "motes", action)));
            const maxTargets = Math.max(1, Math.round(p(signalbeamId, "maxTargets", action)));
            const crowd = !(config && config.ai && config.ai.crowd === false);
            const height = body === null ? 1.4 : body.height();
            const beamRadius = signalbeamRadius(body);
            const scale = Math.max(0.6, Math.min(2.2, gauge / 0.6));
            const intensity = Math.max(0.5, Math.min(2.2, power / 62));
            const selfRef = String(actor.ref());
            const centre = origin.plus(WorldCombat.point(0, height * 0.35, 0));
            const targeted: { [ref: string]: boolean } = {};
            let targetCount = 0, hits = 0;

            // 焦点：手动瞄点。AI（或开启“优先照扎堆”的配置）在目标身边还挤着别的敌人时，把交点略向身前收，
            // 让两条束在目标之前交叉、到目标距离时已张开扫向两侧；单体则交点正对身体。
            let focus = action.targetPosition();
            const primary = action.target();
            if (crowd && primary !== null && world.valid(primary)) {
                const primaryBody = world.observe(primary);
                if (primaryBody !== null) {
                    const near = world.query(primaryBody.position(), 2.5, false);
                    let others = 0;
                    for (let i = 0; i < near.length; i++) {
                        const other = near[i];
                        if (String(other.ref()) === selfRef || String(other.ref()) === String(primary.ref()) || world.friendly(other)) continue;
                        const observation = world.observe(other);
                        if (observation !== null && observation.health() > 0) others++;
                    }
                    const toFocus = focus.minus(origin), gap = toFocus.length();
                    if (others > 0 && gap > 0.8) focus = origin.plus(toFocus.unit().scale(gap * 0.7));
                }
            }

            const heading = WorldGeometry.flatUnit(focus.minus(origin), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const emitterHalf = Math.max(0.2, Math.min(2.4, gauge));
            const froms: CombatPoint[] = [centre.plus(side.scale(emitterHalf)), centre.minus(side.scale(emitterHalf))];
            const moments: string[] = ["beam_left", "beam_right"];

            sound(action, "minecraft:block.beacon.activate");

            /** 一条束的真实终点：沿“发射点 → 焦点”方向拉到原 reach，再用原生方块射线裁墙。 */
            function cast(from: CombatPoint): { end: CombatPoint; clipped: boolean; cell: CombatPoint | null; face: string } {
                const toFocus = focus.minus(from), span = toFocus.length();
                const direction = span < 0.05 ? heading : toFocus.unit();
                const wanted = from.plus(direction.scale(Math.max(reach, span)));
                const clip = world.clipBlocks(from, wanted);
                if (clip !== null && clip.blocked())
                    return { end: clip.position(), clipped: true, cell: clip.blockPosition(), face: clip.blockFace() };
                return { end: wanted, clipped: false, cell: null, face: "" };
            }

            /** 落在这一段细束里的非友方：每束每人一次半伤，全局按目标数封顶 maxTargets。 */
            function strikes(from: CombatPoint, end: CombatPoint): void {
                const perBeam: { [ref: string]: boolean } = {};
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(from, end, beamRadius), function (victim, facts) {
                    const ref = String(victim.ref());
                    if (ref === selfRef || perBeam[ref] || facts.friendly()) return;
                    if (!targeted[ref] && targetCount >= maxTargets) return;
                    if (!world.clear(from, facts.position())) return;
                    perBeam[ref] = true;
                    if (!targeted[ref]) { targeted[ref] = true; targetCount++; }
                    const landed = hurt(action, victim, signalbeamId, power * 0.5, { damage: damageSpec(signalbeamId, "beam") });
                    if (!landed) return;
                    hits++;
                    WorldFeedback.emit(world, signalbeamScene, 1, facts.position(),
                        { moment: "hit", target: ref, motes: motes, scale: scale, intensity: intensity }, 22);
                    if (world.valid(victim) && world.random() < chance) signalbeamJam(world, victim, facts.position(), daze, fumblePct);
                });
            }

            let crossed = true;
            for (let i = 0; i < froms.length; i++) {
                const from = froms[i], shot = cast(from);
                WorldFeedback.emit(world, signalbeamScene, 1, focus,
                    { moment: moments[i], path: [[from.x(), from.y(), from.z()], [shot.end.x(), shot.end.y(), shot.end.z()]],
                        motes: motes, scale: scale, intensity: intensity }, 24);
                if (shot.clipped && shot.end.minus(from).length() < focus.minus(from).length() - 0.05) crossed = false;
                if (shot.clipped) {
                    const cell = shot.cell === null ? shot.end : shot.cell;
                    WorldFeedback.emit(world, signalbeamScene, 1, cell,
                        { moment: "wall", face: shot.face, point: [cell.x(), cell.y(), cell.z()],
                            motes: Math.max(6, Math.round(motes * 0.4)), scale: scale }, 20);
                }
                strikes(from, shot.end);
            }
            if (crossed)
                WorldFeedback.emit(world, signalbeamScene, 1, focus, { moment: "cross", motes: Math.max(8, Math.round(motes * 0.6)), scale: scale }, 20);

            if (hits > 0) {
                sound(action, "cobblemon:impact.bug");
            } else {
                WorldFeedback.emit(world, signalbeamScene, 1, focus, { moment: "miss", scale: scale }, 22);
                WorldFeedback.text(world, focus.plus(WorldCombat.point(0, 1, 0)), signalbeamMissText, [], 22);
            }
            done(action);
        }
    });


    // 错乱存续期：低密度的飞鸟与电点每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_signalbeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== signalbeamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "signalbeam:jam:" + String(actor.ref()), signalbeamScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
