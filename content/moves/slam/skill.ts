/**
 * 摔打 / slam 的出手方式。
 *
 * 核心念头：**把长肢高高扬起，朝选定的落点沿地面犁出一道窄长落痕**——扬起的那一瞬落点就定死，
 * 之后长肢从肢体前端一路砸到那个点，条带里的非友方各挨一记全族最重的接触伤害、被震开一段；
 * 在落下前挪出条带的人就只看着它砸空。原生 75 命中在这里是**一个看得见的躲避窗口**（`fallTicks`）：
 * 站住不动就吃满，横走挪开就走掉。条带是窄长的，所以特别适合吃一字排开或堵在窄道里的目标。
 *
 * 三幕：
 *   起（windup，提交前）：长肢高举过头、脚下扬尘的预告。
 *   标记（mark）：提交后落点定在瞄准处，地面亮出一道会缩的窄长条带，持续 `fallTicks` 刻——这就是可以躲开的窗口。
 *   砸（land）：落下时条带内的非友方各结算一记 impact 接触伤害、被背离落痕震开 `shockPush` 格；条带里没人则只是
 *       砸出一地尘土（whiff），仍然留下痕印一样的尘。
 *
 * 选取 `kind: "aim"`：可指任意阵营实体、方向或地面点，也能对空地扬起；没有实体时照样砸下留痕，方块不变形。
 *   攻击许可仍由命中层决定，AI 仍按仇恨推荐敌人；手动空放与 AI 选敌是两条独立的路。
 *
 * 与同族分开：拍击瞬发而便宜、扇面一扫；摔打慢、重、落痕先画出来，是一道窄长条带、专吃一字排开的目标。
 * 配置 `heavy`（沉砸式）由 resolve 改时序、由公式改威力／落痕宽度／震距与砸落时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const slamScene = "world_combat:move_slam";
    const slamHitText = "world_combat.move.slam.text.hit";
    const slamMissText = "world_combat.move.slam.text.miss";

    /** 落痕条带的四个角：从肢体前端 near 犁到落点 far，宽 2*half；判定与表现共用这组顶点。 */
    function slamStrip(near: CombatPoint, far: CombatPoint, heading: CombatPoint, half: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        return [near.plus(side.scale(half)), near.minus(side.scale(half)), far.minus(side.scale(half)), far.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "slam",
        cooldownParameter: "recharge",
        name: "Slam",
        description: "把长尾、长身或藤蔓高高扬起，朝选定方向沿地面犁出一道窄长落痕。扬起的瞬间落痕就定死了——那道条带会在地面亮出来，站在上面就吃满，在落下前横走挪开就能躲掉。它是全族最高的单发，也是最慢、最容易落空的一记；条带很窄，专吃一字排开或堵在窄道里的目标。",
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
            action.present("world_combat:move_slam:raise", slamScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: config && config.heavy === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const aimPoint = action.targetPosition();
            action.releaseTarget();

            const reach = Math.max(1.6, p("slam", "reach", action));
            const width = Math.max(0.5, p("slam", "width", action));
            const half = width / 2;
            const power = p("slam", "impact", action);
            const push = Math.max(0.15, p("slam", "shockPush", action));
            const dust = Math.max(10, Math.round(p("slam", "dust", action)));
            const fall = Math.max(4, Math.round(p("slam", "fallTicks", action)));
            const scale = Math.max(0.6, Math.min(2.2, width / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));

            // 锁定条带：优先朝瞄点；瞄点与脚下重合（只给了方向）时退回当前朝向、铺满整段 reach。
            let delta = aimPoint.minus(origin);
            let flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 0.05 ? WorldGeometry.flatUnit(action.direction()) : flat.unit();
            if (flat.length() < 0.05) flat = heading.scale(reach);
            const limbFront = Math.max(0.35, Math.min(1.2, width));
            const farDistance = Math.min(reach, Math.max(limbFront + 0.7, flat.length()));
            const near = origin.plus(heading.scale(limbFront));
            const far = origin.plus(heading.scale(farDistance));
            const length = Math.max(0.7, farDistance - limbFront);
            const strip = slamStrip(near, far, heading, half);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, slamScene, 1, near,
                { moment: "mark", path: strip, length: length, width: width, fall: fall, scale: scale, intensity: intensity }, fall + 6);
            sound(action, "minecraft:entity.player.attack.strong");

            function land(current: CombatAction): void {
                const scope = current.world();
                const struck: string[] = [];
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(near, heading, length, half, { below: 2.0, above: 2.4 }),
                    function (victim, facts) {
                        if (!hurt(current, victim, "slam", power,
                            { damage: damageSpec("slam", "impact"), contact: true })) return;
                        struck.push(String(victim.ref()));
                        const position = facts.position();
                        const away = WorldGeometry.closestOnSegment(position, near, far);
                        const flatAway = WorldCombat.point(position.x() - away.x(), 0, position.z() - away.z());
                        const direction = flatAway.length() < 0.05 ? heading : flatAway.unit();
                        if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
                        WorldFeedback.emit(scope, slamScene, 1, position,
                            { moment: "hit", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 22);
                    });
                WorldFeedback.emit(scope, slamScene, 1, far,
                    { moment: "impact", path: strip, length: length, width: width, dust: dust, hits: struck.length, scale: scale, intensity: intensity }, 30);
                sound(current, "cobblemon:impact.ground");
                if (struck.length === 0) {
                    WorldFeedback.emit(scope, slamScene, 1, far, { moment: "whiff", path: strip, width: width, scale: scale }, 18);
                    WorldFeedback.text(scope, far.plus(WorldCombat.point(0, 1.0, 0)), slamMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, far.plus(WorldCombat.point(0, 1.4, 0)), slamHitText, [struck.length], 24);
                }
                finish(current);
            }

            action.after(fall, function (next: CombatAction) { land(next); });
        }
    });
}
