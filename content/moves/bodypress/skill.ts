/**
 * 扑击 / bodypress 的出手方式。
 *
 * 核心念头：压低重心、架住肩甲站定，朝正前方**短踏**一步；身体前方那道**宽肩横边**随这一步真实扫过，
 * 把挡在身前的活体一起压退。它不再顶住某一个人连续研磨：一趟里最多压到 3 个实际触体，主伤与总推距在
 * 这些触体之间均分——压到的人越多，每人分到的越少。这是全组唯一的「正面宽面压缩」。
 *
 * 两幕：
 *   起（windup，提交前）：压低重心、肩甲前置，只播预告。
 *   压（press，提交后）：逐步把身板推出去，每一步只判当前那一段真实的肩面横边（判定与画面共用同一组端点），
 *     把被这道面扫到的非友方收进触体表；身板撞墙或被挡就立即收势。收势时按触体表（最近 3 个）均分 `drive` 伤害与
 *     `shove` 推距：每个触体各挨一记接触伤害，位移走原生 `hitDisplace`——抗击退的目标照样受伤但不一定被推开。
 *
 * 与同族分开：角撞保留「锁住单体一路顶走」；扑击改成短踏宽面压缩，用来在队友近旁的狭口把挤上来的敌人压退。
 *
 * 选取 aim：可点方向或实体，也可空放；瞄准方向被压平成水平朝向。正面判定会被第一道墙裁短，侧后方不在面内。
 * 提交后才触碰世界；配置 wide 由 resolve／execute 读取，改变覆盖而不改变总输出。
 */
namespace PokemonSkills {
    const bodypressScene = "world_combat:move_bodypress";
    const bodypressHitText = "world_combat.move.bodypress.text.hit";
    const bodypressMissText = "world_combat.move.bodypress.text.miss";
    /** 一趟最多压到几个实际触体；总预算不随人数加总，只在触体间均分。 */
    const bodypressMaxTargets = 3;

    /** 面角点：以中点为基准，沿右向偏移 side、沿前向偏移 fore。 */
    function bodypressCorner(centre: CombatPoint, right: CombatPoint, forward: CombatPoint, side: number, fore: number): CombatPoint {
        return centre.plus(right.scale(side)).plus(forward.scale(fore));
    }
    function bodypressCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
    /** 沿推进方向的投影距离，用来把触体按远近排序。 */
    function bodypressOrder(point: CombatPoint, start: CombatPoint, forward: CombatPoint): number {
        return point.minus(start).x() * forward.x() + point.minus(start).y() * forward.y() + point.minus(start).z() * forward.z();
    }

    define({
        freeMovement: true,
        id: "bodypress",
        name: "Body Press",
        description: "压低重心架住肩甲，朝正前方短踏一步，用身体前方的宽肩横边把挡路者一起压退：一趟最多压到 3 个实际触体，伤害与推距在这些触体之间均分。可以只选方向朝空处压。防御越高，这一下越重、压得越远；抗击退的目标照样受伤但不一定被推开。",
        uses: ["在狭窄处把挤上来的多个对手一起压退", "用护甲与体重守住一段正面", "在守势里反推一波"],
        kind: "aim",
        range: 1.6,
        maxRange: 2.2,
        prepare: 10,
        active: 24,
        recover: 10,
        cooldown: 46,
        style: "contact",
        defaults: { wide: true, ai: { maxChase: 8, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext | null = pokemon ? { pokemon: pokemon, skill: skills["bodypress"], detail: { values: config } } : null;
            const lunge = context ? p("bodypress", "lunge", context) : 3.0;
            const face = context ? p("bodypress", "collisionRadius", context) : 0.5;
            return { radius: Math.min(1.2, lunge / 3) + face + 0.3, geometry: "line", style: "contact", color: 0xE9B071,
                label: config && config.wide === false ? "扑击·窄面" : "扑击·宽面" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["bodypress"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const lunge = p("bodypress", "lunge", context), face = p("bodypress", "collisionRadius", context);
            // 接受距离略小于肩面实际够得到的距离，AI 会先贴身再压。
            return {
                prepare: Math.max(1, Math.round(p("bodypress", "brace", context))),
                recover: p("bodypress", "recover", context),
                cooldown: p("bodypress", "cooldown", context),
                active: skills["bodypress"].active,
                range: Math.max(1.1, Math.min(1.2, lunge / 3) + face - 0.3)
            };
        },
        windup: function (action, config, prepare) {
            const wide = !(config && config.wide === false);
            action.present("world_combat:move_bodypress:windup", bodypressScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", wide: wide }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(bodypressScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const wide = !(config && config.wide === false);
            const forward = WorldGeometry.flatUnit(aim(action), action.direction());
            const right = WorldGeometry.basis(forward).right;
            const lunge = p("bodypress", "lunge", action);
            const speed = Math.max(0.05, p("bodypress", "advanceSpeed", action));
            const depth = Math.max(0.2, p("bodypress", "collisionRadius", action));
            const facePad = Math.max(0, p("bodypress", "facePad", action));
            const power = p("bodypress", "drive", action);
            const shove = Math.max(0, p("bodypress", "shove", action));
            const minimum = Math.max(0.001, p("bodypress", "minimumMove", action));
            const halfWidth = self.width() / 2 + (wide ? facePad : 0);
            const lowY = self.boundsMin().y() - 0.1, highY = self.boundsMax().y() + 0.1;
            const start = self.position();
            const budget = Math.min(1.2, lunge / 3);
            const scale = Math.max(0.6, Math.min(1.8, halfWidth / 0.5));
            const intensity = Math.max(0.5, Math.min(2.2, power / 100));
            const clods = Math.max(6, Math.round(shove * 8));
            const found: { ref: string; victim: CombatActor; at: CombatPoint; order: number }[] = [];
            const seen: { [ref: string]: boolean } = {};
            let step = budget, settled = false;

            /** 宽面首墙裁切：在面宽两端与中心各打一条真实方块射线，取最近墙把整段推进裁短。 */
            function clippedStep(scope: CombatWorld, origin: CombatPoint): number {
                let reach = budget;
                for (let i = -1; i <= 1; i++) {
                    const probe = origin.plus(right.scale(halfWidth * i)), to = probe.plus(forward.scale(budget));
                    const wall = WorldGeometry.blockHit(scope, probe, to);
                    if (wall !== null) {
                        const distance = wall.position().minus(probe).length();
                        if (distance < reach) reach = Math.max(0, distance);
                    }
                }
                return reach;
            }

            /** 收集这一段真实肩面扫到的非友方；判定用与画面同一组端点张成的矩形棱柱（真实实体箱求交）。 */
            function collect(scope: CombatWorld, from: CombatPoint, to: CombatPoint): void {
                const span = to.minus(from).length();
                const region = WorldGeometry.bodyLane(from.minus(forward.scale(depth)), forward, span + depth * 2, halfWidth,
                    { below: Math.max(0.2, from.y() - lowY), above: Math.max(0.2, highY - from.y()) });
                WorldGeometry.selectBodies(scope, region, function (victim, facts) {
                    const ref = String(victim.ref());
                    if (ref === String(actor.ref()) || scope.friendly(victim) || seen[ref]) return;
                    // 墙挡住的面盖不到墙后的人。
                    if (WorldGeometry.blockHit(scope, from, scope.closestPoint(victim, from)) !== null) return;
                    seen[ref] = true;
                    found.push({ ref: ref, victim: victim, at: facts.position(), order: bodypressOrder(facts.position(), start, forward) });
                });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                found.sort(function (a, b) { return a.order - b.order; });
                const hits = Math.min(bodypressMaxTargets, found.length);
                const per = hits > 0 ? power / hits : 0, perShove = hits > 0 ? shove / hits : 0;
                let landed = 0;
                for (let i = 0; i < hits; i++) {
                    const entry = found[i];
                    if (!scope.valid(entry.victim)) continue;
                    if (!hurt(current, entry.victim, "bodypress", per, { damage: damageSpec("bodypress", "drive"), contact: true })) continue;
                    landed++;
                    const moved = scope.hitDisplace(entry.victim, forward.scale(perShove));
                    const body = scope.observe(entry.victim);
                    WorldFeedback.emit(scope, bodypressScene, 1, body === null ? entry.at : body.position(),
                        { moment: "impact", target: entry.ref, hits: hits, moved: Math.round(moved * 100) / 100,
                            clods: Math.max(4, Math.round(clods / hits)), scale: scale, intensity: intensity }, 24);
                }
                const body = scope.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(scope, bodypressScene, 1, body.position(),
                        { moment: landed > 0 ? "settle" : "miss", hits: hits, clods: clods, scale: scale, intensity: intensity }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        landed > 0 ? bodypressHitText : bodypressMissText, [], 22);
                }
                sound(current, landed > 0 ? "cobblemon:impact.fighting" : "minecraft:entity.ravager.attack");
                scenes.finish(current, done);
            }

            function press(current: CombatAction, remaining: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null || remaining <= 0.02) { finish(current); return; }
                const leg = Math.min(speed, remaining);
                const from = body.position();
                const moved = scope.displace(actor, forward.scale(leg));
                const after = scope.observe(actor);
                const to = after === null ? from : after.position();
                if (moved >= minimum) {
                    collect(scope, from, to);
                    scenes.show(current, "press", to, { moment: "press",
                        path: [bodypressCoords(bodypressCorner(from, right, forward, -halfWidth, 0)),
                            bodypressCoords(bodypressCorner(from, right, forward, halfWidth, 0)),
                            bodypressCoords(bodypressCorner(to, right, forward, halfWidth, 0)),
                            bodypressCoords(bodypressCorner(to, right, forward, -halfWidth, 0))],
                        direction: [forward.x(), forward.y(), forward.z()], hits: found.length,
                        clods: clods, scale: scale, intensity: intensity });
                }
                if (moved < minimum || remaining - leg <= 0.02) { finish(current); return; }
                current.after(1, function (next: CombatAction) { press(next, remaining - leg); });
            }

            step = clippedStep(world, start);
            sound(action, "minecraft:entity.ravager.step");
            if (step <= minimum) { finish(action); return; }
            // 起手先判贴上身前的一小段，再逐步推进。
            collect(world, start, start.plus(forward.scale(Math.min(step, depth))));
            press(action, step);
        }
    });
}
