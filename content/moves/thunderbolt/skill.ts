/**
 * 十万伏特 / thunderbolt —— 出手方式。
 *
 * 核心念头：先射出一束主电，再从中招者向邻敌分叉传导。主束沿当刻锁定的瞄准线逐段推进，**每刻只判当前新段**：
 *   前方第一处实际阻挡（实体或方块）就是真实终点，射线总长按 range 封住。目标在推进途中躲出这条线就不会中；
 *   中途插墙也会立刻停在真实接触处。主伤害真的成立后才播成功冲击与文字，再进入分叉；被拒绝只在接触点散电。
 *   它仍是本族最标准的一发：距离中等、随时能放、单体威力不是最高、麻人的机会也最小；扩散式把这一发从单体点射改成树状短电链。
 *
 * 幕：
 *   起（charge，提交前）：指尖攒电、压成束的预告（`action.present`，可被打断、不花 PP）。
 *   束（beam）：提交后主束沿锁定方向逐段推进，每段判定与画面读同一组起终点。
 *   击（impact / fizzle）：终点是实体且伤害成立则结算 `bolt`、并按 `numbChance` 试着麻住；是方块、空气或伤害被拒绝则原地散电。
 *   散（branch）：仅当主击中真实命中敌人且启用扩散式时，从它出发向最短、通视、未被电过的邻敌生成树状短电链，
 *       每 3 刻新增一条，受 `splashTargets` 人数与 `splashShare` 分摊预算约束，每个目标只电一次；无实伤节点不导通。
 *       已导通节点消失时，用该轮最后实际接触点作为固定导通源，后续活体仍要当前通视与真实连边。
 *
 * 与同族分开：电击是贴身的短刺、电磁炮是要蓄的直线重炮；只有十万伏特是「先主束、后从命中者分叉」的那个。
 */
namespace PokemonSkills {
    const thunderboltScene = "world_combat:move_thunderbolt";
    const thunderboltBurstText = "world_combat.move.thunderbolt.text.burst";
    const thunderboltSplashText = "world_combat.move.thunderbolt.text.splash";
    const thunderboltFizzleText = "world_combat.move.thunderbolt.text.fizzle";

    function thunderboltCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: thunderboltId,
        cooldownParameter: "recharge",
        name: "Thunderbolt",
        description: "先射出一束主电，命中处炸开并向最近的邻敌分叉传导。主束沿瞄准线逐段推进，前方第一处实际阻挡决定真实终点；途中挡墙、目标走位都会改变实际命中。扩散式下分叉按预算电到几个连通的目标，每个只电一次。命中后有小概率把目标麻住。电属性对麻痹免疫。",
        uses: ["中距离的单体压制", "在敌群里点一下顺着连电到旁边的人", "隔着一段距离先手压血"],
        kind: "aim",
        range: 9,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "electric",
        defaults: { spread: false, ai: { maxChase: 13, preferChain: true, seekUnparalysed: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thunderboltId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(thunderboltId, "tempo", context)),
                recover: Math.round(p(thunderboltId, "recover", context)),
                cooldown: Math.round(p(thunderboltId, "recharge", context)),
                active: 0,
                range: p(thunderboltId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(5, Math.round(p(thunderboltId, "arcs", action)));
            const power = p(thunderboltId, "bolt", action);
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            action.present("thunderbolt:charge:" + action.id(), thunderboltScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs, intensity: intensity,
                    spread: config && config.spread ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[thunderboltId], detail: { values: config } };
            return { radius: p(thunderboltId, "reach", context), geometry: "line", style: "electric", color: 0xFFE14D,
                label: config && config.spread === true ? "十万伏特·扩散" : "十万伏特" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const spread = !!(config && config.spread);
            const power = p(thunderboltId, "bolt", action);
            const beamSpeed = p(thunderboltId, "beamSpeed", action);
            const radius = p(thunderboltId, "burstRadius", action);
            const chance = p(thunderboltId, "numbChance", action);
            const numbTicks = Math.max(20, Math.round(p(thunderboltId, "numbTicks", action)));
            const arcs = Math.max(5, Math.round(p(thunderboltId, "arcs", action)));
            const share = p(thunderboltId, "splashShare", action);
            const cap = Math.max(1, Math.round(p(thunderboltId, "splashTargets", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const scenes = WorldFeedback.actionScenes(thunderboltScene);
            let settled = false;

            // 起手锁定射线方向与总长（按 range 封住）；端点随每刻真实推进更新。
            const aimPoint = action.targetPosition();
            let delta = aimPoint.minus(origin);
            if (delta.length() < 0.05) delta = action.direction().scale(action.range());
            const direction = delta.length() > 0.02 ? delta.unit() : action.direction();
            const rayLength = Math.max(0.4, Math.min(delta.length(), action.range()));
            const steps = Math.max(1, Math.min(4, Math.ceil(rayLength / Math.max(0.3, beamSpeed))));
            let endpoint = origin.plus(direction.scale(rayLength));
            let victim: CombatActor | null = null;
            let stopped = false;

            sound(action, "cobblemon:move.thunderbolt.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            // 扩散：从主命中者出发，向最近的未电过、通视、边长不超电链步长的敌人生成树状短链，每 3 刻一条。
            function grow(current: CombatAction): void {
                const nodes: { actor: CombatActor; point: CombatPoint }[] = [{ actor: victim!, point: endpoint }];
                const struck: { [ref: string]: boolean } = Object.create(null);
                struck[String(victim!.ref())] = true;
                let added = 0;

                function close(now: CombatAction): void {
                    if (added > 0)
                        WorldFeedback.text(now.world(), endpoint.plus(WorldCombat.point(0, 1.5, 0)), thunderboltSplashText, [added], 26);
                    finish(now);
                }

                function branch(now: CombatAction): void {
                    if (added >= cap) { close(now); return; }
                    const live = now.world();
                    let best: CombatActor | null = null, from: CombatPoint | null = null, to: CombatPoint | null = null, bestGap = Infinity;
                    for (let n = 0; n < nodes.length; n++) {
                        const node = nodes[n];
                        const nodeBody = live.observe(node.actor);
                        // 节点已消失：用该轮最后实际接触点作为固定导通源，不跟死实体补实时位置。
                        const fromPoint = nodeBody === null ? node.point : nodeBody.position();
                        const nearby = live.query(fromPoint, radius, false);
                        for (let i = 0; i < nearby.length; i++) {
                            const actor = nearby[i], ref = String(actor.ref());
                            if (struck[ref] || ref === String(self.ref())) continue;
                            const body = live.observe(actor);
                            if (body === null || body.friendly()) continue;
                            const point = body.position();
                            const gap = point.minus(fromPoint).length();
                            if (gap > radius + 1e-6 || gap >= bestGap) continue;
                            if (!live.clear(fromPoint, point)) continue;
                            best = actor; from = fromPoint; to = point; bestGap = gap;
                        }
                    }
                    if (best === null || from === null || to === null) { close(now); return; }
                    struck[String(best.ref())] = true;
                    const dealt = hurt(now, best, thunderboltId, power * share, { damage: damageSpec(thunderboltId, "bolt") });
                    if (dealt) {
                        added++;
                        nodes.push({ actor: best, point: to });
                        WorldFeedback.emit(live, thunderboltScene, 1, from,
                            { moment: "branch", target: String(best.ref()), path: [thunderboltCoords(from), thunderboltCoords(to)],
                                arcs: Math.max(3, Math.round(arcs * 0.5)), scale: scale, intensity: intensity }, 22);
                        if (added >= cap) { close(now); return; }
                    }
                    now.after(3, branch);
                }

                current.after(3, branch);
            }

            function resolveMain(current: CombatAction): void {
                const scope = current.world();
                scenes.stop(current, "beam");
                if (victim !== null && scope.valid(victim)) {
                    const landed = hurt(current, victim, thunderboltId, power,
                        { damage: damageSpec(thunderboltId, "bolt"), status: "paralysis", chance: chance, statusTicks: numbTicks });
                    if (landed) {
                        // 主伤害真的成立，才播成功冲击与命中文字，再进入分叉。
                        WorldFeedback.emit(scope, thunderboltScene, 1, endpoint,
                            { moment: "impact", path: [thunderboltCoords(origin), thunderboltCoords(endpoint)],
                                target: String(victim.ref()), arcs: arcs, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.1, 0)), thunderboltBurstText, [], 26);
                        sound(current, "cobblemon:move.thunderbolt.target");
                        if (spread) { grow(current); return; }
                    } else {
                        // 伤害被拒绝（相性免疫、权限、被挡下）：只在接触点散电，不谎报命中。
                        WorldFeedback.emit(scope, thunderboltScene, 1, endpoint,
                            { moment: "fizzle", arcs: Math.max(3, Math.round(arcs * 0.6)), scale: scale }, 20);
                    }
                    finish(current);
                    return;
                }
                WorldFeedback.emit(scope, thunderboltScene, 1, endpoint, { moment: "fizzle", arcs: Math.max(3, Math.round(arcs * 0.6)), scale: scale }, 20);
                WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 0.6, 0)), thunderboltFizzleText, [], 22);
                finish(current);
            }

            function advance(current: CombatAction, step: number): void {
                if (settled) return;
                if (step >= steps) { resolveMain(current); return; }
                const from = origin.plus(direction.scale(rayLength * (step / steps)));
                const to = origin.plus(direction.scale(rayLength * ((step + 1) / steps)));
                // 每刻只 trace 已推进的新段，首碰真实阻挡立即停止。
                const hit = current.trace(from, to, 0.22);
                if (hit.hitEntity()) {
                    const lander = hit.target();
                    if (lander !== null && !world.friendly(lander) && String(lander.key()) !== String(self.key())) victim = lander;
                    endpoint = hit.position();
                    stopped = true;
                } else if (hit.blocked()) {
                    endpoint = hit.position();
                    stopped = true;
                } else {
                    endpoint = to;
                }
                scenes.show(current, "beam", origin,
                    { moment: "beam", path: [thunderboltCoords(origin), thunderboltCoords(endpoint)],
                        arcs: arcs, scale: scale, intensity: intensity, thin: stopped ? 0 : 1 });
                if (stopped) { resolveMain(current); return; }
                current.after(1, function (next: CombatAction) { advance(next, step + 1); });
            }

            advance(action, 0);
        }
    });
}
