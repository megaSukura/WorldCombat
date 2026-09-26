/**
 * 气场轮 / Aura Wheel — 第 014 组「条件特化的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 110、物理、命中 100、PP 10；使用后自身速度 +1；
 *   属性随莫鲁贝可的样子变化（满腹 = 电，空腹 = 恶）。
 * - 本实现把「属性随样子改变」翻成即时战斗里可读的事实：形态带 hangry-mode 时伤害属性为恶，否则为电；
 *   命中属性、本系加成与属性相性都跟着走。原生的「只有莫鲁贝可能用」限制取消，任何战斗者都能用，
 *   属性按自身形态判定（非莫鲁贝可默认电）。
 * - 参数分散到精灵数据：威力取物攻、速度与等级，滚动距离与每刻速度取速度，碰撞半径取体型高度。
 * - 选取为 motion：12 格内选落点，不必是敌人；实际滚动长度取 `distance` 与落点距离的较小值。
 * - 表现由机制值驱动：形态决定的属性色进入 data.tint（只作辅助），威力进入命中碎片数量，
 *   实际每刻位移进入 data.spin 驱动轮子转速。
 */
namespace PokemonSkills {
    export const aurawheelId = "aurawheel";
    export const aurawheelScene = "world_combat:move_aurawheel";
    export const aurawheelColors: { [type: string]: number } = { electric: 0xF8D030, dark: 0x705848 };

    /** 空腹形态（hangry-mode）为恶，其余为电。 */
    export function aurawheelTypeOf(pokemon: CombatPokemon): string {
        if (typeof pokemon.aspect === "function" && pokemon.aspect("hangry-mode")) return "dark";
        return String(pokemon.form()).toLowerCase().indexOf("hangry") >= 0 ? "dark" : "electric";
    }
    export function aurawheelColorOf(pokemon: CombatPokemon): number {
        return aurawheelColors[aurawheelTypeOf(pokemon)] || 0xF8D030;
    }
    export function aurawheelSource(damage: PokemonDamage.FeatureContext): CombatPokemon | null {
        if (damage.actor && String(damage.actor.domain()) === "cobblemon") return CobblemonCombat.pokemon(damage.actor);
        const native = damage.sourceFacts.data.native;
        return native && native.pokemon ? <CombatPokemon>native.pokemon : null;
    }

    actionParameters.define(aurawheelId, {
        /** 威力取物攻、速度与等级：这是伤害段随个体变化的那部分。 */
        power: formula(F.stat("attack").times(0.6).plus(F.stat("speed").times(0.25)).plus(F.level().times(1.0)).clamp(70, 150),
            "气场轮威力", { base: 110, unit: "威力" }),
        /** 使用后提升的速度级数。 */
        haste: formula(F.const(1), "提速级数", { base: 1, unit: "级" }),
        /** 滚动距离随速度。 */
        distance: formula(F.stat("speed").times(0.08).plus(6).clamp(6, 12), "滚动距离", { base: 9, unit: "格" }),
        /** 每刻滚动速度随速度。 */
        speed: formula(F.stat("speed").times(0.018).plus(0.6).clamp(0.6, 1.7), "滚动速度", { base: 1.1, unit: "格/刻" }),
        traceAhead: formula(F.const(1.3), "前探", { base: 1.3, visible: false }),
        /** 碰撞半径随体型高度，轮子比身体略宽。 */
        collisionRadius: formula(F.body("height").times(0.3).plus(0.3).clamp(0.35, 0.6), "碰撞半径", { base: 0.45, unit: "格" }),
        minimumMove: formula(F.const(0.05), "最小位移", { base: 0.05, visible: false })
    });

    defineDamage(aurawheelId, "power", {}, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            const pokemon = aurawheelSource(damage);
            return pokemon ? { type: aurawheelTypeOf(pokemon) } : undefined;
        }
    });

    describe(aurawheelId, [
        { key: "description.0", values: ["power","distance","speed","collisionRadius","haste"] },
        { key: "description.1", values: ["pp", "cooldown"] },
        { key: "timing", values: ["range","prepare","recover"] }
    ]);
}
