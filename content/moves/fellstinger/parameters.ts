/**
 * 致命针刺 / Fell Stinger — 第 014 组「条件特化的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 50、虫、物理、接触、命中 100、PP 25；若以此招击倒对手，
 *   自身攻击提高 3 级。
 * - 即时战斗里「击倒」就是命中结算后目标生命归零：命中后立刻观测目标生命，归零则按等级阶梯提升攻击，
 *   并浮字与升级特效。攻击提升复用公共能力等级（NativeEffects.boost），对宝可梦与别的战斗者同一条路。
 * - 参数分散到精灵数据：威力取物攻、速度与等级，突刺距离与速度取速度，碰撞半径取体型高度，
 *   击倒后的提升级数随等级阶梯。
 */
namespace PokemonSkills {
    export const fellstingerId = "fellstinger";
    export const fellstingerScene = "world_combat:move_fellstinger";

    /** 命中后目标是否已被这一击放倒。 */
    export function fellstingerDefeated(world: CombatWorld, target: CombatActor): boolean {
        const body = world.observe(target);
        return !body || body.health() <= 0;
    }

    actionParameters.define(fellstingerId, {
        /** 威力取物攻、速度与等级：这是伤害段随个体变化的那部分。 */
        power: formula(F.stat("attack").times(0.34).plus(F.stat("speed").times(0.2)).plus(F.level().times(0.7)).clamp(35, 90),
            "针刺威力", { base: 50, unit: "威力" }),
        /** 击倒后攻击提升的级数随等级阶梯：低等级 2 级，高等级 4 级。 */
        rise: formula(F.level().times(0.05).plus(1).clamp(2, 4).round(), "提升级数", { base: 3, unit: "级" }),
        /** 突刺距离随速度。 */
        distance: formula(F.stat("speed").times(0.02).plus(2.4).clamp(2.4, 4), "突刺距离", { base: 3.2, unit: "格" }),
        /** 每刻位移随速度。 */
        speed: formula(F.stat("speed").times(0.006).plus(0.45).clamp(0.45, 1.0), "突刺速度", { base: 0.6, unit: "格/刻" }),
        traceAhead: formula(F.const(0.9), "前探", { base: 0.9, visible: false }),
        /** 碰撞半径随体型高度。 */
        collisionRadius: formula(F.body("height").times(0.2).plus(0.22).clamp(0.28, 0.45), "碰撞半径", { base: 0.32, unit: "格" }),
        minimumMove: formula(F.const(0.05), "最小位移", { base: 0.05, visible: false })
    });

    defineDamage(fellstingerId, "power", {});

    describe(fellstingerId, [
        { key: "description.0", values: ["power", "distance", "speed", "collisionRadius", "rise"] },
        { key: "description.1", values: ["pp", "cooldown"] }
    ]);
}
