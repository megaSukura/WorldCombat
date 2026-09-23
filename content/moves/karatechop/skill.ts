/**
 * 空手劈 / karatechop 的出手方式。
 *
 * 核心念头：抬手就是一记手刀，没有任何起手——按下的那一瞬，一道竖直的白线从目标头顶压到脚下。
 *   它够得极近、只打一个目标、冷却极短，是可以在走位与连打之间随手甩出的贴身压力招。
 *
 * 两幕（起手为 0，所以第一幕在按下的同一刻完成）：
 *   劈（chop，提交后）：手刀沿一道竖直白线落下，贴身的单个非友方吃一记 `chop` 接触斩击；
 *       刀口专找护甲的缝，比同族更少吃防御减免。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在刀口补一发亮白强调与浮字。
 *
 * 与同族分开：暗袭要害会位移绕后、旋风刀要蓄力铺扇、气场之翼顺带提速——空手劈是唯一「零起手、
 *   贴身单点、能边走边劈」的一记。玩家从「一道竖线瞬间落下、人不用停」认出它。
 *
 * 配置 `knife` 由 resolve 改射程，由公式改威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 手刀落下的竖线：从落点上方 depth 压到落点；判定与表现共用。 */
    function karatechopStroke(point: CombatPoint, depth: number): number[][] {
        const top = point.plus(WorldCombat.point(0, depth, 0));
        return [[top.x(), top.y(), top.z()], [point.x(), point.y(), point.z()]];
    }

    define({
        id: karatechopId,
        cooldownParameter: "recharge",
        name: "Karate Chop",
        description: "抬手一记手刀，几乎没有起手：一道竖直的白线瞬间落在贴身的一个目标身上，把它劈开并崩出碎屑。它够得极近、只打一个、冷却极短，刀口专找护甲的缝，对高防御目标衰减更慢；暴击率比同族高一档。",
        uses: ["抬手就是一记手刀，没有起手", "只打贴身的一个目标，冷却极短", "刀口专找护甲的缝，暴击率高一档"],
        kind: "enemy",
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
            const target = action.target();
            const direction = aim(action);
            const reach = Math.max(0.8, p(karatechopId, "reach", action));
            const depth = Math.max(0.5, p(karatechopId, "depth", action));
            const power = p(karatechopId, "chop", action);
            const shards = Math.max(8, Math.round(p(karatechopId, "shards", action)));
            const scale = Math.max(0.6, Math.min(2.0, depth / karatechopReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 50));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            let strike = self.position().plus(direction.scale(reach));
            let landed = false;
            if (target !== null && world.valid(target) && !world.friendly(target)) {
                const foe = world.observe(target);
                if (foe !== null) strike = foe.position();
                landed = hurt(action, target, karatechopId, power, { damage: damageSpec(karatechopId, "chop"), contact: true });
            }

            WorldFeedback.emit(world, karatechopScene, 1, strike,
                { moment: "chop", path: karatechopStroke(strike, depth), shards: shards, scale: scale,
                    intensity: intensity, target: target === null ? "" : String(target.ref()) }, 18);
            if (landed) {
                WorldFeedback.emit(world, karatechopScene, 1, strike,
                    { moment: "hit", shards: shards, scale: scale, intensity: intensity }, 16);
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, depth + 0.3, 0)), karatechopHitText, [], 20);
                sound(action, "cobblemon:impact.fighting");
            } else {
                WorldFeedback.emit(world, karatechopScene, 1, strike, { moment: "miss", scale: scale }, 14);
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 0.9, 0)), karatechopMissText, [], 18);
            }
            sound(action, "minecraft:entity.player.attack.strong");
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
