/**
 * 摔打 / slam 的出手方式。
 *
 * 核心念头：**把长肢高高扬起，朝选定的落点沿地面犁出一道窄长落痕**——扬起的那一瞬落点就定死，
 * 之后长肢从高处的肢端一路砸到那个点；条带贴着真实地面起伏，遇到墙或断崖就截断，不会隔着虚空犁过去。
 * 条带里的非友方各挨一记全族最重的接触伤害、被震开一段；在落下前挪出条带的人就只看着它砸空。
 * 原生 75 命中在这里是**一个看得见的躲避窗口**（`fallTicks`）：站住不动就吃满，横走挪开就走掉。
 * 条带是窄长的，所以特别适合吃一字排开或堵在窄道里的目标。
 *
 * 三幕：
 *   起（windup，提交前）：长肢高举过头、脚下扬尘的预告；由 `world_combat:move_slam_arc` 画出真实肢身。
 *   标记／落（mark + swing）：提交后落点定在瞄准处，地面亮出会缩的窄长条带（`fallTicks` 刻，就是躲避窗口）；
 *       同一段时间里 `world_combat:move_slam_arc` 每刻上传真实肢端位置与已犁过的地面段，判定与表现共用这组端点。
 *   砸（land）：落下时按同一组地面条带做真实实体箱碰撞，条带内的非友方各结算一记 impact 接触伤害、被震开
 *       `shockPush` 格；条带里没人则只是砸出一地尘土（whiff），仍然留下痕印一样的尘。
 *
 * 取材 `kind: "aim"`：可指任意阵营实体、方向或地面点，也能对空地扬起；没有实体时照样砸下留痕，方块不变形。
 *
 * 与同族分开：拍击瞬发而便宜、扇面一扫；摔打慢、重、落痕先画出来，是一道窄长条带、专吃一字排开的目标。
 * 配置 `heavy`（沉砸式）由 resolve 改时序、由公式改威力／落痕宽度／震距与砸落时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const slamScene = "world_combat:move_slam";
    const slamArcScene = "world_combat:move_slam_arc";
    const slamHitText = "world_combat.move.slam.text.hit";
    const slamMissText = "world_combat.move.slam.text.miss";

    interface SlamStrip {
        outline: CombatPoint[];
        outlinePath: number[][];
        centre: number[][];
        start: CombatPoint;
        far: CombatPoint;
        minY: number;
        maxY: number;
    }

    /**
     * 沿瞄准方向按真实支撑取样，得到一条贴着地面的落痕。取样点先看地面支撑（`SurfacePaths.support`）：
     * 没有支撑（断崖、悬空）或相邻落差过大就截断，横向撞到真实方块（`WorldGeometry.blockHit`）也截断。
     * 判定（实体箱多边形）与表现（同一组顶点）共用这条条带。
     */
    function slamStrip(world: CombatWorld, origin: CombatPoint, height: number, heading: CombatPoint, front: number, far: number, half: number): SlamStrip {
        const feet = origin.y() - height / 2;
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const samples: CombatPoint[] = [];
        const span = far - front, steps = Math.max(1, Math.ceil(span / 0.5));
        for (let i = 0; i <= steps; i++) {
            const distance = front + span * (i / steps);
            const ask = WorldCombat.point(origin.x() + heading.x() * distance, feet, origin.z() + heading.z() * distance);
            const support = SurfacePaths.support(world, ask, 0.8, 2.5);
            if (support === null) break;
            if (samples.length > 0) {
                const last = samples[samples.length - 1];
                if (Math.abs(support.y() - last.y()) > 1.25) break;
                if (WorldGeometry.blockHit(world, last.plus(WorldCombat.point(0, 0.5, 0)), support.plus(WorldCombat.point(0, 0.5, 0))) !== null) break;
            }
            samples.push(support);
        }
        if (samples.length === 0)
            samples.push(WorldCombat.point(origin.x() + heading.x() * front, feet, origin.z() + heading.z() * front));
        if (samples.length === 1) samples.push(samples[0].plus(heading.scale(0.4)));
        const left: CombatPoint[] = [], right: CombatPoint[] = [], centre: number[][] = [];
        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < samples.length; i++) {
            const point = samples[i];
            minY = Math.min(minY, point.y()); maxY = Math.max(maxY, point.y());
            centre.push([point.x(), point.y(), point.z()]);
            left.push(WorldCombat.point(point.x() + side.x() * half, point.y(), point.z() + side.z() * half));
            right.push(WorldCombat.point(point.x() - side.x() * half, point.y(), point.z() - side.z() * half));
        }
        right.reverse();
        const outline = left.concat(right);
        return { outline: outline, outlinePath: outline.map(function (point) { return [point.x(), point.y(), point.z()]; }),
            centre: centre, start: samples[0], far: samples[samples.length - 1], minY: minY, maxY: maxY };
    }

    define({
        id: "slam",
        cooldownParameter: "recharge",
        name: "Slam",
        description: "把长尾、长身或藤蔓高高扬起，朝选定方向沿地面犁出一道窄长落痕。落痕贴着地面起伏，遇到墙或断崖就截断，不会隔着虚空犁过去。扬起的瞬间落痕就定死了——那道条带会在地面亮出来，站在上面就吃满，在落下前横走挪开就能躲掉。它是全族最高的单发，也是最慢、最容易落空的一记；条带很窄，专吃一字排开或堵在窄道里的目标。",
        uses: ["对站桩或刚被定住的目标砸下全族最重的一记", "沿窄道或前后排成一线的敌人犁出一道落痕", "预判落痕把堵在门口的目标震开"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.2,
        prepare: 11,
        active: 16,
        recover: 12,
        cooldown: 46,
        style: "slam",
        defaults: { heavy: false, ai: { maxChase: 5, preferStill: true, preferLine: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("slam", "reach", pokemon) + 0.3, geometry: "line", style: "slam", color: 0xC7A97B,
                label: config && config.heavy === true ? "沉砸式" : "疾砸式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["slam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("slam", "tempo", context)),
                recover: Math.round(p("slam", "aftercast", context)),
                cooldown: Math.round(p("slam", "recharge", context)),
                active: skills["slam"].active,
                range: p("slam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const heavy = config && config.heavy === true;
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_slam:raise", slamScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: heavy ? 1 : 0, windup: prepare }));
            action.present("world_combat:move_slam_arc:raise", slamArcScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", start: action.sense().tick(), windup: prepare, heavy: heavy ? 1 : 0,
                    height: body === null ? 1.4 : body.height(), direction: [direction.x(), direction.y(), direction.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const aimPoint = action.targetPosition();
            action.releaseTarget();

            const height = body === null ? 1.4 : body.height();
            const reach = Math.max(1.6, p("slam", "reach", action));
            const width = Math.max(0.5, p("slam", "width", action));
            const half = width / 2;
            const power = p("slam", "impact", action);
            const dust = Math.max(10, Math.round(p("slam", "dust", action)));
            const fall = Math.max(4, Math.round(p("slam", "fallTicks", action)));
            const scale = Math.max(0.6, Math.min(2.2, width / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const heavy = config && config.heavy === true;

            // 锁定条带：优先朝瞄点；瞄点与脚下重合（只给了方向）时退回当前朝向、铺满整段 reach。
            let delta = aimPoint.minus(origin);
            let flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 0.05 ? WorldGeometry.flatUnit(action.direction()) : flat.unit();
            if (flat.length() < 0.05) flat = heading.scale(reach);
            const limbFront = Math.max(0.35, Math.min(1.2, width));
            const farDistance = Math.min(reach, Math.max(limbFront + 0.7, flat.length()));
            const strip = slamStrip(world, origin, height, heading, limbFront, farDistance, half);
            const centreline = strip.centre;
            // 长肢端点：从施法者后上方起，落到条带最远端的地面；与条带共用同一组真实端点。
            const high = WorldCombat.point(origin.x() - heading.x() * limbFront * 0.5,
                Math.max(strip.maxY + 1.8, origin.y() + height * 0.6), origin.z() - heading.z() * limbFront * 0.5);
            const marks = WorldFeedback.actionScenes(slamScene);
            const arc = WorldFeedback.actionScenes(slamArcScene);
            let elapsed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            marks.show(action, "mark", strip.start,
                { moment: "mark", path: strip.outlinePath, length: farDistance - limbFront, width: width, fall: fall, scale: scale, intensity: intensity });
            sound(action, "minecraft:entity.player.attack.strong");

            function swing(current: CombatAction): void {
                if (settled) return;
                const t = Math.max(0, Math.min(1, elapsed / fall)), ease = t * t;
                const tip = WorldCombat.point(high.x() + (strip.far.x() - high.x()) * ease,
                    high.y() + (strip.far.y() - high.y()) * ease, high.z() + (strip.far.z() - high.z()) * ease);
                const upto = Math.min(centreline.length, Math.max(1, Math.ceil(ease * (centreline.length - 1)) + 1));
                arc.show(current, "swing", strip.start,
                    { moment: "swing", from: [high.x(), high.y(), high.z()], tip: [tip.x(), tip.y(), tip.z()],
                        path: centreline.slice(0, upto), direction: [heading.x(), heading.y(), heading.z()],
                        progress: t, width: width, scale: scale, intensity: intensity, heavy: heavy ? 1 : 0 });
                elapsed++;
                if (elapsed >= fall) { land(current); return; }
                current.after(1, function (next: CombatAction) { swing(next); });
            }

            function land(current: CombatAction): void {
                const scope = current.world();
                arc.stop(current, "swing");
                marks.stop(current, "mark");
                const struck: string[] = [];
                // 判定与表现共用这条地面条带：按真实实体箱碰撞，只挑条带内、通视的非友方。
                const region = WorldGeometry.bodyPolygon(strip.outline, strip.minY - 1.0, strip.maxY + 2.4);
                WorldGeometry.selectBodies(scope, region, function (victim, facts) {
                    if (facts.friendly() || String(victim.ref()) === String(actor.ref())) return;
                    const position = facts.position();
                    const nearest = WorldGeometry.closestOnSegment(position, strip.start, strip.far);
                    if (!scope.clear(nearest, position)) return;
                    if (!hurt(current, victim, "slam", power, { damage: damageSpec("slam", "impact"), contact: true })) return;
                    struck.push(String(victim.ref()));
                    const flatAway = WorldCombat.point(position.x() - nearest.x(), 0, position.z() - nearest.z());
                    const direction = flatAway.length() < 0.05 ? heading : flatAway.unit();
                    const push = Math.max(0.15, p("slam", "shockPush", withTarget(factContext(current), victim)));
                    if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
                    WorldFeedback.emit(scope, slamScene, 1, position,
                        { moment: "hit", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 22);
                });
                WorldFeedback.emit(scope, slamScene, 1, strip.far,
                    { moment: "impact", path: strip.outlinePath, length: farDistance - limbFront, width: width, dust: dust, hits: struck.length, scale: scale, intensity: intensity }, 30);
                sound(current, "cobblemon:impact.ground");
                if (struck.length === 0) {
                    WorldFeedback.emit(scope, slamScene, 1, strip.far, { moment: "whiff", path: strip.outlinePath, width: width, scale: scale }, 18);
                    WorldFeedback.text(scope, strip.far.plus(WorldCombat.point(0, 1.0, 0)), slamMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, strip.far.plus(WorldCombat.point(0, 1.4, 0)), slamHitText, [struck.length], 24);
                }
                finish(current);
            }

            swing(action);
        }
    });
}
