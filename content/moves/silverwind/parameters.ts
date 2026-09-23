/**
 * 银色旋风 / silverwind —— 参数与伤害段。
 *
 * 原生事实：Bug／特殊／威力 60／命中 100／PP 5／目标单体／10% 概率让自身五项战斗能力各升 1 级。
 *
 * 翻译：把「在风中掺入鳞粉攻击对手」落成一记**向前铺开、缓缓飘动的一大扇银鳞**——施法者抖翅，鳞粉被风
 * 推成一片扇形向前铺开，慢慢往前飘；站在扇面里的敌人各被割一下。鳞粉是实物，挡不住、也穿不过墙，
 * 飘完就落下，不留场。原生的「五项战斗能力提升」是回旋的鳞粉落在自己身上的结果：扇面里回卷的一撮鳞粉
 * 有概率把攻击、防御、特攻、特防、速度一起抬 1 级。
 *
 * 与同族分开（同为「命中后反哺出手者」的余波族）：原始之力以自身为心、原地向外轰开；奇异之风奔袭到目标点
 *   再向内收拢；彗星拳是贴身的重拳。银色旋风是唯一**向前铺开一扇、可以一次割到并排几个人**的那一道。
 * 与 bugbuzz 分开：虫鸣是一道声波锥（瞬时、近强远弱、可绕墙、降特防）；银色旋风是一扇会飘的实物鳞粉
 *   （看得见、走得慢、会被掩体挡住、余波反哺自身）。一个人被锥穿和一片人被鳞粉扫过，画面完全不同。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   gale         风威：特攻定这一扫的力度，等级定鳞粉的密。
 *   reach        扇面长度：特攻决定这扇鳞粉能铺多远（本招射程）。
 *   span         扇面张角：碰撞箱宽度决定铺开多宽，体型宽的扇得更开。
 *   drift        飘散时间：特攻决定鳞粉在空气里飘多久再落，也决定对手有多少时间走出扇边。
 *   scales       鳞粉数：特攻与等级决定扇里的鳞粉量，也驱动表现。
 *   surgeChance  反哺概率：特攻与等级共同决定，基础 10% 取自原生。
 *   surgeStages  反哺级数：固定 1 级，与原生一致。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 dense（浓鳞式）双向取舍：开启＝扇面短而窄（长度 ×0.82、张角 ×0.8）、威力 ×1.1、反哺概率 +0.05，
 *   冷却更长；关闭（疏鳞式，默认）＝铺得更远更宽、出手更快，但单点更轻。
 *
 * 伤害段 gale：鳞粉扇扫过那一下随精灵数据变化的那部分。
 */

namespace PokemonSkills {
    actionParameters.define("silverwind", {
        gale: formula(
            F.base(60)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-14, 30))
                .plus(F.level().minus(28).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("dense"), F.const(1.1), F.const(0.95)))
                .clamp(48, 132).round(1),
            "风威", {
                unit: "威力",
                description: "鳞粉扇扫过那一下的基础威力；特攻越高鳞粉越利，等级越高鳞粉越密。浓鳞式把鳞粉收进更小一扇，因此更重。对手特防、相性与暴击在命中时另算。"
            }),
        reach: formula(
            F.base(7.5).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 3.5))
                .times(F.when(F.pref("dense"), F.const(0.82), F.const(1.12)))
                .clamp(6, 11).round(1),
            "扇面长度", {
                unit: "格",
                description: "这扇鳞粉向前铺多远；特攻越高铺得越远。它也是本招的实际射程来源，浓鳞式收得更短。"
            }),
        span: formula(
            F.base(70).plus(F.body("width").minus(0.9).times(20).clamp(-8, 24))
                .times(F.when(F.pref("dense"), F.const(0.8), F.const(1.1)))
                .clamp(50, 120).round(0),
            "扇面张角", {
                unit: "度",
                description: "鳞粉扇铺开的总张角；体型宽的个体扇得更开，浓鳞式收得更窄，更容易只罩住点名的一个方向。"
            }),
        drift: seconds(
            F.base(1.2).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.2, 0.8)).clamp(0.8, 2.0).round(2),
            "飘散时间", "鳞粉从翅上抖出到落地消散的时间；特攻越高飘得越久，对手也更有机会走出扇边——这是这招可被读出的反制窗口。"),
        scales: formula(
            F.base(26)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-6, 12))
                .plus(F.level().minus(28).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("dense"), F.const(1.15), F.const(1)))
                .clamp(20, 72).round(0),
            "鳞粉数", {
                unit: "片",
                description: "扇面里铺开的鳞粉数量，也驱动表现密度；特攻与等级越高越密，浓鳞式更多。"
            }),
        surgeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("dense"), F.const(0.05), F.const(0)))
                .clamp(0.06, 0.35).round(3),
            "反哺概率", "回卷的鳞粉落在自身、把五项战斗能力各抬 1 级的概率；原生 10% 起，特攻与等级越高越容易抓住，浓鳞式更稳。"),
        surgeTicks: seconds(F.base(100), "反哺持续", "本招的五项能力强化持续时间；再次触发刷新时间，保持一层。"),
        surgeStages: formula(
            F.base(1),
            "反哺级数", {
                unit: "级",
                description: "一次反哺让自身五项战斗能力各提升的能力等级。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("dense"), F.const(2), F.const(0))).clamp(6, 15).round(0),
            "起手", "抖翅把鳞粉聚到翅缘、扇出去前的蓄势时间；速度越快越短，浓鳞式多蓄一会儿。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(6, 14).round(0),
            "收招", "鳞粉散尽后的收势；速度越快越短。"),
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("dense"), F.const(6), F.const(0))).clamp(20, 52).round(0),
            "冷却", "两次抖翅之间的等待；速度越快回得越快，浓鳞式缓得更久。")
    });

    defineDamage("silverwind", "gale", {});

    stages("silverwind", [
        { level: 38, values: { gale: 74, reach: 8.4 } }
    ]);

    describe("silverwind", [
        { key: "description.0", values: ["gale", "reach"] },
        { key: "description.1", values: ["span"] },
        { key: "description.2", values: ["surgeChance", "surgeStages", "surgeTicks"] },
        { key: "description.3", values: ["pref.dense"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gale", "tier.0.reach"] }
    ]);
}
