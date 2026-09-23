/**
 * 泰山压顶 / bodyslam 的出手方式。
 *
 * 念头的形状：蹲身蓄力（windup，提交前只播预告）→ 朝目标上方跃起（leap）→ 以整个身体的重量砸在落点（crash），
 * 落点范围内的敌人一起被压中，按体重决定是否被压麻并沿背离方向顶开（impact）→ 收势扬尘。
 * 命中 100 落成“不瞄偏”，但落点在起跳瞬间锁定，对手在腾空期走开就能躲过这一砸。
 * 两幕：leap → crash（可带多个 impact）。提交后才触碰世界，准备期只 present。
 */
namespace PokemonSkills {
    const bodyslamScene = "world_combat:move_bodyslam";
    const bodyslamHitText = "world_combat.move.bodyslam.text.hit";
    const bodyslamMissText = "world_combat.move.bodyslam.text.miss";

    define({
        freeMovement: true,
        id: "bodyslam",
        name: "Body Slam",
        description: "猛地跳起，用整个身体的重量砸向目标落点：范围内所有敌人受伤并被顶开，越重越可能把它们压麻；震地式摊大范围但单点更轻，压顶式相反。",
        uses: ["从上方压住一个目标", "把落点周围挤在一起的敌人一起震开", "用体重压出更高的麻痹机会"],
        kind: "enemy",
        range: 4,
        maxRange: 7,
        prepare: 8,
        active: 44,
        recover: 10,
        cooldown: 34,
        style: "drop",
        defaults: { splash: false, ai: { maxChase: 8, preferCrowd: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["bodyslam"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var splash = !!(config && config.splash);
            return {
                prepare: p("bodyslam", "prepare", context) + (splash ? 2 : 0),
                recover: p("bodyslam", "recover", context) + (splash ? 3 : 0),
                cooldown: p("bodyslam", "cooldown", context) + (splash ? 6 : 0),
                range: p("bodyslam", "leap", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bodyslam:windup", bodyslamScene, 1, action.origin(), JSON.stringify({ moment: "windup", splash: !!(config && config.splash) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const landing = action.targetPosition();
            const origin = action.origin();
            const power = p("bodyslam", "crush", action);
            const radius = p("bodyslam", "landRadius", action);
            const chance = p("bodyslam", "slamChance", action);
            const push = p("bodyslam", "push", action);
            const hop = p("bodyslam", "hop", action);
            const air = Math.max(6, Math.round(p("bodyslam", "airTicks", action)));
            const leap = p("bodyslam", "leap", action);
            const scale = radius / 2.0;
            const delta = landing.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const approach = Math.max(0, Math.min(leap, flat.length() - 0.5));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = approach / air;
            const up = hop / rise;
            const down = hop / fall;

            WorldFeedback.emit(world, bodyslamScene, 1, origin, { moment: "leap", scale: scale, hop: hop }, 24);
            sound(action, "minecraft:entity.ravager.step");

            function crash(current: CombatAction): void {
                const scope = current.world();
                const region = WorldGeometry.ring(landing, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    const landed = hurt(current, target, "bodyslam", power,
                        { damage: damageSpec("bodyslam", "crush"), contact: true, status: "paralysis", chance: chance });
                    hits++;
                    if (landed && scope.valid(target)) {
                        const away = facts.position().minus(landing);
                        if (away.length() >= 0.05)
                            scope.displace(target, away.unit().scale(push));
                    }
                    WorldFeedback.emit(scope, bodyslamScene, 1, facts.position(),
                        { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.4, power / 80)) }, 28);
                });
                WorldFeedback.emit(scope, bodyslamScene, 1, landing,
                    { moment: "crash", scale: scale, bursts: 18 + hits * 8, intensity: Math.max(0.6, Math.min(2.2, power / 80)), hits: hits }, 32);
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? bodyslamHitText : bodyslamMissText, hits > 0 ? [hits] : [], 28);
                done(current);
            }
            function descend(current: CombatAction, elapsed: number): void {
                if (elapsed >= fall) { crash(current); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, -down, 0)));
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }
            function ascend(current: CombatAction, elapsed: number): void {
                if (elapsed >= rise) { descend(current, 0); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, up, 0)));
                current.after(1, function (next: CombatAction) { ascend(next, elapsed + 1); });
            }
            ascend(action, 0);
        }
    });
}
