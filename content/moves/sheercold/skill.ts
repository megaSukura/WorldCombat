/**
 * 绝对零度 / sheercold 的出手方式。
 *
 * 核心念头：把目标所在的那一小片空气骤然压低到绝对零度——一圈寒霜向四周铺开，圈内最近的最多四个人被冻伤，
 *   地上结起一层留一会儿、但不造成伤害的霜光。它是这一族里唯一作用于一块三维冷域、能同时打到多个的一记，
 *   也是唯一「谁用」会影响出手快慢的一记：冰属性使用者结霜快得多。
 *
 * 两幕：
 *   起（windup，提交前）：施法者身上凝起白霜、脚下寒气打转，只播预告，可被打断。
 *   冻（mark → bloom / miss，提交后）：把目标脚下的真实支撑面锁成圈心，边缘凝霜随预告收紧；`mark` 刻整圈
 *       结霜，按真实三维冷域（原生实体箱相交）取最近的受体，墙或楼层挡在圈心与受体之间就不计；每个非冰
 *       目标结算一笔施术者预算内的固定世界生命伤害，最多四个、合计不超过 400。随后只留下低亮残霜，不改变方块。
 *
 * 反制：走出那一圈、或本身就是冰属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    /** 锁定落点：优先取目标真实脚面下的原生支撑顶面，点输入则从其位置向下探。 */
    function sheercoldCentre(world: CombatWorld, body: CombatObservation | null, raw: CombatPoint): CombatPoint {
        const feet = body !== null
            ? WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z())
            : raw;
        return SurfacePaths.support(world, feet, body !== null ? 1.0 : 1.5, body !== null ? 1.5 : 3.0) || raw;
    }

    define({
        id: sheercoldId,
        cooldownParameter: "recharge",
        name: "Sheer Cold",
        description: "把目标脚下的那片空气骤然压到绝对零度：一圈寒霜向四周铺开，圈内最近的最多四个非冰目标各被冻伤；地上留下一片短暂霜光。它是这一族里唯一能同时打到多个的一记，也是唯一「谁用」会影响出手快慢的一记——冰属性使用者结霜快得多。它不再是一击必杀，命中的是一笔有限的固定伤害。",
        uses: ["一次冻伤目标周围一圈里的多个对手", "冰属性使用者用它抢出更短的出手窗口", "在地面留下一片不造成伤害的短期寒霜标出冻区"],
        kind: "aim",
        range: 2.6,
        maxRange: 5.2,
        prepare: 16,
        active: 0,
        recover: 12,
        cooldown: 95,
        style: "frost",
        defaults: { glacial: false, ai: { maxChase: 8, minFoes: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sheercoldId], detail: { values: config } };
            return { radius: pokemon ? p(sheercoldId, "radius", context) : sheercoldReference, geometry: "circle", style: "frost",
                color: 0x7FD8E8, label: config && config.glacial === true ? "绝对零度·冰河" : "绝对零度·急冻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sheercoldId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(sheercoldId, "tempo", context)),
                recover: Math.round(p(sheercoldId, "aftercast", context)),
                cooldown: Math.round(p(sheercoldId, "recharge", context)),
                active: 0,
                range: p(sheercoldId, "radius", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.5) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sheercold:windup", sheercoldScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", glacial: config && config.glacial === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scene = WorldFeedback.actionScenes(sheercoldScene, 1);
            const world = action.world(), actor = action.actor(), target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const rawAt = targetBody !== null ? targetBody.position() : action.targetPosition();
            const radius = Math.max(2.0, p(sheercoldId, "radius", action));
            const mark = Math.max(8, Math.round(p(sheercoldId, "mark", action)));
            const hush = Math.max(10, Math.round(p(sheercoldId, "hush", action)));
            const ticks = Math.max(80, Math.round(p(sheercoldId, "frostTicks", action)));
            const cells = Math.max(16, Math.round(p(sheercoldId, "frostCells", action)));
            const damage = p(sheercoldId, "frost", action);
            const scale = radius / sheercoldReference;
            const targetRef = target === null ? "" : String(target.ref());
            const actorRef = String(actor.ref());
            const centre = sheercoldCentre(world, targetBody, rawAt);
            let step = 0, settled = false;

            sound(action, "minecraft:block.amethyst_block.resonate");
            action.releaseTarget();

            function freeze(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 预告刚好在 mark 刻结束；随动作取消立即收回。
                scene.stop(current);
                current.present("sheercold:volume", "world_combat:move_sheercold/volume", 1, centre,
                    JSON.stringify({ lifecycle: { reason: "settled", tick: scope.tick() } }));
                const found: { victim: CombatActor; at: CombatPoint; distance: number }[] = [];
                let hits = 0, immune = 0, spent = 0;
                // 真实三维冷域：原生实体箱与以落点为心的球体相交；圈心被墙/楼层挡住的受体不计。
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySphere(centre, radius), function (enemy, facts) {
                    if (facts.friendly()) return;
                    if (String(enemy.ref()) === actorRef) return;
                    if (WorldGeometry.blockHit(scope, centre.plus(WorldCombat.point(0, 0.15, 0)), facts.position()) !== null) return;
                    if (PokemonDamage.combatants.read(scope, enemy).types.indexOf("ice") >= 0) { immune++; return; }
                    found.push({ victim: enemy, at: facts.position(), distance: scope.closestPoint(enemy, centre).minus(centre).length() });
                });
                found.sort(function (a, b) { return a.distance - b.distance; });
                for (let index = 0; index < Math.min(found.length, sheercoldVictimCap) && spent < sheercoldDamageCap; index++) {
                    const victim = found[index].victim;
                    spent += damage;
                    const result = sheercoldExecute(current, victim, damage);
                    if (result === "source-left") return;
                    if (result === "hit") {
                        hits++;
                        WorldFeedback.emit(scope, sheercoldScene, 1, found[index].at,
                            { moment: "hit", target: String(victim.ref()), hush: hush, scale: scale }, 22);
                    } else if (result === "immune") immune++;
                }
                WorldFeedback.emit(scope, sheercoldScene, 1, centre, { moment: "rime", radius: radius, cells: cells, ticks: ticks }, ticks);
                WorldFeedback.emit(scope, sheercoldScene, 1, centre,
                    { moment: "bloom", radius: radius, hush: hush, hits: hits, immune: immune, scale: scale }, 34);
                if (hits > 0) {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.1, 0)), sheercoldHitText, [hits], 28);
                    scope.sound("cobblemon:impact.ice", centre, 16, "{}");
                } else {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 0.9, 0)), immune > 0 ? sheercoldIceText : sheercoldMissText, [], 24);
                    scope.sound("minecraft:block.glass.break", centre, 10, "{}");
                }
                done(current);
            }

            function warn(current: CombatAction): void {
                step++;
                const t = Math.min(1, step / mark);
                current.present("sheercold:volume", "world_combat:move_sheercold/volume", 1, centre, JSON.stringify({ radius }));
                // 边缘凝霜随倒计时收紧；预告与结霜共用同一个落点。
                scene.show(current, "mark", centre, { moment: "mark", target: targetRef, radius: radius,
                    ring: Math.max(radius * 0.4, radius * (1 - 0.35 * t)), hush: hush, scale: scale, progress: t, mark: mark });
                if (step >= mark) { freeze(current); return; }
                current.after(1, warn);
            }
            warn(action);
        }
    });
}
