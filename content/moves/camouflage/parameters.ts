/**
 * 保护色 / camouflage — 参数与机制数值来源。
 *
 * 核心念头：蹲下去读脚下的这块地，把身体染成它的样子——属性由此改变。站在水里是水、草丛里是草、
 *   洞窟里是岩。配置「随景而变」时，走动中读到新的地面就再改一次，代价是可能被地形带进不利的属性。
 * 原生：Normal／变化／必中／PP 20／自身；在场地／地形上把自身属性改成对应属性，已经是该属性则不发动。
 * 即时化把「场所」读成 Minecraft 脚下的方块与流体（水、冰、草、沙土、岩、火与维度），
 *   属性落成共享 NativeModifiers types 层（与纹理、保护色同一套机制），到期自动还原原生属性。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   tempo     起手：速度决定蹲下读地多快。
 *   aftercast 收势：特防决定染完站得多稳。
 *   hold      覆色维持：等级与特防支撑这一层颜色维持多久。
 *   recharge  冷却：速度决定多久能再染一次。
 *   motes     色尘数：特攻决定身上浮起的同色微粒数量。
 *   fringe    毛边数：体型与体重决定轮廓上翻卷的碎屑数量。
 * 配置项 drift（随景而变／固色）：随景而变会在走动中重读地面、可能换属性，代价是冷却 +10 刻；
 *   固色一次定住、更便宜，但离开原地后属性不再贴合。适应性与稳定性互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("camouflage", {
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").minus(40).times(0.045).clamp(-2, 4.5).as("速度")).clamp(3, 10).round(),
            "起手", "蹲下读地所需时间；速度越快读得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(52).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "染完后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(200, "基础")
                .plus(F.level().times(4).as("等级"))
                .plus(F.stat("specialDefence").div(3).as("特防"))
                .clamp(140, 1200).round(),
            "覆色维持", "这层颜色维持多久；等级与特防越高越久。"),
        recharge: seconds(
            F.base(60, "基础").minus(F.stat("speed").times(0.24).as("速度")).clamp(28, 100).round(),
            "重新染色的冷却", "再染一次需要多久；速度快的个体更快恢复。", { base: 60 }),
        motes: formula(
            F.base(12, "基础").plus(F.stat("specialAttack").div(7).as("特攻")).clamp(12, 36).round(),
            "色尘数", { unit: "点", description: "身上浮起的同色微粒数量；特攻越高越密。" }),
        fringe: formula(
            F.base(8, "基础").plus(F.body("weight").div(9000).as("体重")).plus(F.body("height").minus(1.4).times(3).as("体型")).clamp(8, 24).round(),
            "毛边数", { unit: "片", description: "轮廓上翻卷的碎屑数量；体重越大、个头越高越明显。" })
    });

    stages("camouflage", [{ level: 35, values: { recharge: 50 } }, { level: 50, values: { recharge: 42 } }]);

    describe("camouflage", [
        { key: "description.0", values: ["tempo"] },
        { key: "description.materials", values: [] },
        { key: "description.1", values: ["hold"] },
        { key: "description.nature", values: [] },
        { key: "drift.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.drift); } },
        { key: "drift.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.drift); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
