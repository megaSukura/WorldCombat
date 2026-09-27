/**
 * 地裂 / fissure 的出手方式。
 *
 * 核心念头：从远处把一个落点锁在对手脚下的真实地面上，一道裂缝沿连续的地表窜过去、在那里张开口；
 *   踩住那个落点、还贴在地上的最近一人被一记重创。它隔得远、打得准，但只认站在真实支撑面上的目标。
 *
 * 两幕：
 *   起（windup，提交前）：蹲身、脚下起屑，只播预告，可被打断。
 *   裂（mark → break / miss，提交后）：以施法者与落点的真实脚面各取一处原生支撑顶面，沿连续地表
 *       （共享 SurfacePaths 的顶面采样与抬升/跨步/落步走廊）把裂缝一段段推进到落点；断口、高墙或另一
 *       楼层会让路线不成立。预告刚好在 `mark` 刻结束，随即在落点结算：只取圈内最近、底面仍贴住那层
 *       地面的一个受体，按本招的固定伤害预算结算。之后沿同一组真实地表顶点留下一道会散去的短裂纹——
 *       不替换任何方块，也不留下持续危险。
 *
 * 反制：走开落点、跳起来（离地免疫），或换成属性上吃不到地面系的目标；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    /** 把真实地表顶点转成客户端路径用的世界点数组。 */
    function fissureVectors(points: CombatPoint[]): number[][] {
        const out: number[][] = [];
        for (let i = 0; i < points.length; i++) out.push([points[i].x(), points[i].y() + 0.06, points[i].z()]);
        return out;
    }
    /** 取路径按进度 `fraction` 截断后的前缀，让裂缝看起来沿真实路线推进。 */
    function fissureClip(path: CombatPoint[], fraction: number): CombatPoint[] {
        if (path.length <= 1 || fraction >= 1) return path;
        const last = path.length - 1, index = Math.max(1, Math.min(last, Math.ceil(last * fraction)));
        return path.slice(0, index + 1);
    }
    function fissureDirection(start: CombatPoint, landing: CombatPoint): number[] {
        const dx = landing.x() - start.x(), dy = landing.y() - start.y(), dz = landing.z() - start.z();
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return length > 1e-6 ? [dx / length, dy / length, dz / length] : [0, 1, 0];
    }

    define({
        requiresGround: true,
        id: fissureId,
        cooldownParameter: "recharge",
        name: "Fissure",
        description: "从远处把落点锁在对手脚下的真实地面，一道裂缝沿连续地表窜过去、在那里张开口；站进落点、还贴住那层地面的最近一人被一记重创。裂缝只走有真实支撑的连续地面，断崖、高墙或另一楼层都连不过去；张口前的预告就是对手走开的窗口。它不再是一击必杀，留下的也只是会散去的短裂纹。",
        uses: ["从远处点掉一个站在地上的高价值目标", "逼对手离开脚下的位置或跳起来", "在地面留下一道会散去的短裂纹"],
        kind: "aim",
        range: 7,
        maxRange: 11,
        prepare: 16,
        active: 0,
        recover: 10,
        cooldown: 96,
        style: "quake",
        defaults: { deep: false, ai: { maxChase: 10 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[fissureId], detail: { values: config } };
            return { radius: pokemon ? p(fissureId, "sink", context) : fissureReference, geometry: "area", style: "quake",
                color: 0x8D6E3A, label: config && config.deep === true ? "地裂·深裂" : "地裂·速裂" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[fissureId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(fissureId, "tempo", context)),
                recover: Math.round(p(fissureId, "aftercast", context)),
                cooldown: Math.round(p(fissureId, "recharge", context)),
                active: 0,
                range: p(fissureId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (!body.grounded()) return "target-airborne";
            if (body.position().minus(action.origin()).length() > action.range() + 0.5) return "out-of-range";
            const actorBody = world.observe(action.actor());
            if (actorBody === null || !actorBody.grounded()) return "caster-airborne";
            const casterFeet = WorldCombat.point(actorBody.position().x(), actorBody.boundsMin().y(), actorBody.position().z());
            const targetFeet = WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
            if (fissureRoute(world, casterFeet, targetFeet, action.range()) === null) return "no-ground-route";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fissure:windup", fissureScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(fissureScene, 1);
            const world = action.world(), actor = action.actor(), target = action.target();
            const origin = action.origin();
            const actorBody = world.observe(actor);
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const rawAt = targetBody !== null ? targetBody.position() : action.targetPosition();
            const reach = Math.max(4, p(fissureId, "reach", action));
            const sink = Math.max(1.2, p(fissureId, "sink", action));
            const mark = Math.max(8, Math.round(p(fissureId, "mark", action)));
            const spall = Math.max(8, Math.round(p(fissureId, "spall", action)));
            const rentTicks = Math.max(30, Math.round(p(fissureId, "rentTicks", action)));
            const damage = p(fissureId, "tremor", action);
            const scale = sink / fissureReference;
            const targetRef = target === null ? "" : String(target.ref());
            const actorRef = String(actor.ref());
            // 施术者与落点都取真实脚面下的原生支撑顶面；连不上就只在落点画预告，不假装成裂。
            const casterFeet = actorBody !== null
                ? WorldCombat.point(actorBody.position().x(), actorBody.boundsMin().y(), actorBody.position().z())
                : origin;
            const aimFeet = targetBody !== null
                ? WorldCombat.point(rawAt.x(), targetBody.boundsMin().y(), rawAt.z())
                : rawAt;
            const route = fissureRoute(world, casterFeet, aimFeet, reach);
            const at = route !== null ? route.landing : rawAt;
            const path = route !== null ? route.path : [];
            const span = route !== null ? route.landing.minus(route.start).length() : at.minus(origin).length();
            const direction = route !== null ? fissureDirection(route.start, at) : [0, 1, 0];
            let step = 0, settled = false;

            sound(action, "minecraft:block.deepslate.break");
            action.releaseTarget();

            function fire(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 预告刚好在 mark 刻结束；随动作取消立即收回。
                scenes.stop(current);
                let victim: CombatActor | null = null, nearest = Infinity, airborne = false;
                if (route !== null) {
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodySector(at, WorldCombat.point(0, 0, 1), sink, 360, { below: .6, above: 2.6 }), function (enemy, facts) {
                        if (String(enemy.ref()) === actorRef || facts.friendly()) return;
                        if (!facts.grounded()) { airborne = true; return; }
                        // 只认底面仍贴住落点那层地面的受体。
                        if (Math.abs(facts.boundsMin().y() - at.y()) > 0.6) return;
                        const foot = WorldCombat.point(facts.position().x(), facts.boundsMin().y(), facts.position().z());
                        const contact = scope.closestPoint(enemy, at);
                        if (WorldGeometry.blockHit(scope, at.plus(WorldCombat.point(0, .1, 0)), contact.plus(WorldCombat.point(0, .1, 0)))) return;
                        const distance = WorldCombat.point(contact.x(), foot.y(), contact.z()).minus(at).length();
                        if (distance < nearest) { victim = enemy; nearest = distance; }
                    });
                }
                const result = victim === null ? "miss" : fissureExecute(current, victim, damage);
                if (result === "source-left") return;
                WorldFeedback.emit(scope, fissureScene, 1, at,
                    result === "hit"
                        ? { moment: "break", target: victim === null ? "" : String((victim as CombatActor).ref()), radius: sink, spall: spall, scale: scale }
                        : { moment: "miss", radius: sink, scale: scale }, result === "hit" ? 30 : 22);
                if (result === "hit") {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), fissureBreakText, [Math.round(damage)], 28);
                    scope.sound("cobblemon:impact.ground", at, 16, "{}");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)),
                        result === "blocked" ? fissureBlockedText : airborne ? fissureAirText : fissureMissText, [], 22);
                    scope.sound("minecraft:block.gravel.break", at, 12, "{}");
                }
                // 收：沿同一组真实地表顶点留下一道会散去的短裂纹，不替换任何方块。
                const vectors = fissureVectors(path);
                if (vectors.length >= 2)
                    WorldFeedback.emit(scope, fissureScene, 1, at, { moment: "rent", path: vectors, radius: sink, spall: spall, scale: scale, ticks: rentTicks }, rentTicks);
                done(current);
            }

            function warn(current: CombatAction): void {
                step++;
                // 裂缝随真实连通路线推进；预告与结算共用同一组真实顶点，路径为空时不画假线。
                scenes.show(current, "mark", at, {
                    moment: "mark", target: targetRef, path: fissureVectors(fissureClip(path, step / mark)),
                    direction: direction, span: span, radius: sink, spall: spall, scale: scale, mark: mark, step: step
                });
                if (step >= mark) { fire(current); return; }
                current.after(1, warn);
            }
            warn(action);
        }
    });
}
