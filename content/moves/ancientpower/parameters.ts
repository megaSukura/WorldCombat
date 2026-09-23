/**
 * 原始之力 / ancientpower —— 参数与伤害段。
 *
 * 原生事实：Rock／特殊／威力 60／命中 100／PP 5／目标单体／10% 概率让自身五项战斗能力各升 1 级。
 *
 * 翻译：把「用原始之力进行攻击」落成一记**从自身脚下轰开的原始冲击**——施法者把大地深处的古力
 * 按进地里，一圈琥珀色的古能贴着地面炸开、上顶成一个半球，把方圆之内的敌人（站地的和离地的都算，
 * 古力不是地震，不从地面缝隙里走）一起轰开，并在原地浮起一圈地缘符文。原生的「五项战斗能力提升」
 * 是这道力反涌回自身的结果：冲击散开的余波有概率灌回施法者，把攻击、防御、特攻、特防、速度一起抬 1 级。
 *
 * 与同族分开（同是「命中后反哺出手者」的余波族）：
 *   奇异之风是把幽风送到目标点再向内收拢；银色旋风是向前铺开一大扇鳞粉；彗星拳是贴身后砸下的拳。
 *   原始之力是唯一以自身为心、向四周轰开、连空中一起罩住的那一道。
 * 与 bulldoze 分开：重踏是贴地的一圈地裂、只打站在地上的、压下速度；原始之力是半球古能、空中也打、
 * 而且余波会反哺自身。两个人对放，一个向外扩的是地，一个向外扩的是光。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   primal       古力威力：特攻定这一轰的力度，等级定古力的厚。
 *   reach        冲击半径：碰撞箱宽度与特攻共同决定轰开多大一圈（也是本招射程）。
 *   band         作用高度：碰撞箱高度决定这半球向上向下罩多厚。
 *   push         外推距离：特攻决定把目标向外推多远。
 *   lift         上托距离：特攻决定把目标向上托多高（贴身者被托得更高）。
 *   surgeChance  反哺概率：特攻与等级共同决定，基础 10% 取自原生。
 *   surgeStages  反哺级数：固定 1 级，与原生一致。
 *   shards       碎片数：特攻与等级决定崩出的古石碎片数量，也驱动表现。
 *   runes        符文数：等级决定地面浮起的符文数量，也驱动表现。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 deep（深源式）双向取舍：开启＝冲击半径 ×0.82、威力 ×1.12、反哺概率 +0.05、起手与冷却更长；
 *   关闭（广域式，默认）＝覆盖更宽、外推更远、出手更快，但单点更轻。
 *
 * 伤害段 primal：古力轰开那一下随精灵数据变化的那部分。
 */

namespace PokemonSkills {
    actionParameters.define("ancientpower", {
        primal: formula(
            F.base(60)
                .plus(F.stat("specialAttack").minus(60).times(0.42).clamp(-14, 30))
                .plus(F.level().minus(28).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(0.96)))
                .clamp(48, 132).round(1),
            "古力威力", {
                unit: "威力",
                description: "古力轰开那一下的基础威力；特攻越高古力越沉，等级越高古力越厚。深源式把同样的力收进更小一圈，因此更重。对手防御、相性与暴击在命中时另算。"
            }),
        reach: formula(
            F.base(3.4)
                .plus(F.body("width").minus(0.9).times(1.1).clamp(-0.4, 1.4))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.5, 0.9))
                .times(F.when(F.pref("deep"), F.const(0.82), F.const(1.15)))
                .clamp(2.4, 5.6).round(2),
            "冲击半径", {
                unit: "格",
                description: "古能从脚下向外轰开的半径，也是本招的射程与画面范围；体型宽、特攻高的个体轰得更开，深源式收得更小。"
            }),
        band: formula(
            F.base(1.6)
                .plus(F.body("height").minus(1.4).times(1.0).clamp(-0.3, 1.2))
                .clamp(1.1, 2.8).round(2),
            "作用高度", {
                unit: "格",
                description: "古力半球在冲击点上方与下方各罩多厚；个子越高罩得越厚，个子矮的罩得更薄。"
            }),
        push: formula(
            F.base(0.8)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.2, 0.6))
                .times(F.when(F.pref("deep"), F.const(0.9), F.const(1.15)))
                .clamp(0.4, 1.8).round(2),
            "外推距离", {
                unit: "格",
                description: "被古力轰到的目标沿背离中心方向被推开多远；特攻越高推得越远，广域式推得更狠。"
            }),
        lift: formula(
            F.base(0.25)
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.25))
                .clamp(0.1, 0.6).round(2),
            "上托距离", {
                unit: "格",
                description: "被轰离地的高度；特攻越高托得越高，落回地面时还要再摔一下。"
            }),
        surgeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("deep"), F.const(0.05), F.const(0)))
                .clamp(0.06, 0.35).round(3),
            "反哺概率", "冲击散开的余波灌回自身、让五项战斗能力各升 1 级的概率；原生 10% 起，特攻与等级越高越容易抓住，深源式更稳。"),
        surgeTicks: seconds(F.base(120), "反哺持续", "本招的五项能力强化持续时间；再次触发刷新时间，保持一层。"),
        surgeStages: formula(
            F.base(1),
            "反哺级数", {
                unit: "级",
                description: "一次反哺让自身五项战斗能力各提升的能力等级。"
            }),
        shards: formula(
            F.base(18)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-4, 10))
                .plus(F.level().minus(28).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("deep"), F.const(1.2), F.const(1)))
                .clamp(16, 56).round(0),
            "碎片数", {
                unit: "块",
                description: "古能崩开时迸出的古石碎片数量，也驱动表现密度；特攻与等级越高越密，深源式更多。"
            }),
        runes: formula(
            F.base(8)
                .plus(F.level().minus(28).times(0.15).clamp(0, 8))
                .clamp(8, 18).round(0),
            "符文数", {
                unit: "道",
                description: "冲击那一圈地面浮起的地缘符文数量，也驱动表现；等级越高浮得越多。"
            }),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0))).clamp(7, 16).round(0),
            "起手", "把古力按进地里、轰开前的蓄势时间；速度越快越短，深源式多蓄一会儿。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(6, 14).round(0),
            "收招", "古力散尽后的收势；速度越快越短。"),
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("deep"), F.const(6), F.const(0))).clamp(24, 56).round(0),
            "冷却", "两次唤古之间的等待；速度越快回得越快，深源式缓得更久。")
    });

    defineDamage("ancientpower", "primal", {});

    stages("ancientpower", [
        { level: 38, values: { primal: 74, reach: 3.8 } }
    ]);

    describe("ancientpower", [
        { key: "description.0", values: ["primal","reach"] },
        { key: "description.1", values: ["push","lift"] },
        { key: "description.2", values: ["surgeChance","surgeStages","surgeTicks"] },
        { key: "description.3", values: ["band"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.primal", "tier.0.reach"] }
    ]);
}
