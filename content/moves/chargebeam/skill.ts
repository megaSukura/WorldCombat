/**
 * 充电光束 / chargebeam 的出手方式。
 *
 * 核心念头：把身体里的电压成一道细束，从喷口一路连到当刻的真实碰撞点；开火第一刻就沿自由准心判定首碰，
 *   命中的敌人吃下主击，并在成功时把一股余流回灌进体内，把特攻抬起来。之后每一刻准心都跟着走，细束始终
 *   连着当刻的实际落点；只有把束一直压在同一个受击者身上直到收束，尾端才会再闪一下余流、咬上第二口。
 *   它是唯一需要「持续瞄准同一点」的远距离光束：蓄得越久越远越强，但主击只有开火第一刻那一下。
 *
 * 三幕：
 *   起（windup，提交前）：电弧向身前一点收拢、越收越亮，只播预告，可被打断。
 *   束（beam，提交后）：每个 tick 从喷口沿自由 aim 做一次 `trace`（含友方与墙），把细束画到真实首碰点；
 *       开火第一刻的首碰若是敌人，结算 `beam` 主击并掷一次回灌；之后不再补主击。
 *   咬（residual / fizzle）：收束当刻若主击目标仍在同一束上，`hurt` 再咬一口 `residualShare`；否则只留散电。
 *
 * 与同族分开：火之舞是贴着自己跳、覆盖全身、扫一圈；充电光束是远远一条连着的细束、要求持续瞄准同一点。
 *   与十万伏特也不同：它是一条细束、蓄电驱动、命中后涨特攻而不是麻痹。
 *
 * 自由瞄准内容：`kind: "aim"` 允许任何阵营实体或世界点，也能空扫；攻击权限仍由命中层控制。
 * 配置 `overcharge`（过充）由 resolve 改时序、由公式改射程／威力／几率。
 */
namespace PokemonSkills {
    const chargebeamScene = "world_combat:move_chargebeam";
    const chargebeamHitText = "world_combat.move.chargebeam.text.hit";
    const chargebeamSurgeText = "world_combat.move.chargebeam.text.surge";
    const chargebeamResidualText = "world_combat.move.chargebeam.text.residual";
    const chargebeamFizzleText = "world_combat.move.chargebeam.text.fizzle";

    /** 持续自由瞄准：优先读按住键时客户端逐刻送来的控制点，AI 或未声明输入时回退到目标点／动作方向。 */
    function chargebeamAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const aimed = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
                const delta = aimed.minus(action.origin());
                if (delta.length() > 0.05) return delta.unit();
            }
        } catch (error) { }
        try {
            const delta = action.targetPosition().minus(action.origin());
            if (delta.length() > 0.05) return delta.unit();
        } catch (error) { }
        return action.direction();
    }

    function chargebeamVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: "chargebeam",
        cooldownParameter: "recharge",
        name: "Charge Beam",
        description: "按住喷口放出一道细束，沿自由准心连接当刻的真实首碰点；开火第一刻的命中造成伤害，并可能回灌自身特攻。把束保持在同一个目标上直到收束，尾端会再闪一次余流。过充时威力与射程更高。",
        uses: ["按住细束压住一个目标，逼它站住吃满", "首击读一次回灌，把特攻蓄起来", "在中远距离用细束先手点射弱点"],
        kind: "aim",
        range: 9,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "beam",
        stationary: true,
        defaults: { overcharge: false, ai: { maxChase: 13, chargeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("chargebeam", "reach", pokemon), geometry: "line", style: "beam", color: 0xFFE14D,
                label: config && config.overcharge === true ? "过充光束" : "充电光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["chargebeam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("chargebeam", "tempo", context)),
                recover: Math.round(p("chargebeam", "aftercast", context)),
                cooldown: Math.round(p("chargebeam", "recharge", context)),
                active: 0,
                range: p("chargebeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(5, Math.round(p("chargebeam", "arcs", action)));
            action.present("world_combat:move_chargebeam:windup", chargebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs,
                    overcharge: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(chargebeamScene);
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const power = p("chargebeam", "beam", action);
            const radius = p("chargebeam", "radius", action);
            const chance = Math.max(0.02, Math.min(0.98, p("chargebeam", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("chargebeam", "surgeStages", action)));
            const share = Math.max(0.1, Math.min(0.9, p("chargebeam", "residualShare", action)));
            const hold = Math.max(1, Math.round(p("chargebeam", "beamDuration", action)));
            const arcs = Math.max(5, Math.round(p("chargebeam", "arcs", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.4, power / 50));
            const flow = Math.round(50 + power * 0.5);
            let mainRef = "", lastContactRef = "", lastEndpoint: CombatPoint | null = null;
            let sawMain = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 收束当刻，只有主击受击者仍在同一束接触上，才结算余流；转开、离场或隔墙断束都失去它。
                if (mainRef !== "" && lastContactRef === mainRef && lastEndpoint !== null) {
                    const victim = scope.actor(mainRef);
                    if (victim !== null && scope.valid(victim)) {
                        const landed = hurt(current, victim, "chargebeam", power * share,
                            { damage: damageSpec("chargebeam", "beam") });
                        if (landed) {
                            WorldFeedback.emit(scope, chargebeamScene, 1, lastEndpoint,
                                { moment: "residual", target: mainRef, arcs: arcs, scale: scale,
                                    intensity: Math.max(0.4, Math.min(2.0, power * share / 50)) }, 22);
                            WorldFeedback.text(scope, lastEndpoint.plus(WorldCombat.point(0, 0.9, 0)), chargebeamResidualText, [], 22);
                            sound(current, "cobblemon:impact.electric");
                        }
                    }
                } else if (!sawMain && lastEndpoint !== null) {
                    // 从没打中敌人：收束时在真实末端散一下电（打在墙或友方身上也是这里）。
                    WorldFeedback.emit(scope, chargebeamScene, 1, lastEndpoint, { moment: "fizzle", arcs: arcs, scale: scale }, 20);
                    WorldFeedback.text(scope, lastEndpoint.plus(WorldCombat.point(0, 0.7, 0)), chargebeamFizzleText, [], 22);
                }
                scenes.finish(current, done);
            }

            /** 首击命中后的回灌：按实际涨到的特攻级数播，满级或拒绝不留任何成功回执。 */
            function surge(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                if (scope.random() >= chance) return;
                const delta = NativeEffects.boost(scope, actor, "spa", stages);
                if (delta <= 0) return;
                const self = scope.observe(actor);
                const selfPoint = self === null ? current.origin() : self.position();
                WorldFeedback.emit(scope, chargebeamScene, 1, selfPoint,
                    { moment: "surge", target: actorRef, stages: delta, arcs: arcs, scale: scale }, 26);
                // 一缕电沿主击那条束从命中点回流到施法者。
                const back = selfPoint.minus(point);
                const inward = back.length() < 0.01 ? WorldCombat.point(0, 1, 0) : back.unit();
                WorldFeedback.emit(scope, chargebeamScene, 1, point,
                    { moment: "reflux", path: [chargebeamVertex(point), chargebeamVertex(selfPoint)],
                        direction: [inward.x(), inward.y(), inward.z()],
                        arcs: arcs, scale: scale, intensity: intensity }, 20);
                WorldFeedback.text(scope, selfPoint.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    chargebeamSurgeText, [delta], 28);
                sound(current, "minecraft:block.respawn_anchor.charge");
            }

            function beam(current: CombatAction, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const direction = chargebeamAim(current);
                const muzzleLen = Math.min(0.5, 0.2 + self.height() * 0.15);
                const muzzle = origin.plus(direction.scale(muzzleLen));
                const end = muzzle.plus(direction.scale(Math.max(0.2, action.range() - muzzleLen)));
                // 权威判定：线的第一个实体（含友方与自身阻挡）或方块就是细束的真实落点。
                const contact = current.trace(muzzle, end, radius, true);
                const endpoint = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && !scope.friendly(lander) && String(lander.ref()) !== actorRef ? lander : null;

                lastEndpoint = endpoint;
                lastContactRef = victim !== null ? String(victim.ref()) : "";

                // 主击只在开火第一刻、按实际首碰结算；之后即使扫到新目标也不补整次主击。
                if (!sawMain && elapsed === 0 && victim !== null && scope.valid(victim)) {
                    const landed = impact(current, contact, "chargebeam", power,
                        { damage: damageSpec("chargebeam", "beam") });
                    if (landed) {
                        sawMain = true;
                        mainRef = String(victim.ref());
                        WorldFeedback.emit(scope, chargebeamScene, 1, endpoint,
                            { moment: "hit", target: mainRef, arcs: arcs, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.2, 0)), chargebeamHitText, [], 24);
                        sound(current, "cobblemon:impact.electric");
                        surge(current, endpoint);
                    }
                }

                const span = endpoint.minus(muzzle).length();
                scenes.show(current, "beam", muzzle, {
                    moment: "beam", path: [chargebeamVertex(muzzle), chargebeamVertex(endpoint)],
                    point: chargebeamVertex(endpoint), direction: [direction.x(), direction.y(), direction.z()],
                    length: span, arcs: arcs, scale: scale, intensity: intensity, flow: flow
                });

                if (elapsed + 1 >= hold) { finish(current); return; }
                current.after(1, function (next: CombatAction) { beam(next, elapsed + 1); });
            }

            sound(action, "cobblemon:move.thunderbolt.actor");
            beam(action, 0);
        }
    });

    // 按住技能键持续引导细束、逐刻调整准心；松手（world_combat:input-stop）由动作生命周期当刻收束。
    WorldCombat.preview("world_combat:chargebeam", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
