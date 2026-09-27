/**
 * 影子偷袭 / shadowsneak 的出手方式。
 *
 * 核心念头：本人不动，一道低矮的短影贴着地面朝提交的方向爬出去，沿真实台阶起落；它踩到第一只敌人的身体时，
 *   从那只敌人的背侧上挑一刀，按 `sneak` 结算一次接触伤害。影子遇到断崖、实墙或水面就塌回空处，
 *   不越墙、不追空、也不拉拽或减速——只认站在地面上的第一只。
 *
 * 两幕：
 *   起（pool，提交前）：脚下的影子加深、拉长，只播预告。
 *   探（crawl → stab / fizzle，提交后）：影子按 `seep` 逐刻用共享 SurfacePaths 沿原生地表推进（最大上台阶 0.6、
 *       下落 1 格、采样间距 0.2）；每个实际走出的短段用原生身体箱求低位交集，按前沿排序取第一只非友方就停，
 *       只结算一次。路径没有支撑、含非空流体或走满 `reach` 即结束；无人踩到就在实际末点塌回空处。
 *       表现每刻上传正在走的真实子段（阴影头 + 短尾），与判定共用同一组地面端点。
 *
 * 与同族分开：暗影拳从对手自己的影子里升起一只拳、位置在正面、从不失手；影子偷袭从地面探出第一只踩中的敌人、
 *   从背面挑一刀，更轻更快，专做开局。它不穿墙、不追空，也不拉拽或减速。
 */
namespace PokemonSkills {
    function shadowsneakArr(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 影子脚下的真实地表：复用共享原生顶面采样；找不到支撑或落在非空流体里返回 null。
     *  起点允许沿脚下向下探 3 格，让浮空的施法者也从身下的地面起影子；推进本身仍只上 0.6／下 1。 */
    function shadowsneakGround(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        const support = SurfacePaths.support(world, point, 0.6, 3);
        if (support === null) return null;
        const fluid = world.fluid(support);
        return fluid !== null && !fluid.empty() ? null : support;
    }

    /**
     * 命中后从受害者真实背侧挑起的短刃：以观察到的朝向取正背，背后是墙时退到左后／右后；
     * 刃基不进墙，刃尖沿背侧上挑面向施法者。
     */
    function shadowsneakBlade(world: CombatWorld, victim: CombatActor, body: CombatObservation, fallback: CombatPoint, blade: number): { base: CombatPoint; tip: CombatPoint; dir: CombatPoint } {
        const turn = 55 * Math.PI / 180, cos = Math.cos(turn), sin = Math.sin(turn);
        const look = WorldGeometry.facing(world, victim);
        const back = WorldGeometry.flatUnit(look === null ? WorldCombat.point(0, 0, 0) : look.scale(-1), fallback);
        const sideA = WorldCombat.point(back.x() * cos - back.z() * sin, 0, back.x() * sin + back.z() * cos);
        const sideB = WorldCombat.point(back.x() * cos + back.z() * sin, 0, -back.x() * sin + back.z() * cos);
        const at = body.position(), origin = WorldCombat.point(at.x(), body.boundsMin().y() + 0.18, at.z());
        const distance = 0.45 + blade, dirs = [back, sideA, sideB];
        let dir = back, base = origin.plus(back.scale(0.25));
        for (let i = 0; i < dirs.length; i++) {
            const candidate = origin.plus(dirs[i].scale(distance));
            if (WorldGeometry.blockHit(world, origin, candidate) === null) { dir = dirs[i]; base = candidate; break; }
        }
        const tip = base.plus(dir.scale(-(0.35 + blade * 0.4))).plus(WorldCombat.point(0, 0.55 + blade * 0.35, 0));
        return { base: base, tip: tip, dir: dir };
    }

    define({
        id: shadowsneakId,
        cooldownParameter: "recharge",
        name: "Shadow Sneak",
        description: "本人不动，一道低矮的短影贴着地面朝瞄准方向爬出去，沿真实台阶起落；第一只被影子踩中的敌人，会从背侧挨一记上挑。影子遇到断崖、实墙或水面就塌回去，只打站在地面上的那一只，不越墙也不追空。",
        uses: ["沿地面探出短影，刺中第一只挡路的敌人", "隔着近处的地形边缘先发制人（遇到实墙就停）", "对站在地面的目标从背侧下刀"],
        kind: "aim",
        range: 6.2,
        maxRange: 11.4,
        prepare: 3,
        active: 0,
        recover: 5,
        cooldown: 14,
        style: "shadow",
        defaults: { ai: { maxChase: 10, finish: true, preferBack: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(shadowsneakId, "reach", pokemon) : 6.2) + 0.4, geometry: "line", style: "shadow", color: 0x7B4FD0,
                label: "影子偷袭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[shadowsneakId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(shadowsneakId, "tempo", context)),
                recover: Math.round(p(shadowsneakId, "settle", context)),
                cooldown: Math.round(p(shadowsneakId, "recharge", context)),
                active: 0,
                range: p(shadowsneakId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("shadowsneak:pool", shadowsneakScene, 1, action.origin(),
                JSON.stringify({ moment: "pool", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const scenes = WorldFeedback.actionScenes(shadowsneakScene);
            if (self === null) { done(action); return; }

            const feet = WorldCombat.point(self.position().x(), self.boundsMin().y(), self.position().z());
            const start = shadowsneakGround(world, feet);
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const reach = Math.max(2, p(shadowsneakId, "reach", action));
            const seep = Math.max(0.4, p(shadowsneakId, "seep", action));
            const blade = Math.max(0.22, p(shadowsneakId, "blade", action));
            const shade = Math.max(10, Math.round(p(shadowsneakId, "shade", action)));
            const power = p(shadowsneakId, "sneak", action);
            const spacing = 0.2, radius = Math.max(0.2, blade * 0.75), low = 0.14;
            const scenePoint = function (point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.06, 0)); };

            function fizzle(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, shadowsneakScene, 1, at, { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.6, 0)), shadowsneakMissText, [], 20);
                scope.sound("minecraft:entity.vex.ambient", at, 10, "{}");
            }

            sound(action, "cobblemon:move.shadowball.actor");

            // 脚下没有可走的地表：影子在脚边直接塌回，不接受任何未来路径。
            if (start === null) {
                scenes.stop(action);
                fizzle(action, feet);
                scenes.finish(action, done);
                return;
            }

            const maxTicks = Math.ceil(reach / seep) + 4;
            let point = start, travelled = 0, elapsed = 0, resolved = false;
            let tail: CombatPoint[] = [start];

            function stop(current: CombatAction, at: CombatPoint): void {
                if (resolved) return;
                resolved = true;
                scenes.stop(current);
                fizzle(current, at);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (resolved) return;
                const scope = current.world();
                const distance = Math.min(seep, reach - travelled);
                // samples 按本刻推进量计算，每个 0.2 的短段都真实走一遍。
                const step = SurfacePaths.advance(scope, point, heading, distance,
                    { up: 0.6, down: 1, spacing: spacing, samples: Math.max(2, Math.ceil(distance / spacing) + 1) });
                const walked: CombatPoint[] = [point];
                let ended = step.ended;
                for (let i = 1; i < step.path.length; i++) {
                    const next = step.path[i], fluid = scope.fluid(next);
                    if (fluid !== null && !fluid.empty()) { ended = true; break; }
                    walked.push(next);
                }

                // 逐短段求低位身体交集：只取本刻真正走出的地面，命中前沿排序后的第一只非友方。
                let contact: { actor: CombatActor; point: CombatPoint } | null = null;
                for (let i = 1; i < walked.length && contact === null; i++) {
                    const a = walked[i - 1], b = walked[i];
                    const from = a.plus(WorldCombat.point(0, low, 0)), to = b.plus(WorldCombat.point(0, low, 0));
                    const found: { actor: CombatActor; point: CombatPoint; along: number }[] = [];
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(from, to, radius), function (other, facts) {
                        if (String(other.ref()) === String(actor.ref()) || scope.friendly(other)) return;
                        found.push({ actor: other, point: scope.closestPoint(other, from),
                            along: WorldGeometry.dot(facts.position().minus(a), heading) });
                    });
                    if (found.length > 0) {
                        found.sort(function (x, y) { return x.along - y.along; });
                        contact = { actor: found[0].actor, point: found[0].point };
                    }
                }

                const head = walked[walked.length - 1];
                if (contact !== null) {
                    const victim = contact.actor;
                    resolved = true;
                    scenes.stop(current);
                    const body = scope.observe(victim);
                    const landed = body !== null && hurt(current, victim, shadowsneakId, power,
                        { damage: damageSpec(shadowsneakId, "sneak"), contact: true });
                    if (landed && body !== null) {
                        const cut = shadowsneakBlade(scope, victim, body, heading, blade);
                        WorldFeedback.emit(scope, shadowsneakScene, 1, cut.base,
                            { moment: "stab", target: String(victim.ref()),
                                path: [shadowsneakArr(cut.base), shadowsneakArr(cut.tip)],
                                direction: [cut.dir.x(), cut.dir.y(), cut.dir.z()],
                                blade: Math.round(blade * 100) / 100, shade: shade,
                                power: Math.round(power * 10) / 10 }, 26);
                        scope.sound("cobblemon:impact.ghost", cut.base, 14, "{}");
                        WorldFeedback.text(scope, cut.base.plus(WorldCombat.point(0, 0.7, 0)), shadowsneakHitText, [Math.round(power)], 22);
                    } else {
                        fizzle(current, head);
                    }
                    scenes.finish(current, done);
                    return;
                }

                for (let i = 1; i < walked.length; i++) {
                    const dx = walked[i].x() - walked[i - 1].x(), dy = walked[i].y() - walked[i - 1].y(), dz = walked[i].z() - walked[i - 1].z();
                    travelled += Math.sqrt(dx * dx + dy * dy + dz * dz);
                }
                point = head;
                tail = tail.concat(walked.slice(1));
                while (tail.length > 5) tail.shift();

                // 每刻上传正在走的真实子段：阴影头在 data.point，短尾是刚走过的几个地面顶点。
                scenes.show(current, "crawl", scenePoint(head),
                    { moment: "crawl", point: shadowsneakArr(head), head: shadowsneakArr(head),
                        direction: [heading.x(), heading.y(), heading.z()],
                        path: tail.map(function (vertex) { return shadowsneakArr(scenePoint(vertex)); }),
                        shade: shade, blade: Math.round(blade * 100) / 100,
                        scale: Math.max(0.6, Math.min(1.8, blade / 0.38)),
                        intensity: Math.max(0.5, Math.min(1.8, power / 40)) });

                elapsed++;
                if (ended || travelled >= reach - 0.01 || elapsed >= maxTicks) { stop(current, head); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            advance(action);
        }
    });
}
