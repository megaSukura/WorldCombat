/**
 * 甩肉 / filletaway 的参数与描述。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Status、Normal、PP 10；生命不足一半不能使用；削掉最大生命的一半，
 * 把攻击、特攻、速度各提高 2 级。
 *
 * 翻译：一刀削身，把血肉真的甩进世界（掉落物），剩下的身体更轻、更快、更凶。代价由配置 depth 决定
 * （标准=原生的一半、全力=削得更深），提升等级随之从 +2 到 +3；甩出的血肉块数由**体重**决定、
 * 甩散半径由**碰撞箱高度**决定——重的个体削下的更多、甩得更远，这是同招不同精灵最直观的画面差异。
 * 无伤害段：只削自己、不伤对手。
 */
namespace PokemonSkills {
    actionParameters.define("filletaway", {
        /** 生命代价：配置 depth 直接决定；标准对位原生的一半。 */
        cost: formula(
            F.when(F.pref("depth").gt(0.55), F.const(0.65), F.const(0.5)),
            "生命代价", {
                base: 0.5, presentation: "percent", format: function (value: number) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "从施法者最大生命里扣除的比例；削得越深越危险，换来的提升也越多。"
            }),
        /** 提升等级：攻击、特攻、速度各提高多少级。 */
        levels: formula(
            F.when(F.pref("depth").gt(0.55), F.const(3), F.const(2)),
            "提升等级", {
                base: 2, unit: "级",
                description: "攻击、特攻、速度各提高的等级；全力削肉提到 3 级。"
            }),
        /** 血肉块数：体重越大削下的越多。 */
        chunks: formula(
            F.base(3).plus(F.body("weight").div(25)).clamp(3, 10).round(0),
            "血肉块数", {
                base: 3, unit: "块",
                description: "甩进世界的血肉块数；体重越大画面里的块数越多。"
            }),
        /** 甩出速度：体重越大甩得越远。 */
        fling: formula(
            F.base(0.35).plus(F.body("weight").div(400)).clamp(0.3, 0.6).round(3),
            "甩出速度", {
                base: 0.35, unit: "格/刻",
                description: "血肉块离体时的速度；重个体甩得更远。"
            }),
        /** 散落半径：甩出的范围。 */
        scatter: formula(
            F.base(1.6).plus(F.body("height").times(0.4)).clamp(1.2, 3).round(2),
            "散落半径", {
                base: 2.16, unit: "格",
                description: "血肉甩散的范围；碰撞箱越高铺得越开。"
            })
    });

    stages("filletaway", [
        { level: 30, values: { prepare: 6, recover: 9, cooldown: 78 } },
        { level: 50, values: { prepare: 5, recover: 7, cooldown: 66 } }
    ]);

    describe("filletaway", [
        { key: "description.0", values: ["cost","levels"] },
        { key: "requirement", values: [] },
        { key: "description.1", values: ["chunks","fling","scatter"] },
        { key: "timing", values: ["prepare","recover","cooldown"] }
    ]);
}
