/**
 * 日光刃 / solarblade —— 出手方式。
 *
 * 核心念头：把日光在身侧凝成一把刀，向前踏出一步整刀斩过去；晴天里刀已经在手，阴雨里要站着凝刃、刀也钝一半。
 *
 * 两幕（强日光下只有第二幕）：
 *   起（gather，提交前）：光缕在身侧收成一条刀刃、脚下起尘；只播预告，可被打断（打断不花 PP）。
 *   击（dash → slash → hit / fizzle）：提交后先沿瞄准方向突进 `dash` 格，再以突进终点为顶点朝目标方向
 *       扫出 `arc` 度的扇形，扇形内每个非友方各挨一记接触伤害并沿刀势推开；打空只留一下挥空的光屑。
 *
 * 与同族分开：日光束是远距离一条贯穿的光带、破坏光线要付熄火；日光刃是唯一贴身的那个——
 *   它靠突进贴上去、一刀扫开面前一片，晴天里的价值是「无预警的贴身爆发」。
 */
namespace PokemonSkills {
    const solarbladeScene = "world_combat:move_solarblade";
    const solarbladeSunText = "world_combat.move.solarblade.text.sun";
    const solarbladeHitText = "world_combat.move.solarblade.text.hit";
    const solarbladeSweepText = "world_combat.move.solarblade.text.sweep";
    const solarbladeMissText = "world_combat.move.solarblade.text.miss";

    define({
        id: "solarblade",
        name: "日光刃",
        description: "站定把日光在身侧凝成一把刀，然后向前踏出一步整刀横斩，扇形内的敌人一起挨打并被刀势推开。强日光下当场斩出；阴雨天刀钝一半、凝刃更慢。",
        uses: ["贴身穿插后一刀扫开一排", "晴天里无预警的近身爆发", "把面前的敌人一起推离"],
        kind: "enemy",
        range: 3.6,
        maxRange: 6,
        prepare: 20,
        active: 0,
        recover: 11,
        cooldown: 40,
        style: "blade",
        stationary: true,
        defaults: { thrust: false, ai: { maxChase: 16, multiFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("solarblade", "reach", pokemon), geometry: "cone", style: "blade", color: 0xFFE9A0,
                label: config && config.thrust ? "日光刃·突刺" : "日光刃·横扫" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["solarblade"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const thrust = !!(config && config.thrust);
            return {
                prepare: Math.round(p("solarblade", "charge", context)),
                recover: Math.round(p("solarblade", "recover", context)) + (thrust ? 1 : 0),
                cooldown: Math.round(p("solarblade", "cooldown", context)) + (thrust ? 2 : 0),
                active: skills["solarblade"].active,
                range: p("solarblade", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const blade = Math.max(8, Math.round(p("solarblade", "blade", action)));
            const instant = p("solarblade", "charge", action) <= 0 ? 1 : 0;
            action.present("solarblade:gather", solarbladeScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, blade: blade, sun: instant, thrust: config && config.thrust ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const before = world.observe(actor);
            const origin = before === null ? action.origin() : before.position();
            const direction = aim(action);
            const reach = Math.max(1.6, p("solarblade", "reach", action));
            const arc = Math.max(20, p("solarblade", "arc", action));
            const dash = Math.max(0, p("solarblade", "dash", action));
            const power = p("solarblade", "slash", action);
            const push = p("solarblade", "push", action);
            const blade = Math.max(8, Math.round(p("solarblade", "blade", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 130));
            const scale = Math.max(0.6, Math.min(2.0, reach / 3.2));
            let travelled = 0;

            if (before !== null && dash > 0.05) {
                travelled = world.displace(actor, direction.scale(dash));
                const to = origin.plus(direction.scale(travelled));
                WorldFeedback.emit(world, solarbladeScene, 1, origin.plus(WorldCombat.point(0, 0.5, 0)),
                    { moment: "dash", from: [origin.x(), origin.y(), origin.z()], to: [to.x(), to.y(), to.z()],
                        path: [[origin.x(), origin.y() + 0.5, origin.z()], [to.x(), to.y() + 0.5, to.z()]],
                        blade: blade, scale: scale, intensity: intensity }, 20);
                sound(action, "minecraft:entity.player.attack.sweep");
            }
            const after = world.observe(actor);
            const at = after === null ? origin : after.position();
            const aimPoint = at.plus(direction.scale(reach * 0.5));
            let hits = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");
            WorldFeedback.emit(world, solarbladeScene, 1, aimPoint,
                { moment: "slash", point: [at.x(), at.y() + 0.5, at.z()], direction: [direction.x(), direction.y(), direction.z()],
                    blade: blade, reach: reach, arc: arc, scale: scale, intensity: intensity }, 24);

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(at, direction, reach, arc, { below: 1, above: 3 }), function (enemy, facts) {
                if (!world.clear(at, facts.position())) return;
                if (!hurt(action, enemy, "solarblade", power, { damage: damageSpec("solarblade", "slash"), contact: true, slice: true })) return;
                hits++;
                if (world.valid(enemy)) world.displace(enemy, direction.scale(push));
                WorldFeedback.emit(world, solarbladeScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), blade: blade, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.6, power / 130)) }, 24);
            });

            if (hits > 0) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), hits > 1 ? solarbladeSweepText : solarbladeHitText, hits > 1 ? [hits] : [], 28);
                sound(action, "cobblemon:move.razorleaf.target");
            } else {
                WorldFeedback.emit(world, solarbladeScene, 1, aimPoint, { moment: "fizzle", blade: blade, scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), solarbladeMissText, [], 24);
            }
            if (p("solarblade", "charge", action) <= 0) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.6, 0)), solarbladeSunText, [], 24);
            }
            done(action);
        }
    });
}
