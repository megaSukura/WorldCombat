/**
 * 健美 / bulkup — 参数与数值来源。
 *
 * 原生事实：Fighting、变化、威力 —、命中必中、PP 20、目标 self、boosts { atk: +1, def: +1 }。
 *
 * 翻译：把「使出全身力气绷紧肌肉」翻成**一口气把全身绷到极限、身形当场涨起一圈**——攻击与防御同时抬起来。
 *   取原生「物攻 +1、防御 +1、PP 20、纯自我强化」；放弃回合制里永久保留的等级——即时交战里两项等级立刻写入
 *   公共能力阶梯，涨身是一段可见窗口，窗口走完或被清除时两项等级一起收回。它是本族里唯一**抬攻击**的一招，
 *   也是唯一把两向收益摆在同一个取舍上的：配置「取向」把这一口气偏向攻击或偏向防御，两向各有局面。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   power   物攻等级：偏攻 2 级／偏守 1 级；夹 1..2。原生 +1 是基准，配置把它在两向之间挪一格。
 *   guard   防御等级：偏守 2 级／偏攻 1 级；夹 1..2。与 power 共用同一份配置，两项各成一个公式叶子。
 *   window  涨身窗口：基础 260 刻 + 等级×3；夹 220..520。等级越高，这口气撑得越久。
 *   swell   涨起半径：基础 0.9 格 + 碰撞箱宽度×0.8 + 碰撞箱高度×0.15；夹 0.8..2.2。体型越大，气场铺得越开（判定与表现同径）。
 *   sparks  气浪火星量：基础 22 +（物攻 + 防御）/8；夹 20..80。攻防越高，一次鼓出的火星越多，粒子按它发射。
 *   pulses  鼓动拍数：基础 2 + 等级/25；夹 2..4。等级越高，肌肉的节律多鼓几下，画面按它拍。
 *   tempo   起手：基础 9 刻 − 速度×0.03；夹 5..13。越快的个体绷紧越快。
 *   aftercast 收招：基础 6 刻 + 碰撞箱高度×1.4；夹 6..11。
 *   wait    冷却：基础 130 刻 − 等级×0.6；夹 85..160。等级越高越熟练。本族最高 PP 20 的代价。
 * 配置 lean（取向）双向取舍：偏攻＝物攻 +2／防御 +1，适合压着打；偏守＝防御 +2／物攻 +1，适合顶着换。
 *   两向总量相同、各有局面，没有净收益更大的一侧。
 */
namespace PokemonSkills {
    actionParameters.define("bulkup", {
        /** 物攻等级：偏攻 2 级／偏守 1 级。 */
        power: formula(
            F.when(F.pref("lean", text("worldcombat.skill.bulkup.preference.lean")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "物攻等级", {
                unit: " 级",
                description: "健美把物攻抬高多少级；偏攻 2 级，偏守 1 级。"
            }),
        /** 防御等级：偏守 2 级／偏攻 1 级。 */
        guard: formula(
            F.when(F.pref("lean", text("worldcombat.skill.bulkup.preference.lean")), F.const(1), F.const(2)).clamp(1, 2).round(0),
            "防御等级", {
                unit: " 级",
                description: "健美把防御抬高多少级；偏守 2 级，偏攻 1 级。"
            }),
        /** 涨身窗口：等级决定这口气撑多久。 */
        window: seconds(
            F.base(260).plus(F.level().times(3)).clamp(220, 520).round(0),
            "涨身窗口", "涨起来的身形撑多久；等级越高越久。窗口走完或被清除时，两项等级一起收回。"),
        /** 涨起半径：体型越大气场铺得越开。 */
        swell: formula(
            F.base(0.9).plus(F.body("width").times(0.8)).plus(F.body("height").times(0.15)).clamp(0.8, 2.2).round(2),
            "涨起半径", {
                unit: " 格",
                description: "绷紧时气场从身上鼓开的半径，也是表现里气环的范围；体型越大铺得越开。"
            }),
        /** 气浪火星量：攻防越高越多。 */
        sparks: formula(
            F.base(22).plus(F.stat("attack").plus(F.stat("defence")).div(8)).clamp(20, 80).round(0),
            "气浪火星量", {
                unit: " 点",
                description: "一次鼓身掀起的火星数量；物攻与防御越高越多，粒子按它发射。"
            }),
        /** 鼓动拍数：等级越高多鼓几下。 */
        pulses: formula(
            F.base(2).plus(F.level().div(25)).clamp(2, 4).round(0),
            "鼓动拍数", {
                unit: " 拍",
                description: "绷紧时鼓动几拍；等级越高拍数越多，画面按它一下下推开气环。"
            }),
        /** 起手：速度决定绷紧多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.03)).clamp(5, 13).round(0),
            "起手", "把全身绷到极限需要多久；速度越快越短。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.4)).clamp(6, 11).round(0),
            "收招", "松劲之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(130).minus(F.level().times(0.6)).clamp(85, 160).round(0),
            "冷却", "两次健美之间的等待；等级越高越短。PP 20 的代价，本族里最长。")
    });

    stages("bulkup", [
        { level: 30, values: { window: 320, wait: 112 } },
        { level: 50, values: { window: 400, wait: 96 } }
    ]);

    describe("bulkup", [
        { key: "description.0", values: ["power", "guard"] },
        { key: "lean.on", values: [], when: function (context) { return read(context.detail.values, ["lean"]) === 1; } },
        { key: "lean.off", values: [], when: function (context) { return read(context.detail.values, ["lean"]) !== 1; } },
        { key: "description.1", values: ["window"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
