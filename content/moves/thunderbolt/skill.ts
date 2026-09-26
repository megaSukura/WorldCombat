/**
 * 十万伏特 / thunderbolt —— 出手方式。
 *
 * 核心念头：先射出一束主电，再从中招者向邻敌分叉传导。主束沿固定瞄准线在 4 刻内逐段推进，前方第一处实际
 *   阻挡决定终点：电到实体就在它身上炸开并向四周分叉，撞墙或空放只散电、不再长链。它仍是本族最标准的一发：
 *   距离中等、随时能放、单体威力不是最高、麻人的机会也最小；扩散式把这一发从单体点射改成树状短电链。
 *
 * 幕：
 *   起（charge，提交前）：指尖攒电、压成束的预告（`action.present`，可被打断、不花 PP）。
 *   束（beam）：提交后主束沿锁定方向逐段推进，判定与画面读同一组起终点；推进段数由距离与电束速度决定，封顶 4 刻。
 *   击（impact / fizzle）：终点是实体则结算 `bolt`，并按 `numbChance` 试着麻住；是方块或空气则原地散电。
 *   散（branch）：仅当主击中真实命中敌人且启用扩散式时，从它出发向最短、通视、未被电过的邻敌生成树状短电链，
 *       每 3 刻新增一条，受 `splashTargets` 人数与 `splashShare` 分摊预算约束，每个目标只电一次。
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
        description: "先射出一束主电，命中处炸开并向最近的邻敌分叉传导。主束沿瞄准线在 4 刻内逐段推进，前方第一处实际阻挡决定终点；扩散式下分叉按预算电到几个连通的目标，每个只电一次。命中后有小概率把目标麻住。电属性对麻痹免疫。",
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

            // 主束的起终点一次算清：端点由瞄准线前方第一处实际阻挡决定，判定与表现共用。
            let aimPoint = action.targetPosition();
            let delta = aimPoint.minus(origin);
            if (delta.length() < 0.05) delta = action.direction().scale(action.range());
            const direction = delta.length() > 0.02 ? delta.unit() : action.direction();
            const end = origin.plus(direction.scale(Math.max(0.4, delta.length())));
            const hit = action.trace(origin, end, 0.22);
            const endpoint = hit.position();
            const lander = hit.hitEntity() ? hit.target() : null;
            const victim = lander !== null && !world.friendly(lander) && String(lander.key()) !== String(self.key()) ? lander : null;
            const distance = endpoint.minus(origin).length();
            const steps = Math.max(1, Math.min(4, Math.round(distance / Math.max(0.3, beamSpeed))));

            sound(action, "cobblemon:move.thunderbolt.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            // 扩散：从主命中者出发，向最近的未电过、通视、边长不超 burstRadius 的敌人生成树状短链，每 3 刻一条。
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
                // 主束到达终点：先在终点停下并放主爆，再结算。
                scenes.stop(current, "beam");
                WorldFeedback.emit(scope, thunderboltScene, 1, endpoint,
                    { moment: "impact", path: [thunderboltCoords(origin), thunderboltCoords(endpoint)],
                        target: victim === null ? "" : String(victim.ref()), arcs: arcs, scale: scale, intensity: intensity }, 26);
                if (victim !== null && scope.valid(victim)) {
                    const landed = hurt(current, victim, thunderboltId, power,
                        { damage: damageSpec(thunderboltId, "bolt"), status: "paralysis", chance: chance, statusTicks: numbTicks });
                    WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.1, 0)), thunderboltBurstText, [], 26);
                    sound(current, "cobblemon:move.thunderbolt.target");
                    if (spread && landed) { grow(current); return; }
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
                const next = step + 1, t = next / steps;
                const frontier = origin.plus(endpoint.minus(origin).scale(t));
                scenes.show(current, "beam", origin,
                    { moment: "beam", path: [thunderboltCoords(origin), thunderboltCoords(frontier)],
                        arcs: arcs, scale: scale, intensity: intensity, thin: next < steps ? 1 : 0 });
                current.after(1, function (next2: CombatAction) { advance(next2, next); });
            }

            advance(action, 0);
        }
    });
}
