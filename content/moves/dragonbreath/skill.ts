/**
 * 龙息 / dragonbreath 的出手方式。
 *
 * 念头的形状：先深吸一口气（windup，提交前只播预告）→ 从身前往外喷出一道扇形吐息（breath），
 * 气流由近及远逐步铺满整片锥形，先被扫到的目标先吃伤（impact），同一目标只吃一次 → 收尾留一缕雾气（linger）。
 * 判定用的 `WorldGeometry.sector` 与表现用的 `polygon` 顶点是同一组扇形，玩家看到的锥面就是会被扫到的地。
 * 两幕：windup → breath（可带多个 impact）+ linger。提交后才触碰世界。
 */
namespace PokemonSkills {
    const dragonbreathScene = "world_combat:move_dragonbreath";
    const dragonbreathHitText = "world_combat.move.dragonbreath.text.hit";
    const dragonbreathMissText = "world_combat.move.dragonbreath.text.miss";

    /** 以施法者为顶点、朝方向张开 arc 度的扇面顶点；判定（sector）与表现（polygon）读同一份形状。 */
    function dragonbreathCone(origin: CombatPoint, direction: CombatPoint, reach: number, arc: number): number[][] {
        var forward = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var base = Math.atan2(heading.z(), heading.x());
        var half = (arc * Math.PI / 180) / 2, steps = 8;
        var vertices: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (var i = 0; i <= steps; i++) {
            var angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y() + 0.5, origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    define({
        id: "dragonbreath",
        name: "Dragon Breath",
        description: "The user exhales a mighty gust that inflicts damage. This may also leave the target with paralysis.",
        uses: ["喷出一道扇形吐息扫过身前一片", "一次扫到排成一列的多个敌人", "让被扫到的对手陷入麻痹"],
        kind: "enemy",
        range: 5,
        maxRange: 7,
        prepare: 8,
        active: 26,
        recover: 10,
        cooldown: 30,
        style: "breath",
        defaults: { wide: true, ai: { maxChase: 9, cluster: true, opening: "anytime" } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["dragonbreath"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var wide = !(config && config.wide === false);
            return {
                prepare: p("dragonbreath", "prepare", context) + (wide ? 0 : 2),
                recover: p("dragonbreath", "recover", context),
                cooldown: p("dragonbreath", "cooldown", context) + (wide ? 0 : 4),
                range: p("dragonbreath", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragonbreath:windup", dragonbreathScene, 1, action.origin(), JSON.stringify({ moment: "inhale", wide: !(config && config.wide === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("dragonbreath", "reach", action);
            const arc = Math.max(24, Math.round(p("dragonbreath", "arc", action)));
            const power = p("dragonbreath", "breath", action);
            const chance = p("dragonbreath", "numbChance", action);
            const ticks = Math.max(6, Math.round(p("dragonbreath", "breathTicks", action)));
            const limit = Math.max(1, Math.round(p("dragonbreath", "maxTargets", action)));
            const hitRefs: { [ref: string]: boolean } = {};
            let hits = 0, elapsed = 0;

            sound(action, "cobblemon:move.dragonclaw.actor");
            function finish(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null)
                    WorldFeedback.emit(scope, dragonbreathScene, 1, body.position(), { moment: "linger", hits: hits }, 24);
                WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? dragonbreathHitText : dragonbreathMissText, hits > 0 ? [hits] : [], 28);
                done(current);
            }
            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                const grow = Math.min(1, (elapsed + 1) / ticks);
                const span = Math.max(0.6, reach * grow);
                const region = WorldGeometry.sector(here, direction, span, arc, { below: 2, above: 3 });
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    const key = String(target.ref());
                    if (hitRefs[key] || hits >= limit) return;
                    hitRefs[key] = true;
                    const distance = facts.position().minus(here).length();
                    const gain = Math.max(0.55, 1 - (distance / Math.max(1, reach)) * 0.4);
                    hurt(current, target, "dragonbreath", power * gain,
                        { damage: damageSpec("dragonbreath", "breath"), status: "paralysis", chance: chance });
                    hits++;
                    WorldFeedback.emit(scope, dragonbreathScene, 1, facts.position(),
                        { moment: "impact", target: key, intensity: Math.max(0.5, Math.min(1.8, power / 60)) }, 26);
                });
                WorldFeedback.keep(scope, "world_combat:move_dragonbreath:cone", dragonbreathScene, 1, here,
                    { moment: "breath", path: dragonbreathCone(here, direction, span, arc), reach: span, flow: Math.round(span * 22), scale: span / reach }, 14);
                elapsed++;
                if (elapsed >= ticks) { finish(current); return; }
                current.after(2, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
