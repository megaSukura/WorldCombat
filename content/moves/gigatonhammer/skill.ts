/**
 * 巨力锤 / gigatonhammer —— 出手方式。
 *
 * 核心念头：连人带锤把巨锤高举过顶，再沿真实轨迹把锤头抡下；锤头真正走过、真正触到谁，谁才挨这一记。
 *   过顶式把锤头砸在前方可达的支撑面上，触地之后才从接触点沿真实地表掀起原来的三段地面冲击波，墙与断崖
 *   都会把它截停；横扫式把巨锤沿一条真实水平弧依次扫过，只有当前子弧里的人才被判到，没有「一圈同时亮」的
 *   瞬间圈伤。砸完收招很长，且短时间内无法再抡起巨锤（原生「无法连续使出2次」）。
 *
 * 幕：
 *   起（wind，提交前）：旋身把巨锤抡高；蓄力碎屑与钢光散开，锤身由同一个姿态驱动地抬高（`action.present`）。
 *   挥（swing，提交后）：锤头从过顶位置沿弧线逐刻下落（过顶式）或沿水平弧逐刻扫过（横扫式）。
 *       判定与画面共用同一组真实端点：锤头扫过的短段用 `WorldGeometry.bodySegment`，横扫子弧用 `bodyPolygon`；
 *       真实墙面用 `WorldGeometry.blockHit` 截停锤头。
 *   波（wave，仅过顶式）：锤头触地后才从接触点沿 `SurfacePaths` 推进，按原三段长度/时间依次前移，每段只
 *       结算真正走到的那一截；已吃主锤的目标不再吃波。
 *   收（mark/spent）：落点留下痕印，施法者进入禁复窗口（托管标识实现），身上留下标识。
 *
 * 选取 `kind: "aim"`：可指任意阵营实体、方向或地面点；方向或世界点空放也照样把锤头抡完。攻击许可仍由命中层
 *   决定，AI 仍按仇恨推荐敌人。
 *
 * 与同族分开：木槌/冰锤是自伤/减速的单点重击、臂锤是减速横扫；只有巨力锤是**真实巨锤轨迹 + 触地后的钢属性
 *   地面冲击波**。
 */
namespace PokemonSkills {
    /** 施法者一侧可用的禁复时长：宝可梦走公式，其他战斗者读同一个设计值（原生「无法连续使出2次」对所有人生效）。 */
    function gigatonhammerSpentTicks(world: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor);
            if (pokemon !== null)
                return Math.max(1, Math.round(p(gigatonhammerId, "spent", { pokemon: pokemon, skill: skills[gigatonhammerId],
                    detail: { values: skills[gigatonhammerId].defaults }, world: world, actor: actor })));
        }
        return Math.max(1, Math.round(actionParameters.value(gigatonhammerId, "spent")));
    }

    /** 禁复标识的托管效果：跟着施法者，窗口结束或被换招提前恢复时一起收走。对所有战斗者生效。 */
    const gigatonhammerSpentMark = "world_combat:gigatonhammer_spent";

    WorldCombat.effect(gigatonhammerSpentMark, 1, 400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks <= 0) throw new Error("Invalid gigatonhammer spent: ticks");
        return JSON.stringify({ ticks: Math.round(value.ticks) });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gigatonhammerSpentMark, "start", function (effect) { effect.schedule("watch", "watch", 1, "{}"); });
    WorldCombat.effectHandler(gigatonhammerSpentMark, "watch", function (effect) {
        const state = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        // 宝可梦换成别的招式，巨锤已能重新举起，标识随实际过程收走；其他战斗者没有换招窗口，标识按时长自然结束。
        if (String(actor.domain()) === "cobblemon") {
            const native = NativeEffects.read(world, actor);
            const spent = String(native.used) === gigatonhammerId && world.tick() - native.usedTick < state.ticks;
            if (!spent) { effect.end(); return; }
        }
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(gigatonhammerSpentMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 禁复门禁：身上还挂着本招的禁复标识时不可再抡。只作用于起手/提交；伤害阶段不复查。
     *  对宝可梦、原版生物、模组 Boss 与玩家是同一条路（标识挂在施法者身上）。 */
    function gigatonhammerSpent(context: CombatStatus.ActionPolicy): void {
        if (context.phase === "damage") return;
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return;
        if (context.world.effects(context.actor, gigatonhammerSpentMark).length > 0) context.blocked["move-restricted"] = true;
    }

    define({
        id: gigatonhammerId,
        cooldownParameter: "recharge",
        name: "Gigaton Hammer",
        description: "连人带锤把巨锤高举过顶再沿真实轨迹抡下：锤头真正扫过谁，谁才挨这一记。过顶式把锤头砸在前方可达的支撑面上，触地后才从接触点沿真实地表掀起三段地面冲击波，墙与断崖会把它截停；横扫式把巨锤沿真实水平弧依次扫过，只有当前弧段里的人被判到，不再是一圈同时亮起。砸完收招很长，短时间内无法再抡起巨锤——换成别的招式可以提前恢复。",
        uses: ["旋身蓄力后把巨锤沿真实轨迹抡下", "用触地后沿地表推进的三段冲击波扫掉一线之敌", "被围时用横扫式让巨锤扫出一条真实弧线"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.6,
        prepare: 12,
        active: 0,
        recover: 18,
        cooldown: 46,
        style: "hammer",
        defaults: { sweep: false, ai: { maxChase: 7, minHealth: 0.2, crowd: false } },
        fields: [],
        eligibility: gigatonhammerSpent,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[gigatonhammerId], detail: { values: config } };
            return {
                radius: p(gigatonhammerId, "reach", context), geometry: "line", style: "hammer", color: 0xB9C2CC,
                label: config && config.sweep === true ? "巨力锤·横扫" : "巨力锤·过顶"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[gigatonhammerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(gigatonhammerId, "spin", context)),
                recover: Math.round(p(gigatonhammerId, "recover", context)),
                cooldown: Math.round(p(gigatonhammerId, "recharge", context)),
                active: 0,
                range: p(gigatonhammerId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const dust = Math.max(10, Math.round(p(gigatonhammerId, "dust", action)));
            const body = action.sense().observe(action.actor());
            const centre = body === null ? action.origin() : body.position();
            action.present("gigatonhammer:wind:" + action.id(), gigatonhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare, dust: dust,
                    sweep: config && config.sweep === true ? 1 : 0, radius: p(gigatonhammerId, "shockLength", action) }));
            // 蓄力期锤身由同一姿态抬高：给客户端一个起点、时长与自转速度，它按 serverTick 画出真实抬锤。
            action.present("gigatonhammer:raise:" + action.id(), gigatonhammerHammerScene, 1, centre,
                JSON.stringify({ moment: "raise", start: action.sense().tick(), duration: Math.max(1, prepare),
                    root: [centre.x(), centre.y(), centre.z()], scale: p(gigatonhammerId, "reach", action) / 3.2,
                    sweep: config && config.sweep === true ? 1 : 0,
                    headRadius: body === null ? .45 : Math.max(.45, Math.min(1.1, body.width() * .55)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(gigatonhammerScene);
            const hammers = WorldFeedback.actionScenes(gigatonhammerHammerScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { scenes.finish(action, done); return; }
            // 蓄力抬锤的锤身随提交结束：用同一 key 发 lifecycle，让它在挥动开始前收走，不叠出第二把锤。
            action.present("gigatonhammer:raise:" + action.id(), gigatonhammerHammerScene, 1,
                self.position(), JSON.stringify({ lifecycle: { reason: "settled", tick: world.tick() } }));
            const sweep = !!(config && config.sweep);
            const hammer = p(gigatonhammerId, "hammer", action);
            const wave = p(gigatonhammerId, "wave", action);
            const reach = Math.max(2, action.range());
            const shockLength = Math.max(2, p(gigatonhammerId, "shockLength", action));
            const halfWidth = p(gigatonhammerId, "shockHalfWidth", action);
            const push = p(gigatonhammerId, "push", action);
            const dust = Math.max(12, Math.round(p(gigatonhammerId, "dust", action)));
            const shockSpeed = Math.max(0.3, p(gigatonhammerId, "shockSpeed", action));
            const spentTicks = gigatonhammerSpentTicks(world, actor);
            const origin = self.position();
            const feet = WorldCombat.point(origin.x(), self.boundsMin().y(), origin.z());
            const bodyWidth = self.width(), bodyHeight = self.height();
            const aimFlat = WorldGeometry.flatUnit(PokemonSkills.aim(action), action.direction());
            // 锤头大小来自身体：越宽的个体锤头越大，判定与画面同源。
            const headRadius = Math.max(0.45, Math.min(1.1, bodyWidth * 0.55));
            const topHeight = Math.max(1.2, bodyHeight * 1.5 + reach * 0.4);
            const scale = Math.max(0.5, Math.min(2.4, Math.max(reach, shockLength) / 4.8));
            const intensity = Math.max(0.6, Math.min(2.6, hammer / 160));
            const struck: { [ref: string]: boolean } = Object.create(null);
            let waveHits = 0, settled = false;
            let groundedImpact: CombatPoint | null = null;

            function vertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
            /** 用原生方块净空裁掉锤头体积，细分后在首阻区间二分；不移动施法者或生成代理实体。 */
            function clipHead(scope: CombatWorld, from: CombatPoint, wanted: CombatPoint): { point: CombatPoint; blocked: boolean } {
                function clear(point: CombatPoint): boolean {
                    return scope.freeSpace(point.minus(WorldCombat.point(0, headRadius, 0)), headRadius * 2, headRadius * 2);
                }
                if (!clear(from)) return { point: from, blocked: true };
                const delta = wanted.minus(from), samples = Math.max(1, Math.ceil(delta.length() / .1));
                let safe = 0;
                for (let i = 1; i <= samples; i++) {
                    const ratio = i / samples;
                    if (clear(from.plus(delta.scale(ratio)))) { safe = ratio; continue; }
                    let low = safe, high = ratio;
                    for (let refine = 0; refine < 10; refine++) {
                        const mid = (low + high) / 2;
                        if (clear(from.plus(delta.scale(mid)))) low = mid; else high = mid;
                    }
                    return { point: from.plus(delta.scale(low)), blocked: true };
                }
                return { point: wanted, blocked: false };
            }
            function sweepHead(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                const scope = current.world();
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(from, to, headRadius), function (victim, facts) {
                    if (settled) return;
                    const centre = from.plus(to.minus(from).scale(.5)), contact = scope.closestPoint(victim, centre);
                    const wall = scope.clipBlocks(centre, contact);
                    if (wall === null || wall.blocked()) return;
                    const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                    mainHit(current, victim, facts, away.length() > .01 ? away : aimFlat);
                });
            }
            function endAll(current: CombatAction): void {
                hammers.stop(current);
                scenes.finish(current, done);
            }

            /** 主锤命中：锤头真正扫过这个身体箱才调用；每个目标整招只吃一份，被推走时走原生受击位移。 */
            function mainHit(current: CombatAction, victim: CombatActor, facts: CombatObservation, away: CombatPoint): void {
                if (settled) return;
                const scope = current.world(), ref = String(victim.ref());
                if (ref === String(actor.ref()) || scope.friendly(victim) || struck[ref]) return;
                struck[ref] = true;
                if (!hurt(current, victim, gigatonhammerId, hammer, { damage: damageSpec(gigatonhammerId, "hammer"), contact: true })) return;
                if (!scope.valid(actor)) { settled = true; return; }
                if (scope.valid(victim) && away.length() > 0.01) scope.hitDisplace(victim, away.unit().scale(push));
                const at = facts.position();
                WorldFeedback.emit(scope, gigatonhammerScene, 1, at,
                    { moment: "hit", point: vertex(at), target: ref, dust: dust, scale: scale, intensity: intensity }, 26);
                sound(current, "cobblemon:impact.steel");
            }

            /** 收尾：落痕、结算文字、禁复标识，然后结束动作。 */
            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (groundedImpact !== null) WorldFeedback.emit(scope, gigatonhammerScene, 1, groundedImpact,
                    { moment: "mark", dust: dust, shockLength: headRadius, halfWidth: halfWidth, scale: 1,
                        intensity: intensity, sweep: sweep ? 1 : 0 }, 30);
                WorldFeedback.text(scope, feet.plus(WorldCombat.point(0, 1.0, 0)), gigatonhammerSlamText,
                    [Math.round(hammer), waveHits], 28);
                if (groundedImpact !== null) scope.sound("minecraft:block.anvil.land", groundedImpact, 16, "{}");
                // 禁复标识绑在实际窗口上：宝可梦换招提前恢复或窗口走完，标识一起收走；其他战斗者按时长自然结束。
                scope.effects(actor, gigatonhammerSpentMark).forEach(function (view) { scope.operation(view.id(), "world_combat:dispel", "{}"); });
                const rest = scope.observe(actor);
                const centre = rest === null ? origin : rest.position();
                const mark = scope.effect(gigatonhammerSpentMark, actor, JSON.stringify({ ticks: spentTicks }), spentTicks);
                if (mark > 0) {
                    WorldFeedback.onEffect(scope, mark, "gigatonhammer:spent", gigatonhammerScene, 1, centre,
                        { moment: "spent", target: String(actor.ref()), scale: scale, linger: spentTicks, seconds: Math.round(spentTicks / 20) });
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)), gigatonhammerTiredText, [Math.round(spentTicks / 20)], 30);
                }
                endAll(current);
            }

            // 过顶式：锤头从过顶位置沿弧线下落，真实墙面截停；触地后才沿真实地表掀起三段冲击波。
            function overhead(current: CombatAction): void {
                const scope = current.world();
                const aimed = current.targetPosition();
                const flat = WorldCombat.point(aimed.x() - origin.x(), 0, aimed.z() - origin.z());
                const distance = Math.max(1.0, Math.min(reach, flat.length() > 0.01 ? flat.length() : reach));
                const desired = WorldCombat.point(feet.x() + aimFlat.x() * distance, feet.y(), feet.z() + aimFlat.z() * distance);
                const support = SurfacePaths.support(scope, desired, 1.2, 3.0);
                const landing = support !== null ? support : desired;
                const finalHead = landing.plus(WorldCombat.point(0, headRadius, 0));
                const startHead = WorldCombat.point(feet.x() - aimFlat.x() * 0.4, feet.y() + topHeight, feet.z() - aimFlat.z() * 0.4);
                const swingTicks = Math.max(3, Math.round(reach / shockSpeed));
                const bulge = Math.min(2.0, topHeight * 0.35);

                function headAt(t: number): CombatPoint {
                    const eased = t * t * (3 - 2 * t);
                    const along = startHead.plus(finalHead.minus(startHead).scale(eased));
                    return along.plus(WorldCombat.point(0, Math.sin(Math.PI * t) * bulge, 0));
                }

                function waveSet(currentWave: CombatAction, actualSupport: CombatPoint): void {
                    const walked = SurfacePaths.advance(currentWave.world(), actualSupport, aimFlat, shockLength,
                        { up: 0.7, down: 1.0, spacing: 0.5, samples: Math.ceil(shockLength / 0.5) + 2 });
                    const path = walked.path;
                    const total = walked.travelled;
                    if (path.length < 2 || !(total > 0.05)) { settle(currentWave); return; }
                    const chunks = 3;
                    // 把真实地表路径按累计距离切成三段；每段只结算真正走到的那一截。
                    const lengths: number[] = [];
                    for (let i = 1; i < path.length; i++) lengths.push(path[i].minus(path[i - 1]).length());
                    function cellHits(scope2: CombatWorld, currentCall: CombatAction, from: CombatPoint, to: CombatPoint): void {
                        const direction = to.minus(from), span = direction.length();
                        if (!(span > 0.05)) return;
                        WorldGeometry.selectBodies(scope2, WorldGeometry.bodyLane(from, direction, span, halfWidth, { below: 1.2, above: 2.6 }),
                            function (victim, facts) {
                                const ref = String(victim.ref());
                                if (ref === String(actor.ref()) || scope2.friendly(victim) || struck[ref]) return;
                                const point = from.plus(to.minus(from).scale(.5)).plus(WorldCombat.point(0, .12, 0));
                                if (!scope2.clear(point, scope2.closestPoint(victim, point))) return;
                                if (!hurt(currentCall, victim, gigatonhammerId, wave, { damage: damageSpec(gigatonhammerId, "wave") })) return;
                                struck[ref] = true; waveHits++;
                                const at = facts.position();
                                if (scope2.valid(victim)) scope2.hitDisplace(victim, aimFlat.scale(push));
                                WorldFeedback.emit(scope2, gigatonhammerScene, 1, at,
                                    { moment: "wave_hit", point: vertex(at), target: ref, dust: Math.round(dust * 0.7),
                                        scale: scale, intensity: Math.max(0.5, intensity * 0.7) }, 24);
                            });
                        // 判定与画面共用这一段真实地面的四个角。
                        const side = WorldCombat.point(-direction.z(), 0, direction.x()).unit().scale(halfWidth);
                        const quad = [from.minus(side), from.plus(side), to.plus(side), to.minus(side)];
                        WorldFeedback.emit(scope2, gigatonhammerScene, 1, to,
                            { moment: "wave", path: quad.map(vertex), length: span, width: halfWidth * 2, dust: dust,
                                scale: scale, intensity: Math.max(0.5, intensity * 0.8), front: 0.5,
                                direction: [aimFlat.x(), aimFlat.y(), aimFlat.z()], sweep: 0 }, 24);
                    }
                    function runChunk(currentChunk: CombatAction, chunk: number, index: number, travelled: number): void {
                        const bound = total * (chunk + 1) / chunks;
                        while (index + 1 < path.length && travelled + lengths[index] <= bound + 1e-6) {
                            const a = SurfacePaths.support(currentChunk.world(), path[index], .1, .1);
                            const b = SurfacePaths.support(currentChunk.world(), path[index + 1], .1, .1);
                            if (a === null || b === null || !currentChunk.world().clear(a.plus(WorldCombat.point(0, .1, 0)), b.plus(WorldCombat.point(0, .1, 0)))) {
                                settle(currentChunk); return;
                            }
                            cellHits(currentChunk.world(), currentChunk, path[index], path[index + 1]);
                            travelled += lengths[index]; index++;
                        }
                        if (chunk + 1 >= chunks) { currentChunk.after(2, function (next: CombatAction) { settle(next); }); return; }
                        const span = total / chunks;
                        currentChunk.after(Math.max(2, Math.round(span / shockSpeed)), function (next: CombatAction) { runChunk(next, chunk + 1, index, travelled); });
                    }
                    runChunk(currentWave, 0, 0, 0);
                }

                function swingStep(currentSwing: CombatAction, index: number, from: CombatPoint): void {
                    const scope2 = currentSwing.world(), wanted = headAt((index + 1) / swingTicks);
                    const clipped = clipHead(scope2, from, wanted), to = clipped.point;
                    sweepHead(currentSwing, from, to);
                    if (settled) return;
                    hammers.show(currentSwing, "hammer", to,
                        { moment: "swing", root: vertex(origin), head: vertex(to), headRadius: headRadius, scale: scale, intensity: intensity, sweep: 0 });
                    scenes.show(currentSwing, "swing", to,
                        { moment: "swing", path: [vertex(from), vertex(to)], direction: [aimFlat.x(), aimFlat.y(), aimFlat.z()],
                            dust: dust, scale: scale, intensity: intensity, sweep: 0 });
                    if (clipped.blocked || index + 1 >= swingTicks) {
                        const under = to.minus(WorldCombat.point(0, headRadius, 0));
                        const actual = SurfacePaths.support(scope2, under, .04, .08);
                        // 预定的同一合法支撑面必须真的触到锤底；撞侧墙/顶板不启动地波。
                        const floorContact = support !== null && actual !== null && Math.abs(actual.y() - support.y()) <= .04
                            && actual.minus(support).length() <= headRadius + .15 && Math.abs(under.y() - actual.y()) <= .06;
                        if (floorContact) {
                            groundedImpact = actual;
                            WorldFeedback.emit(scope2, gigatonhammerScene, 1, actual!,
                                { moment: "slam", point: vertex(actual!), reach: reach, dust: dust, scale: scale, intensity: intensity,
                                    sweep: 0, direction: [aimFlat.x(), aimFlat.y(), aimFlat.z()] }, 26);
                            sound(currentSwing, "cobblemon:impact.steel");
                            waveSet(currentSwing, actual!);
                        } else settle(currentSwing);
                        return;
                    }
                    currentSwing.after(1, following => swingStep(following, index + 1, to));
                }

                swingStep(current, 0, startHead);
            }

            // 横扫式：巨锤沿真实水平弧逐刻扫过，只有当前子弧里的人才被判到，没有全周瞬间圈伤。
            function sweepArc(current: CombatAction): void {
                const radius = Math.max(1.4, Math.min(reach, shockLength));
                const sweepTicks = Math.max(8, Math.min(20, Math.round(radius * 2)));
                const base = Math.atan2(aimFlat.x(), aimFlat.z()), turn = Math.PI * 2;
                function headAt(angle: number): CombatPoint {
                    return WorldCombat.point(origin.x() + Math.sin(angle) * radius, origin.y(), origin.z() + Math.cos(angle) * radius);
                }
                function arcStep(currentArc: CombatAction, index: number): void {
                    const scope2 = currentArc.world();
                    const from = headAt(base + turn * index / sweepTicks), wanted = headAt(base + turn * (index + 1) / sweepTicks);
                    const clipped = clipHead(scope2, from, wanted), head = clipped.point;
                    sweepHead(currentArc, from, head);
                    if (settled) return;
                    hammers.show(currentArc, "hammer", head,
                        { moment: "swing", root: vertex(origin), head: vertex(head), headRadius: headRadius, scale: scale, intensity: intensity, sweep: 1 });
                    scenes.show(currentArc, "swing", head,
                        { moment: "swing", path: [vertex(from), vertex(head)], direction: [aimFlat.x(), aimFlat.y(), aimFlat.z()],
                            dust: dust, scale: scale, intensity: intensity, sweep: 1 });
                    if (clipped.blocked || index + 1 >= sweepTicks) { settle(currentArc); return; }
                    currentArc.after(1, following => arcStep(following, index + 1));
                }

                sound(current, "minecraft:entity.iron_golem.attack");
                arcStep(current, 0);
            }

            if (sweep) sweepArc(action); else overhead(action);
        }
    });
}
