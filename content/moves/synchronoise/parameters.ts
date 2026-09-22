/**
 * 同步干扰 / synchronoise 的参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 120／命中 100／PP 10／target allAdjacent（自己周围所有宝可梦）／
 *   只对**与自己属性相同**的目标生效（`onTryImmunity: target.hasType(source.getTypes())`）、无次要效果。
 *
 * 翻译：把「用神奇电波对属性相同的宝可梦给予伤害」翻成一道**同频电波**——它以施法者自身的属性为频率，
 *   扫过身周整圈：不同频的东西像被波穿过一样毫发无伤，同频的会被锁住、在体内共振挨一下，并带上一小段
 *   「同频」的记号。它是本组唯一会**完全落空**的一招：圈里没有同属性的目标时，整片波白扫。与同族分开：
 *     地震／落英缤纷／爆音波 —— 不看属性，圈里谁都打；
 *     同步干扰             —— 只打与施法者同属性的人，属性就是它的开关。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   pulse          共振威力 120 + 特攻偏移 + 等级偏移（频率越强、共振越深）。
 *   waveRadius     电波半径 5.2 格 + 碰撞箱高度偏移 + 等级偏移（身量大、等级高的个体播得更远）。
 *   resonanceTicks 同频记号停留 120 刻 + 特攻偏移（特攻越高锁得越久）。
 *   echoTicks      余音停留 24 刻 + 等级。
 *   marks          余音环数 6 + 特攻偏移 + 等级偏移（同时驱动画面密度）。
 *
 * 配置 `tight`（收束同调）：开启＝频率收窄到 0.62 倍、共振威力 ×1.42、记号更久，但起手 +2 刻、冷却 +6 刻，
 *   用来把单个同频目标打穿；关闭＝宽播（半径 ×1.0）、威力 ×1.0，用来在一片混战里尽量扫到同频的人。
 *   两向各有适用局面：同频目标多就宽播，只有一个硬目标就收束。
 *
 * 伤害段 `pulse` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    /** 属性主色，用来把电波染成施法者自己的频率色；缺省是近白的淡紫。 */
    export const synchronoisePalette: { [id: string]: number } = {
        normal: 0xE8E0C8, fire: 0xF08030, water: 0x4090E0, electric: 0xFFE040, grass: 0x78C850,
        ice: 0x98D8D8, fighting: 0xC03028, poison: 0xA040A0, ground: 0xE0C068, flying: 0xA890F0,
        psychic: 0xF85888, bug: 0xA8B820, rock: 0xB8A038, ghost: 0x705898, dragon: 0x7038F8,
        dark: 0x705848, steel: 0xB8B8D0, fairy: 0xEE99AC
    };

    actionParameters.define("synchronoise", {
        /** 共振威力：120 + 特攻偏移[−20,52] + 等级(≥25)偏移[0,10]；收束 ×1.42 / 宽播 ×1.0；夹 80..230。 */
        pulse: formula(
            F.base(120)
                .plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-20, 52))
                .plus(F.level().minus(25).times(0.2).clamp(0, 10))
                .times(F.when(F.pref("tight"), F.const(1.42), F.const(1.0)))
                .clamp(80, 230).round(1),
            "共振威力", {
                unit: "威力",
                description: "对同频目标结算的基础威力；特攻越高、等级越高共振越深。它只作用到与施法者属性相同的人，对手特防、相性与暴击在命中时另算。"
            }),
        /** 电波半径：5.2 + 高度偏移[−0.3,1.4] + 等级(≥25)偏移[0,1.5]；收束 ×0.62 / 宽播 ×1.0；夹 3.2..8.2。 */
        waveRadius: formula(
            F.base(5.2)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.3, 1.4))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .times(F.when(F.pref("tight"), F.const(0.62), F.const(1.0)))
                .clamp(3.2, 8.2).round(2),
            "电波半径", {
                unit: "格",
                description: "同频电波罩住身周多大一圈；体型高、等级高的个体播得更远，收束式收得更小。它也是本招的实际射程与指示圈半径。"
            }),
        /** 同频记号停留：120 + 特攻偏移[−30,90]；收束 ×1.3；夹 80..260。 */
        resonanceTicks: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(1.2).clamp(-30, 90))
                .times(F.when(F.pref("tight"), F.const(1.3), F.const(1.0))).clamp(80, 260).round(0),
            "同频记号停留", "被共振锁住的目标带着「同频」记号停留多久；特攻越高锁得越久，收束式更久。"),
        /** 余音停留：24 + 等级 ×0.3；夹 16..44。 */
        echoTicks: seconds(
            F.base(24).plus(F.level().times(0.3)).clamp(16, 44).round(0),
            "余音停留", "电波扫过之后身周余音停留多久；它只驱动画面，不再造成伤害。"),
        /** 余音环数：6 + 特攻偏移[−1,4] + 等级(≥25)偏移[0,2]；夹 4..14。同时驱动画面密度。 */
        marks: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1, 4))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2)).clamp(4, 14).round(0),
            "余音环数", {
                unit: "环",
                description: "电波在身周留下的同频余音环数；特攻越高、等级越高越多，也决定画面的密集程度。"
            }),
        maxTargets: hidden(8)
    });

    defineDamage("synchronoise", "pulse", {});

    stages("synchronoise", [
        { level: 50, values: { pulse: 150, waveRadius: 6.0 } }
    ]);

    describe("synchronoise", [
        { key: "description.0", values: ["pulse"] },
        { key: "description.1", values: ["waveRadius"] },
        { key: "description.2", values: ["resonanceTicks", "echoTicks", "marks"] },
        { key: "tight.on", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "tight.off", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pulse", "tier.0.waveRadius"] }
    ]);
}
