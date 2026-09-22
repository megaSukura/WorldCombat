/**
 * 追打 / Pursuit — 第 014 组「条件特化的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 40、恶、物理、命中 100、PP 20；对手替换下场时威力翻倍。
 * - 即时战斗里没有换人，本实现把「对手正在撤离」翻译成可观察的事实：命中那一刻目标的速度矢量朝远离
 *   施法者的方向（点积 > 0.35）。满足时这一扑的威力翻倍，画面多一层暗色碎片并浮出「追击！」。
 * - 参数分散到精灵数据：威力取物攻与等级，扑击距离与每刻位移取速度，碰撞半径取体型高度。
 */
namespace PokemonSkills {
    export const pursuitId = "pursuit";
    export const pursuitScene = "world_combat:move_pursuit";

    /** 命中时目标是否正背身远离施法者。 */
    export function pursuitRetreating(world: CombatWorld, attacker: CombatActor, target: CombatActor): boolean {
        const self = world.observe(attacker), other = world.observe(target);
        if (!self || !other) return false;
        const velocity = other.velocity(), away = other.position().minus(self.position());
        const speed = velocity.length(), gap = away.length();
        if (speed < 0.02 || gap < 0.05) return false;
        const dot = (velocity.x() * away.x() + velocity.y() * away.y() + velocity.z() * away.z()) / (speed * gap);
        return dot > 0.35;
    }

    actionParameters.define(pursuitId, {
        /** 威力随物攻与等级；这是伤害段随个体变化的那部分。 */
        power: formula(F.stat("attack").times(0.4).plus(F.level().times(0.9)).clamp(40, 105), "追打威力", { base: 50, unit: "威力" }),
        /** 扑击距离随速度，快的个体追得更远。 */
        distance: formula(F.stat("speed").times(0.04).plus(3).clamp(3, 6), "扑击距离", { base: 4.5, unit: "格" }),
        /** 每刻位移随速度。 */
        speed: formula(F.stat("speed").times(0.014).plus(0.5).clamp(0.5, 1.6), "扑击速度", { base: 0.8, unit: "格/刻" }),
        /** 沿目标方向多探一点，保证命中。 */
        traceAhead: formula(F.const(1.2), "前探", { base: 1.2, visible: false }),
        /** 碰撞半径随体型高度。 */
        collisionRadius: formula(F.body("height").times(0.25).plus(0.25).clamp(0.3, 0.5), "碰撞半径", { base: 0.35, unit: "格" }),
        minimumMove: formula(F.const(0.05), "最小位移", { base: 0.05, visible: false })
    });

    defineDamage(pursuitId, "power", {});

    describe(pursuitId, [
        { key: "description.0", values: ["power", "distance", "speed", "collisionRadius"] },
        { key: "description.1", values: ["pp", "cooldown"] }
    ]);
}
