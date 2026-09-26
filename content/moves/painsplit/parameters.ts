/**
 * 分担痛楚 / painsplit —— 第 111 组「持有物与生命的双向交换」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：一般、变化、PP 20、必中、保护；把自己的 HP 与对手的 HP 相加，
 *   再向两边均分（Showdown 取 floor((双方HP之和)/2)，最低 1）。它不改能力、不上状态，只把两边的生命拉平。
 * - 即时翻译：一条「痛线」——施法者在两者之间牵起一条细红线。结算先对生命较高的一方申请一次不致死的原生减量，
 *   读回实际失血，再按这份实际失血给生命较低的一方原生治疗（最多补到本次平均值、不超过其最大生命）。
 *   所以抽不动血就没有回填，无论对谁都是同一个目标平均值，它既可能是回复也可能是自损，一分不能致死，两边都至少留 1 点。
 * - 参数分散到精灵数据：牵线射程取特攻与等级，起手与收手取速度，冷却取等级；痛线上的流动粒子数基准由体型与等级派生
 *   （`data.flow` 再按本次实际失血相对双方较大上限的比例放大），真正抽到的血越多，画面里的流动越密。
 *
 * 没有伤害段：这是变化招式，结算只对较高一方做一次可被原生命中管线拒绝的抽血，不经过属性、相性与暴击。
 */
namespace PokemonSkills {
    actionParameters.define("painsplit", {
        /** 牵线时间：基础 7 刻，速度每比 60 快 1 少 0.02 刻，夹在 3..10 刻。 */
        link: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 1.5)).clamp(3, 10).round(0),
            "牵线时间", "在两者之间牵起痛线、看清两团生命所需的起手；手快的个体牵得更利落。"),
        /** 痛线长度：基础 5 格，特攻每比 60 多 1 加 0.03 格（夹 -0.8..+2.0），等级 30 起每级加 0.01（上限 +1.2）；夹在 3..8.5 格。 */
        reach: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-0.8, 2.0))
                .plus(F.level().minus(30).max(0).times(0.01).clamp(0, 1.2)).clamp(3, 8.5).round(2),
            "痛线长度", {
                unit: "格",
                description: "从自己到目标牵起痛线的距离；特攻与等级越高的个体够得越远。"
            }),
        /** 收线：基础 7 刻，速度每比 60 快 1 少 0.02 刻，夹在 3..10 刻。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 1.5)).clamp(3, 10).round(0),
            "收线时间", "痛线分开、生命落定后把手收回来的时间；手快的个体收得更利落。"),
        /** 冷却：基础 24 刻 + 等级 ×0.25，夹在 18..48 刻。 */
        cooldown: seconds(
            F.base(24).plus(F.level().times(0.25)).clamp(18, 48).round(0),
            "冷却", "再次牵线前的等待；等级越高略长。"),
        /** 流动粒子数：基础 12，等级 30 起每级加 0.1（上限 +8），高度每比 1.4 高 1 格加 4；夹在 8..28 颗。 */
        motes: formula(
            F.base(12).plus(F.level().minus(30).max(0).times(0.1).clamp(0, 8))
                .plus(F.body("height").minus(1.4).times(4).clamp(-3, 10)).clamp(8, 28).round(0),
            "流动粒子数", {
                unit: "颗",
                description: "痛线上流动的光点基准数量；等级越高、身板越高越多，实际发射量再按本次真正抽到的生命相对双方较大上限的比例放大。"
            }),
        /** 最低生命：无论怎么平分，两边都至少留下这么多生命（原生最低 1）。 */
        floor: hidden(1)
    });

    stages("painsplit", [
        { level: 26, values: { reach: 5.8, cooldown: 22 } },
        { level: 46, values: { reach: 6.6, motes: 18 } }
    ]);

    describe("painsplit", [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["link", "recover", "cooldown"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}
