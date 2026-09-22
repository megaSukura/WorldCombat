/**
 * 冤冤相报 / bittermalice 的出手方式。
 *
 * 核心念头：把心头的怨念放出去——它循着目标飞过去、一把攥住，把对方的力气按下去。施法者自己越受伤，这一记越深；
 *   目标身上带着异常时，纠缠式加倍，怨念式则把那份异常一口吞掉、换成更重的一击与更深的掉攻。
 *
 * 两幕（提交前只播预告）：
 *   聚（seethe，提交前）：暗紫怨念从脚边、胸口汇起，只播一记预告。
 *   攥（reach → grasp / miss，提交后）：怨念化手朝目标飞去（投射物外观 + 循迹），命中活体即结算 `curse` 特殊伤害、
 *       让目标攻击下降 `stages` 级；怨念式还会先吞掉目标身上一个主异常（`CombatStatus.cureMajor`）。目标中途离场就落空。
 *
 * 与同族分开：猛扑是向前重撞、广域破坏是原地宽扫、热带踢是带火的挑踢；bittermalice 是**隔空**的一记，
 *   而且读的是「自身伤势 + 目标异常」。降攻对所有战斗者同一条路（NativeEffects.boost）。
 *
 * 配置 `grudge` 由公式改威力／掉攻级数、由执行吞掉目标异常；提交后才触碰世界。
 */
namespace PokemonSkills {
    const bittermaliceScene = "world_combat:move_bittermalice";
    const bittermaliceGraspText = "world_combat.move.bittermalice.text.grasp";
    const bittermaliceDevourText = "world_combat.move.bittermalice.text.devour";
    const bittermaliceMissText = "world_combat.move.bittermalice.text.miss";

    define({
        id: "bittermalice",
        name: "Bitter Malice",
        description: "把心头的怨念放出去，化作一只手循着目标飞过去攥住它：命中造成特殊伤害并让它的攻击下降。自身生命越少这一记越重；目标带着异常时纠缠式会加倍，怨念式则吞掉那份异常换取更重的一击与更深的掉攻。",
        uses: ["压低一个远程目标的物理输出", "在残血时把怨念化作最重的一击", "对带着异常的对手收尾（怨念式顺手解掉它的异常）"],
        kind: "enemy",
        range: 8,
        maxRange: 13.6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "grudge",
        defaults: { grudge: false, ai: { maxChase: 12, afflicted: true, wounded: true } },
        fields: [flag("grudge", "怨念式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("bittermalice", "radius", pokemon) : 0.45, geometry: "circle", style: "grudge", color: 0x8A6BE0,
                label: config && config.grudge === true ? "冤冤相报·怨念式" : "冤冤相报" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bittermalice"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bittermalice", "tempo", context)),
                recover: Math.round(p("bittermalice", "recover", context)),
                cooldown: Math.round(p("bittermalice", "recharge", context)),
                active: 0,
                range: p("bittermalice", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bittermalice:seethe", bittermaliceScene, 1, action.origin(),
                JSON.stringify({ moment: "seethe", windup: prepare, grudge: config && config.grudge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null) { done(action); return; }
            const grudge = !!(config && config.grudge === true);
            const power = p("bittermalice", "curse", action);
            const speed = p("bittermalice", "velocity", action);
            const radius = Math.max(0.35, p("bittermalice", "radius", action));
            const stages = Math.max(1, Math.min(2, Math.round(p("bittermalice", "stages", action))));
            const motes = Math.max(10, Math.round(p("bittermalice", "motes", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.45));
            const intensity = Math.max(0.6, Math.min(2.6, power / 66));
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            WorldFeedback.emit(world, bittermaliceScene, 1, action.origin(),
                { moment: "seethe", motes: motes, scale: scale, intensity: intensity, grudge: grudge ? 1 : 0 }, 24);
            sound(action, "minecraft:entity.evoker.cast_spell");

            const bolt = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 140,
                appearance: { sprite: "cobblemon:generic/thought_trail_large", tint: 0x8A6BE0, glow: true,
                    scale: Math.max(0.7, Math.min(1.7, scale)),
                    homing: { target: String(target.ref()), turn: 10, delay: 3, range: action.range() } },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const victim = hit.target();
                    const at = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "bittermalice", power, { damage: damageSpec("bittermalice", "curse") });
                        let consumed = "";
                        if (grudge && landed) {
                            const name = CombatStatus.major(scope, victim);
                            if (name && CombatStatus.cure(scope, victim, name)) consumed = name;
                        }
                        if (landed && scope.valid(victim)) NativeEffects.boost(scope, victim, "atk", -stages);
                        const body = scope.valid(victim) ? scope.observe(victim) : null;
                        const where = body !== null ? body.position() : at;
                        WorldFeedback.emit(scope, bittermaliceScene, 1, where,
                            { moment: "grasp", target: String(victim.ref()), motes: motes, stages: stages, consumed: consumed ? 1 : 0,
                                scale: scale, intensity: intensity }, 30);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                            consumed ? bittermaliceDevourText : bittermaliceGraspText, [stages], 26);
                        scope.sound("cobblemon:impact.ghost", at, 16, "{}");
                    } else {
                        WorldFeedback.emit(scope, bittermaliceScene, 1, at, { moment: "miss", motes: motes, scale: scale }, 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), bittermaliceMissText, [], 20);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!settled) {
                    const at = current.targetPosition();
                    WorldFeedback.emit(current.world(), bittermaliceScene, 1, at, { moment: "miss", motes: motes, scale: scale }, 20);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.0, 0)), bittermaliceMissText, [], 20);
                }
                finish(current);
            });
            if (bolt) WorldFeedback.keep(world, "bittermalice:reach:" + action.id(), bittermaliceScene, 1, action.origin(),
                { moment: "reach", projectile: bolt, motes: motes, scale: scale, intensity: intensity }, 120);
        }
    });
}
