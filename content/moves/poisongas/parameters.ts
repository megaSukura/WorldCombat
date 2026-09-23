/**
 * 毒瓦斯 / poisongas 的参数与伤害段。
 *
 * 原生事实：Poison、变化、威力 0、命中 90、PP 40、可同时作用多个相邻目标，命中后中毒（Cobblemon 1.8）。
 * 翻译：把“把毒瓦斯吹到对手脸上”翻成一片**留在世界里的低垂毒云**——施法者朝选定的点喷出瓦斯，
 * 瓦斯落地成云，云里的人会中毒，站在里面就一直被维持毒素；走出云外毒素按自己的时间走完。
 * 云还会被火点着：云里有人带着灼伤、或云下压着火/岩浆，整片云爆燃，把里面的人烧伤并炸开一次。
 * 数据分散：覆盖半径随**体重**（吐出多少气）、云的存在时长随**等级**、施加的中毒时长随**特攻**、
 * 爆燃威力与同时作用的人数随**特攻**与**等级**、喷吐距离随**等级**。配置 dense（浓稠取向）用更小的覆盖换更久更浓的云。
 *
 * 爆燃段叫 blast；公式即最终值，执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("poisongas", {
        /** 喷吐距离：基础 8 格，30 级起每级 +0.08，夹在 6..12。 */
        reach: formula(
            F.base(8).plus(F.level().minus(30).times(0.08)).clamp(6, 12).round(1),
            "喷吐距离", {
                unit: "格",
                description: "瓦斯能够吹到的最远点；等级越高够得越远。"
            }),
        /** 覆盖半径：基础 2.4 格，体重每比 60 多 10 加 0.1；浓稠 ×0.8 / 稀薄 ×1.15；夹在 1.6..4.0。 */
        cloudRadius: formula(
            F.base(2.4).plus(F.body("weight").minus(60).times(0.01).clamp(-0.5, 1.2))
                .times(F.when(F.pref("dense"), F.const(0.8), F.const(1.15)))
                .clamp(1.6, 4.0).round(2),
            "覆盖半径", {
                unit: "格",
                description: "毒云在地面上的覆盖半径；体重越大吐出的气越多，云越宽。"
            }),
        /** 云存在时长：基础 160 刻，30 级起每级 +4；浓稠 ×1.4 / 稀薄 ×0.8；夹在 110..400。 */
        cloudTicks: seconds(
            F.base(160).plus(F.level().minus(30).max(0).times(4))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(0.8)))
                .clamp(110, 400).round(0),
            "云存在时长", "一片毒云在世界上停留多久；浓稠取向留得更久。"),
        /** 中毒时长：基础 200 刻，特攻每比 80 高 1 加 1.2；浓稠 ×1.4 / 稀薄 ×0.8；夹在 140..400。 */
        poisonTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(80).times(1.2).clamp(-40, 120))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(0.8)))
                .clamp(140, 400).round(0),
            "中毒时长", "离开毒云后毒素还会持续多久；特攻越高毒性越持久。"),
        /** 灼伤时长：基础 300 刻，30 级起每级 +4，夹在 240..420；毒云爆燃时点着的火持续多久。 */
        burnTicks: seconds(
            F.base(300).plus(F.level().minus(30).max(0).times(4)).clamp(240, 420).round(0),
            "灼伤时长", "毒云被点着时，云里的人会灼伤多久。"),
        /** 爆燃威力：基础 40，特攻每比 80 高 1 加 0.3；浓稠 ×1.2；夹在 25..75。 */
        blast: formula(
            F.base(40).plus(F.stat("specialAttack").minus(80).times(0.3).clamp(-15, 30))
                .times(F.when(F.pref("dense"), F.const(1.2), F.const(1)))
                .clamp(25, 75).round(1),
            "爆燃威力", {
                unit: "威力",
                description: "毒云被点着时那一下爆燃的威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 同时作用人数：基础 4，30 级起每级 +0.06，夹在 3..8。 */
        maxTargets: formula(
            F.base(4).plus(F.level().minus(30).max(0).times(0.06)).clamp(3, 8).round(0),
            "同时作用人数", { base: 4,
                unit: "人",
                description: "每次扫描最多让几个人中毒；等级越高毒云罩得越多。"
            })
    });

    stages("poisongas", [
        { level: 20, values: { maxTargets: 3 } },
        { level: 40, values: { maxTargets: 6 } }
    ]);

    defineCategory("poisongas", "special");
    defineDamage("poisongas", "blast", {});

    describe("poisongas", [
        { key: "description.0", values: ["reach", "cloudRadius"] },
        { key: "description.1", values: ["cloudTicks","poisonTicks","maxTargets"] },
        { key: "description.2", values: ["blast","burnTicks"] }
    ]);
}
