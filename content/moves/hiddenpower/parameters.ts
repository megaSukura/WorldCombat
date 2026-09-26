/**
 * 觉醒力量 / Hidden Power — 第 014 组「条件特化的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、特殊、命中 100、PP 15；属性由使用者的个体值决定。
 * - 本实现把「属性随使用者改变」翻成即时战斗里可读的事实：命中属性由六项个体值的奇偶算出
 *   （第六世代起的 Hidden Power 公式），因此伤害属性、本系加成与属性相性都随个体走。
 * - 参数分散到不同精灵数据：威力取特攻与等级，凝聚时间取速度，光束速度取速度，光球半径取体型高度，
 *   射程取特攻，凝聚环数取特攻阶梯。两只精灵放同一招，颜色、长度、光斑数量与伤害都不同。
 * - 表现由机制值驱动：个体值算出的属性色进入 data.type，威力进入光斑数量与强度。
 * - 选取为 aim：手动可瞄方向/点空放，AI 仍可推荐敌人作为瞄向；实体伤害权限由命中层判定，撞到方块即结束。
 */
namespace PokemonSkills {
    /** 本单元独有的启动 id，避免与其他作者的命名空间成员重名。 */
    export const hiddenpowerId = "hiddenpower";
    export const hiddenpowerScene = "world_combat:move_hiddenpower";
    /** 第六世代起的属性查表顺序（个体值从低位到高位）。 */
    export const hiddenpowerTypes = ["fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel",
        "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark"];
    export const hiddenpowerColors: { [type: string]: number } = {
        fighting: 0xC03028, flying: 0xA890F0, poison: 0xA040A0, ground: 0xE0C068, rock: 0xB8A038, bug: 0xA8B820,
        ghost: 0x705898, steel: 0xB8B8D0, fire: 0xF08030, water: 0x6890F0, grass: 0x78C850, electric: 0xF8D030,
        psychic: 0xF85888, ice: 0x98D8D8, dragon: 0x7038F8, dark: 0x705848
    };

    /** 六项个体值奇偶决定觉醒属性；顺序 hp/atk/def/spe/spa/spd。 */
    export function hiddenpowerTypeOf(pokemon: CombatPokemon): string {
        const order = ["hp", "atk", "def", "spe", "spa", "spd"];
        let bits = 0;
        for (let index = 0; index < order.length; index++) if (pokemon.iv(order[index]) % 2 === 1) bits += Math.pow(2, index);
        return hiddenpowerTypes[Math.floor(bits * 15 / 63)];
    }
    export function hiddenpowerColorOf(pokemon: CombatPokemon): number {
        return hiddenpowerColors[hiddenpowerTypeOf(pokemon)] || 0x9B59FF;
    }
    /** 命中结算里取回使用者：现场优先，脱离现场时退回快照里的原生个体。 */
    export function hiddenpowerSource(damage: PokemonDamage.FeatureContext): CombatPokemon | null {
        if (damage.actor && String(damage.actor.domain()) === "cobblemon") return CobblemonCombat.pokemon(damage.actor);
        const native = damage.sourceFacts.data.native;
        return native && native.pokemon ? <CombatPokemon>native.pokemon : null;
    }
    /** 方块受击面的外法线；未知接触返回 null（身体阻挡等没有具体方块面的情形）。 */
    export function hiddenpowerFaceNormal(face: string): CombatPoint | null {
        switch (face) {
            case "up": return WorldCombat.point(0, 1, 0);
            case "down": return WorldCombat.point(0, -1, 0);
            case "north": return WorldCombat.point(0, 0, -1);
            case "south": return WorldCombat.point(0, 0, 1);
            case "west": return WorldCombat.point(-1, 0, 0);
            case "east": return WorldCombat.point(1, 0, 0);
            default: return null;
        }
    }
    /** 没有方块面时，碎裂朝来弹方向崩开；从接触点指回施法者。 */
    export function hiddenpowerBack(action: CombatAction, point: CombatPoint): CombatPoint {
        const body = action.world().observe(action.actor());
        if (!body) return WorldCombat.point(0, 1, 0);
        const back = body.position().minus(point);
        return back.length() < 0.01 ? WorldCombat.point(0, 1, 0) : back.unit();
    }

    actionParameters.define(hiddenpowerId, {
        /** 伤害随特攻与等级成长；这是这一段的威力参数，也是悬浮里展开的那一项。 */
        power: formula(F.stat("specialAttack").times(0.35).plus(F.level().times(1.2)).clamp(45, 115).as("觉醒威力"), "觉醒威力", { base: 60, unit: "威力" }),
        /** 凝聚时间由速度决定：快的个体出手更快。 */
        charge: seconds(F.stat("speed").times(-0.06).plus(16).clamp(5, 14).round(), "凝聚时间"),
        /** 光束飞行速度随速度成长。 */
        velocity: formula(F.stat("speed").times(0.008).plus(0.6).clamp(0.6, 1.4), "光束速度", { base: 1, unit: "格/刻" }),
        /** 光球碰撞半径随体型高度。 */
        radius: formula(F.body("height").times(0.05).plus(0.14).clamp(0.16, 0.3), "光球半径", { base: 0.2, unit: "格" }),
        /** 选取距离随特攻，特攻越高越远。 */
        reach: formula(F.stat("specialAttack").times(0.06).plus(10).clamp(10, 22), "射程", { base: 14, unit: "格" }),
        /** 凝聚环数与光斑层数随特攻阶梯；也是表现里的环数量。 */
        focus: formula(F.stat("specialAttack").times(0.03).plus(1).clamp(1, 4).round(), "凝聚环数", { base: 2, unit: "环" })
    });

    /** 默认映射：基础值 = 威力 / 10，攻击系数随之。属性由个体值在命中前覆写。 */
    defineDamage(hiddenpowerId, "power", {}, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            const pokemon = hiddenpowerSource(damage);
            return pokemon ? { type: hiddenpowerTypeOf(pokemon) } : undefined;
        }
    });

    describe(hiddenpowerId, [
        { key: "description.0", values: ["power","charge","velocity","reach"] },
        { key: "description.type", values: [] },
        { key: "description.ballistic", values: ["radius"] },
        { key: "description.1", values: ["pp", "cooldown"] }
    ]);
}
