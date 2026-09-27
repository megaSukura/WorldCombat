/**
 * 重踏 / bulldoze 的出手方式。
 *
 * 核心念头：把全身的重量砸进地面，一圈地裂贴着地表往外推——只走地面，所以站在空中的人不会被扫到；
 * 被波沿扫过脚底的人站不稳，速度立刻被压下去。它是一招覆盖，圈里的人都吃，深踏式收窄而更重。
 *
 * 三幕：
 *   起（windup，提交前）：抬脚、脚边卷起一圈石屑的预告，落在真实脚面支撑上。
 *   击（slam → wave → hit）：提交后重踏落地，地裂**从实际脚底沿可连接的真实地表**一圈圈向外推进；
 *       每一圈扫到的、站在地上且与施法者同层连续实地的敌人各挨一记，速度立刻下降 `snareStages` 级（按原生
 *       实际变化回执反馈）并被沿水平背离方向震开一点；中段被打断也保留已中者的减速。
 *   痕（crack）：推到最后，沿同一组真实地表路径扬起薄裂缝与碎屑，停留一会儿自然散去。
 *
 * 地裂是贴地推进的画面与判定，不留长期改动：裂缝由表现层承载，地面方块不会被替换。
 *
 * 传播：有界同层连续实地——以施法者真实脚面为起点，沿水平方向分段检查原生地表支撑，允许约一格高差/台阶，
 *   遇无支撑间隙、悬台或另一楼层即停在断口；不认 ground 的兜底点、不建寻路图。跳离脚面仍可避波。
 *
 * 配置 `deep`（深踏式）由 resolve 改时序、由公式改半径与威力：开启＝窄而重，关闭＝广而轻。
 */
namespace PokemonSkills {
    const bulldozeScene = "world_combat:move_bulldoze";
    const bulldozeFrontScene = "world_combat:bulldoze_front";
    const bulldozeHitText = "world_combat.move.bulldoze.text.hit";
    const bulldozeMissText = "world_combat.move.bulldoze.text.miss";
    const bulldozeSlowText = "world_combat.move.bulldoze.text.slow";

    /**
     * 有界同层连续实地：从 `from` 真实支撑面沿水平方向走到 `to`，分段检查原生地表支撑，
     * 允许每步约一格高差与台阶，遇无支撑间隙或高差超限即返回 false；不认 ground 的兜底点、
     * 不跨悬台或另一楼层，也不构建无界寻路图。`from`/`to` 都必须是真实支撑面（blockFace up）。
     */
    export function bulldozeGroundLink(world: CombatWorld, from: CombatPoint, to: CombatPoint): boolean {
        const start = SurfacePaths.support(world, from, 0.6, 2);
        const end = SurfacePaths.support(world, to, 0.6, 2);
        if (start === null || end === null) return false;
        const dx = end.x() - start.x(), dz = end.z() - start.z();
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 0.75) return Math.abs(end.y() - start.y()) <= 1.05;
        const walked = SurfacePaths.advance(world, start, WorldCombat.point(dx, 0, dz), distance,
            { up: 1, down: 1, spacing: 0.5, samples: Math.ceil(distance / 0.5) + 2 });
        return !walked.ended && Math.abs(walked.point.y() - end.y()) <= 1.05;
    }

    /** 一条射线沿真实地表走到的顶点，判定与表现共用。 */
    function bulldozeRay(world: CombatWorld, centre: CombatPoint, direction: CombatPoint, radius: number): CombatPoint[] {
        const walked = SurfacePaths.advance(world, centre, direction, radius,
            { up: 1, down: 1, spacing: 0.5, samples: Math.ceil(radius / 0.5) + 2 });
        return walked.path;
    }

    /** 把一条射线裁到当前外沿 `reach`：保留走过的点，必要时在跨越处插值。 */
    function bulldozeClip(path: CombatPoint[], reach: number): CombatPoint[] {
        const out: CombatPoint[] = [];
        let travelled = 0;
        if (path.length > 0) out.push(path[0]);
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            const dx = b.x() - a.x(), dz = b.z() - a.z();
            const segment = Math.sqrt(dx * dx + dz * dz);
            if (segment < 1e-6) continue;
            if (travelled + segment <= reach + 1e-6) { out.push(b); travelled += segment; continue; }
            const t = Math.max(0, Math.min(1, (reach - travelled) / segment));
            out.push(WorldCombat.point(a.x() + dx * t, a.y() + (b.y() - a.y()) * t, a.z() + dz * t));
            break;
        }
        return out;
    }

    /** 一条射线当前外沿的世界顶点（末点），用于表现载荷。 */
    function bulldozeVectors(path: CombatPoint[]): number[][] {
        return path.map(function (point) { return [point.x(), point.y() + 0.04, point.z()]; });
    }

    define({
        requiresGround: true,
        id: "bulldoze",
        name: "Bulldoze",
        description: "把重量砸进地面，一圈地裂贴着地表向外推：只命中站在地上、且与施法者同层实地相连的敌人，被扫到的速度立刻下降并被向外震开；推过之后沿波前留下短裂缝。深踏式窄而重、多降一级速度，广踏式更广更快。",
        uses: ["一次性震到贴身的几个敌人", "削掉冲上来的人的速度", "跳过空中的目标，专打站桩的对手", "在被围住时把一圈人推开"],
        kind: "self",
        range: 3.4,
        maxRange: 5.6,
        prepare: 12,
        active: 18,
        recover: 8,
        cooldown: 34,
        style: "earthblow",
        defaults: { deep: false, ai: { maxChase: 7, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bulldoze", "waveRadius", pokemon), geometry: "area", style: "earthblow",
                color: 0x8A7A62, label: config && config.deep === true ? "深踏" : "广踏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["bulldoze"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var deep = !!(config && config.deep);
            return {
                prepare: p("bulldoze", "prepare", context) + (deep ? 3 : 0),
                recover: p("bulldoze", "recover", context),
                cooldown: p("bulldoze", "cooldown", context) + (deep ? 8 : -2),
                active: skills["bulldoze"].active,
                range: p("bulldoze", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            // 预告落在真实脚面支撑上，不悬在身体中心。
            const world = action.sense();
            const body = world.observe(action.actor());
            const feet = body !== null
                ? WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z())
                : action.origin();
            const centre = SurfacePaths.support(world, feet, 0.6, 3) || feet;
            action.present("bulldoze:stomp", bulldozeScene, 1, centre,
                JSON.stringify({ moment: "stomp", deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scene = WorldFeedback.actionScenes(bulldozeScene, 1);
            const front = WorldFeedback.actionScenes(bulldozeFrontScene, 1);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            // 起点用真实支撑面（脚面顶面），不是身体中心：判定圈、尘埃与裂缝都贴在地面上。
            const feet = body !== null
                ? WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z())
                : action.origin();
            const centre = SurfacePaths.support(world, feet, 0.6, 3) || feet;
            const radius = Math.max(1.8, p("bulldoze", "waveRadius", action));
            const power = p("bulldoze", "tremor", action);
            const stages = Math.max(1, Math.round(p("bulldoze", "snareStages", action)));
            const push = p("bulldoze", "push", action);
            const steps = Math.max(2, Math.round(p("bulldoze", "waveTicks", action)));
            const crackTicks = Math.max(20, Math.round(p("bulldoze", "crackTicks", action)));
            const scars = Math.max(6, Math.round(p("bulldoze", "scars", action)));
            const cap = Math.max(1, Math.round(p("bulldoze", "maxTargets", action)));
            const scale = radius / 3.2;
            const intensity = Math.max(0.5, Math.min(2.2, power / 55));
            const hitRefs: { [ref: string]: boolean } = {};
            // 从真实脚底沿可连接表面铺出若干射线；判定与表现共用这组顶点。
            const rays = Math.max(10, Math.min(20, Math.round(radius * 4)));
            const rayPaths: CombatPoint[][] = [];
            for (let i = 0; i < rays; i++) {
                const angle = i / rays * Math.PI * 2;
                const path = bulldozeRay(world, centre, WorldCombat.point(Math.cos(angle), 0, Math.sin(angle)), radius);
                if (path.length >= 2) rayPaths.push(path);
            }
            let step = 0, strikes = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                front.stop(current);
                // 余痕：波前走过的真实地表路径整条淡出，不替换方块。
                WorldFeedback.emit(scope, bulldozeFrontScene, 1, centre,
                    { moment: "scar", paths: rayPaths.map(bulldozeVectors), start: scope.tick(), life: crackTicks,
                        radius: radius, marks: scars, flow: Math.round(30 + radius * 20) }, crackTicks);
                if (strikes === 0)
                    WorldFeedback.emit(scope, bulldozeScene, 1, centre, { moment: "miss", radius: radius, scale: scale }, 20);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.1, 0)),
                    strikes > 0 ? bulldozeHitText : bulldozeMissText, strikes > 0 ? [strikes] : [], 26);
                scene.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / steps, inner = radius * step / steps;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 1 }), function (enemy, facts) {
                    if (strikes >= cap) return;
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || hitRefs[ref]) return;
                    if (!facts.grounded()) return;
                    // 有界同层连续实地：地面断开、跨悬台或另一楼层的目标不震（纯视线不代表地下通路）。
                    const targetFeet = WorldCombat.point(facts.position().x(), facts.boundsMin().y(), facts.position().z());
                    if (!bulldozeGroundLink(scope, centre, targetFeet)) return;
                    if (!hurt(current, enemy, "bulldoze", power, { damage: damageSpec("bulldoze", "tremor") })) return;
                    hitRefs[ref] = true;
                    strikes++;
                    // 安全平向推开：纯竖直差时水平为零就只跳水平推，伤害与减速照常。
                    const away = facts.position().minus(centre);
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    if (scope.valid(enemy) && flat.length() > 0.2)
                        scope.hitDisplace(enemy, flat.unit().scale(push));
                    // 实中即施本招减速，按原生实际变化反馈；中段被打断也已落在目标身上。
                    let slowed = 0;
                    if (scope.valid(enemy)) slowed = Math.abs(NativeEffects.boost(scope, enemy, "spe", -stages));
                    WorldFeedback.emit(scope, bulldozeScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 55)),
                            count: Math.round(10 + power * 0.25), slow: slowed }, 22);
                    if (slowed > 0) {
                        WorldFeedback.emit(scope, bulldozeScene, 1, facts.position(),
                            { moment: "slow", target: ref, stages: slowed, scale: scale, count: Math.round(scars * 0.3) }, 20);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.0, 0)), bulldozeSlowText, [slowed], 24);
                    }
                });
                const clipped = rayPaths.map(function (path) { return bulldozeClip(path, outer); });
                scene.show(current, "wave", centre,
                    { moment: "wave", path: clipped.map(function (path) { return bulldozeVectors(path)[path.length - 1]; }),
                        radius: outer, inner: inner, progress: (step + 1) / steps,
                        flow: Math.round(40 + outer * 30), scale: scale, intensity: intensity });
                front.show(current, "front", centre,
                    { moment: "front", paths: clipped.map(bulldozeVectors), reach: outer, radius: radius,
                        progress: (step + 1) / steps, scale: scale });
                step++;
                // 最后一圈留三刻再收，波前不因同回调 finish 消失；余痕随后接着淡出。
                if (step >= steps) { current.after(3, function (next: CombatAction) { finish(next); }); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.bulldoze.actor");
            WorldFeedback.emit(world, bulldozeScene, 1, centre,
                { moment: "slam", radius: radius, scale: scale, marks: Math.max(10, Math.round(power * 0.5)), intensity: intensity }, 26);
            sound(action, "cobblemon:impact.ground");
            advance(action);
        }
    });
}
