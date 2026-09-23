/**
 * 燕返 / aerialace 的参数与伤害段。
 *
 * 原生事实：Flying、物理、威力 60、命中必定（accuracy true）、PP 20、接触、劈斩（slicing）、
 * 可及远（distance），无次要效果（Cobblemon 1.8）。
 * 翻译：把「以敏捷的动作戏弄对手后进行切斩，攻击必定命中」翻成一次**贴身穿过的掠袭**——施法者一步掠到对手身上，
 * 掠过的路径本身就是刀路；因为人是朝对手冲过去的，刀必中。掠过时按速度交叉切若干刀，切完落在对手身后。
 * 数据分散：物攻定单刀威力、速度定掠袭距离与飞行速度、速度还定刀数（快者切得更多）、体型高度定刀路宽度、
 * 等级定成长。
 * 配置 skim（低掠）切削路径的取舍：压低身子掠得更宽（刀路宽、射程拉长），但单刀更轻、起手与冷却更长。
 *
 * 伤害段：slash 是掠过时的一刀；cuts 决定这一刀重复几次。
 */
namespace PokemonSkills {
    actionParameters.define("aerialace", {
        /** 单刀威力：物攻每比 60 多 1 加 0.1，低掠 ×0.82、高掠 ×1.16，夹在 18..58。 */
        slash: formula(
            F.base(30).plus(F.stat("attack").minus(60).times(0.1))
                .times(F.when(F.pref("skim"), F.const(0.82), F.const(1.16)))
                .clamp(18, 58).round(1),
            "单刀威力", {
                unit: "威力",
                description: "掠过时每一刀造成的威力；物攻越高刀越利。低掠把力分摊到更宽的刀路，单刀更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 刀数：基础 2，速度每比 60 快 1 加 0.012，夹在 2..3 并向下取整。 */
        cuts: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.012)).clamp(2, 3).floor(),
            "刀数", {
                unit: "刀",
                description: "掠过一次交叉切几刀；速度快的个体出手更密。刀数同时决定画面里的刀光条数。"
            }),
        /** 掠袭距离：基础 5.2，速度每比 60 快 1 加 0.035，等级每比 30 高 1 加 0.03，低掠 ×0.85，夹在 3.6..8.4。 */
        pursuit: formula(
            F.base(5.2).plus(F.stat("speed").minus(60).times(0.035)).plus(F.level().minus(30).times(0.03))
                .times(F.when(F.pref("skim"), F.const(0.85), F.const(1)))
                .clamp(3.6, 8.4).round(1),
            "掠袭距离", {
                unit: "格",
                description: "一步能掠到多远的对手；也是射程与指示线长度。速度与等级越高掠得越远。"
            }),
        /** 掠袭速度：基础 0.95 格/刻，速度每比 60 快 1 加 0.004，夹在 0.8..1.4。 */
        dashSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.8, 1.4).round(2),
            "掠袭速度", {
                unit: "格/刻",
                description: "掠过时每刻前进的速度；越快接触来得越早，对手越难在刀到之前挪开。"
            }),
        /** 刀路宽度：基础 0.55 格，碰撞箱每比 1.4 高 1 格加 0.12，低掠 ×1.4、高掠 ×0.85，夹在 0.4..0.95。 */
        laneWidth: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12))
                .times(F.when(F.pref("skim"), F.const(1.4), F.const(0.85)))
                .clamp(0.4, 0.95).round(2),
            "刀路宽度", {
                unit: "格",
                description: "掠过路径两侧的判定宽度；大个子刀刃划得更宽。低掠张开刀路以便同时扫到并排的人。"
            })
    });

    defineDamage("aerialace", "slash", {}, { contact: true, slice: true });

    stages("aerialace", [
        { level: 34, values: { slash: 36, cuts: 3 } },
        { level: 50, values: { slash: 46, pursuit: 7.2 } }
    ]);

    describe("aerialace", [
        { key: "description.0", values: ["cuts","slash"] },
        { key: "description.1", values: ["pursuit","dashSpeed","laneWidth"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slash", "tier.0.cuts"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slash", "tier.1.pursuit"] }
    ]);
}
