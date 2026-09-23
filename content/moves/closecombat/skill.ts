/**
 * 近身战 / closecombat 的出手方式。
 *
 * 核心念头：**不设防地抢进对手怀里打一串快拳**——原地沉肩半格、拳头一下一下砸在同一点上，打完门户大开。
 *   它不需要助跑，是全族里起手最快、冷却最短的一记；代价是每一拳都轻，对手一退这串拳就断在空处。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：屈膝沉肩，双拳在身前收拢、脚边尘被吸起，只播预告（`windup`），此时代价未结清。
 *   打（guard → hit）：提交后立刻把自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯并播「弃守」闪光——
 *       弃守是提交那一刻付的，之后无论中与不中都照付。随后逐击朝目标当前位置垫步并打出一记 `blow`（=总威力 / 次数）
 *       接触伤害；横扫式还在每击把正面 arc 度、reach 内的其他敌人以 share 保留一起扫到。每击间隔 gap，
 *       目标走开或在 reach 之外就断。
 *   散（slump）：重心散掉，身上浮起脱力灰气并浮字提示降级；落空只留下扑空的尘。
 *
 * 与同族分开：蛮力是一记最重的单发加撞飞、留坑；突飞猛扑是长程直线犁地；铠农炮在远处；画龙点睛从天而降。
 *   近身战没有助跑、没有地面残留、不撞飞，靠「贴脸三到五下快拳」被认出来。
 *
 * 配置 `wide`（横扫式）由 `resolve` 改时序、由公式改威力／扇角／保留，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const closecombatScene = "world_combat:move_closecombat";
    const closecombatSlumpText = "world_combat.move.closecombat.text.slump";
    const closecombatMissText = "world_combat.move.closecombat.text.miss";
    const closecombatSweepText = "world_combat.move.closecombat.text.sweep";

    /** 正面扇形的顶点：origin 加弧上采样点；判定（sector）与表现（polygon）共用同一组角度。 */
    function closecombatFan(origin: CombatPoint, direction: CombatPoint, radius: number, degrees: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const base = Math.atan2(heading.z(), heading.x());
        const half = Math.max(4, Math.min(180, degrees)) * Math.PI / 360;
        const samples = 9;
        const points: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let index = 0; index < samples; index++) {
            const angle = base - half + half * 2 * (index / (samples - 1));
            points.push([origin.x() + Math.cos(angle) * radius, origin.y(), origin.z() + Math.sin(angle) * radius]);
        }
        return points;
    }

    define({
        id: closecombatId,
        cooldownParameter: "recharge",
        name: "Close Combat",
        description: "The user fights the target up close without guarding itself, lowering its own Defense and Sp. Def.",
        uses: ["贴脸用一串快拳把对手打残", "横扫式一次扫到挤在正面的几个人", "在对手退开之前把一口气打完"],
        kind: "enemy",
        range: 1.9,
        maxRange: 2.6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 34,
        maximumTicks: 200,
        style: "flurry",
        defaults: { wide: false, ai: { maxChase: 6, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(closecombatId, "reach", pokemon) : 1.9, geometry: "cone", style: "flurry",
                color: 0xE8A24A, label: config && config.wide === true ? "近身战·横扫式" : "近身战·贯一式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[closecombatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const wide = !!(config && config.wide);
            return {
                prepare: Math.round(p(closecombatId, "tempo", context)),
                recover: Math.round(p(closecombatId, "aftercast", context)) + (wide ? 2 : 0),
                cooldown: Math.round(p(closecombatId, "recharge", context)) + (wide ? 4 : 0),
                active: 0,
                range: p(closecombatId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_closecombat:ready", closecombatScene, 1, action.origin(),
                JSON.stringify({ moment: "ready", wide: config && config.wide === true ? 1 : 0,
                    motes: Math.round(p(closecombatId, "motes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const flurry = p(closecombatId, "flurry", action);
            const hits = Math.max(1, Math.round(p(closecombatId, "hits", action)));
            const blow = flurry / hits;
            const reach = p(closecombatId, "reach", action);
            const advance = p(closecombatId, "advance", action);
            const gap = Math.max(2, Math.round(p(closecombatId, "gap", action)));
            const push = p(closecombatId, "push", action);
            const wide = !!(config && config.wide);
            const arc = p(closecombatId, "arc", action);
            const share = p(closecombatId, "share", action);
            const guardLoss = Math.max(0, Math.round(p(closecombatId, "guardLoss", action)));
            const poiseLoss = Math.max(0, Math.round(p(closecombatId, "poiseLoss", action)));
            const motes = Math.round(p(closecombatId, "motes", action));
            const scale = Math.max(0.6, Math.min(2.4, reach / 1.9));
            const intensity = Math.max(0.5, Math.min(2.4, blow / 40));
            const up = WorldCombat.point(0, 1.35, 0);
            let index = 0, struck = 0, settled = false;

            // 弃守是提交那一刻付的：先写降级，无论中与不中都照付。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            const guardCracks = Math.max(6, Math.round(guardLoss * 6 + poiseLoss * 3));
            WorldFeedback.emit(world, closecombatScene, 1, action.origin(),
                { moment: "guard", guardLoss: guardLoss, poiseLoss: poiseLoss, guardCracks: guardCracks, wide: wide ? 1 : 0,
                    motes: motes, scale: scale, intensity: intensity }, 22);
            sound(action, "cobblemon:move.closecombat.actor_1");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), self = scope.observe(actor);
                if (self !== null) {
                    const fatigue = Math.max(10, Math.round(struck * 4 + (guardLoss + poiseLoss) * 6));
                    WorldFeedback.emit(scope, closecombatScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLoss, poiseLoss: poiseLoss, struck: struck, hits: hits,
                            fatigue: fatigue, motes: motes, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, self.position().plus(up), closecombatSlumpText, [guardLoss, poiseLoss], 28);
                }
                sound(current, "cobblemon:move.closecombat.actor_2");
                done(current);
            }

            function step(current: CombatAction): void {
                if (settled) return;
                if (index >= hits) { finish(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                const victim = scope.actor(targetRef);
                if (self === null || victim === null || !scope.valid(victim)) { finish(current); return; }
                const victimBody = scope.observe(victim);
                if (victimBody === null) { finish(current); return; }
                const origin = self.position();
                const distance = origin.minus(victimBody.position()).length();
                current.face(victimBody.position(), 25, 25);

                if (distance > reach + 1.0) {
                    WorldFeedback.emit(scope, closecombatScene, 1, origin,
                        { moment: "whiff", index: index, hits: hits, motes: motes, scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(up), closecombatMissText, [], 24);
                    finish(current);
                    return;
                }
                let heading = victimBody.position().minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                const landed = hurt(current, victim, closecombatId, blow, { damage: damageSpec(closecombatId, "flurry"), contact: true });
                if (landed) {
                    struck++;
                    WorldFeedback.emit(scope, closecombatScene, 1, victimBody.position(),
                        { moment: "hit", target: targetRef, index: index, hits: hits, motes: motes, scale: scale, intensity: intensity }, 20);
                    sound(current, "cobblemon:move.closecombat.target");
                }
                if (wide && arc > 0) {
                    const fan = closecombatFan(origin, heading, reach + 0.5, arc);
                    if (index === 0)
                        WorldFeedback.emit(scope, closecombatScene, 1, origin,
                            { moment: "sweep", path: fan, arc: arc, share: share, motes: motes, scale: scale, intensity: intensity }, 22);
                    let swept = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, heading, reach + 0.5, arc, { below: 1.2, above: 2.2 }),
                        function (other, facts) {
                            if (String(other.ref()) === targetRef) return;
                            if (hurt(current, other, closecombatId, blow * share, { damage: damageSpec(closecombatId, "flurry") })) {
                                swept++;
                                WorldFeedback.emit(scope, closecombatScene, 1, facts.position(),
                                    { moment: "hit", target: String(other.ref()), index: index, hits: hits, motes: motes, scale: scale, intensity: intensity }, 18);
                            }
                        });
                    if (index === 0 && swept > 0)
                        WorldFeedback.text(scope, origin.plus(up), closecombatSweepText, [swept], 24);
                }
                // 垫前一步跟上对手的小退步；不冲过头。
                const forward = Math.min(advance, Math.max(0, distance - 0.45));
                if (forward > 0.03) scope.displace(actor, heading.unit().scale(forward));
                if (landed && scope.valid(victim) && push > 0.05) scope.displace(victim, heading.unit().scale(push));
                index++;
                if (scope.valid(victim)) current.after(gap, function (next: CombatAction) { step(next); });
                else finish(current);
            }

            step(action);
        }
    });
}
