/**
 * 空手劈 / karatechop 的出手方式。
 *
 * 核心念头：抬手就是一记手刀，没有任何起手——按下后朝瞄准方向递出极短的一刀，刀路只取真实首碰：
 *   前排的身体或墙会先截住它，够得极近、只打一个目标、冷却极短，是可以在走位与连打之间随手甩出的贴身压力招。
 *
 * 两幕（起手为 0，所以第一幕在按下的同一刻完成）：
 *   劈（chop，提交后）：`kind: "aim"`——朝任意方向或世界点递出 `reach` 格长的短刀路，`action.trace(..., true)`
 *       把友方身体与实墙都算作接触，第一个接触的非友方活体才吃一记 `chop` 接触斩击；否则刀停在接触点不结算。
 *       手刀专找护甲的缝，比同族更少吃防御减免。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在刀口补一发亮白强调与浮字。
 *
 * 与同族分开：暗袭要害会读空门、旋风刀要蓄力铺扇、气场之翼顺带提速——空手劈是唯一「零起手、
 *   贴身单点、能边走边劈」的一记。玩家从「一道竖线紧贴拳距瞬间落下、人不用停」认出它。
 *
 * 配置 `knife` 由 resolve 改射程，由公式改威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 手刀刀路的接触半径（格）；几何常量，不随个体变化。 */
    const karatechopEdge = 0.3;

    /** 手刀落下的竖线：从落点上方 depth 压到落点；判定与表现共用。 */
    function karatechopStroke(point: CombatPoint, depth: number): number[][] {
        const top = point.plus(WorldCombat.point(0, depth, 0));
        return [[top.x(), top.y(), top.z()], [point.x(), point.y(), point.z()]];
    }

    define({
        id: karatechopId,
        cooldownParameter: "recharge",
        name: "Karate Chop",
        description: "抬手一记手刀，几乎没有起手：朝瞄准方向递出极短的一刀，刀路只碰到的第一个非友方，一道竖直的白线紧贴拳距落下，把它劈开并崩出碎屑。它够得极近、只打一个、冷却极短，前排的身体和墙会先截住它；刀口专找护甲的缝，对高防御目标衰减更慢，暴击率比同族高一档。",
        uses: ["抬手就是一记手刀，没有起手", "只打贴身的一个目标，冷却极短", "刀口专找护甲的缝，暴击率高一档"],
        kind: "aim",
        range: 1.9,
        maxRange: 2.4,
        prepare: 0,
        active: 0,
        recover: 5,
        cooldown: 14,
        style: "chop",
        stationary: false,
        defaults: { knife: false, ai: { maxChase: 5, punish: true, finishLow: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(karatechopId, "reach", pokemon), geometry: "line", style: "chop", color: 0xD98A5A,
                label: config && config.knife === true ? "手刀式空手劈" : "空手劈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[karatechopId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: 0,
                recover: Math.round(p(karatechopId, "aftercast", context)),
                cooldown: Math.round(p(karatechopId, "recharge", context)),
                active: 0,
                range: p(karatechopId, "reach", context)
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const reach = Math.max(0.8, p(karatechopId, "reach", action));
            const depth = Math.max(0.5, p(karatechopId, "depth", action));
            const power = p(karatechopId, "chop", action);
            const shards = Math.max(8, Math.round(p(karatechopId, "shards", action)));
            const scale = Math.max(0.6, Math.min(2.0, depth / karatechopReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 50));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            // 权威判定：短刀路的第一接触（含友方身体与实墙）就是刀口真实停下的地方。
            const from = self.position();
            const contact = action.trace(from, from.plus(direction.scale(reach)), karatechopEdge, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const stroke = karatechopStroke(at, depth);

            // 无论中不中，刀都完整落下：竖线紧贴实际拳距。
            WorldFeedback.emit(world, karatechopScene, 1, at,
                { moment: "chop", path: stroke, shards: shards, scale: scale,
                    intensity: intensity, target: victim === null ? "" : String(victim.ref()) }, 18);
            sound(action, "minecraft:entity.player.attack.strong");

            if (victim !== null && world.valid(victim)) {
                const landed = impact(action, contact, karatechopId, power,
                    { damage: damageSpec(karatechopId, "chop"), contact: true });
                if (landed) {
                    // 命中只出现一次：刀口炸开一圈碎屑。
                    WorldFeedback.emit(world, karatechopScene, 1, at,
                        { moment: "hit", shards: shards, scale: scale, intensity: intensity }, 16);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, depth + 0.3, 0)), karatechopHitText, [], 20);
                    sound(action, "cobblemon:impact.fighting");
                } else {
                    // 伤害被拒（免疫、不可选中）：不声称命中，只留一记软收。
                    WorldFeedback.emit(world, karatechopScene, 1, at, { moment: "miss", scale: scale }, 14);
                }
            } else {
                // 友方身体或实墙先截住刀路，或前方空挥：刀停在接触点，不结算。
                WorldFeedback.emit(world, karatechopScene, 1, at,
                    { moment: "miss", scale: scale, blocked: contact.blocked() ? 1 : 0 }, 14);
                if (!contact.blocked() && lander === null)
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), karatechopMissText, [], 18);
            }
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在刀口补一记亮白强调与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_karatechop/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== karatechopId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 10;
        WorldFeedback.emit(world, karatechopScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(8, Math.min(40, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.0, ratio)) }, 22);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), karatechopCritText, [], 26);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
