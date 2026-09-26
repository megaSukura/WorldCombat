/**
 * 迁怒 / frustration — 参数与伤害段。
 *
 * 原生事实：一般、物理、命中 100、PP 20、接触、无次要效果；威力回调为 (255 − 亲密度) × 10 / 25，
 * 即亲密度越低越强（0..102）（Cobblemon 1.8，742 位学习者）。
 *
 * 翻译：把「亲密度越低威力越大」翻成即时战斗里的一件事——**憋着的不满一次全抓出来**。亲密度是这招的读数：
 * 低亲密度让抓击更重、次数更多、间隔更短，读出来的东西全部经由参数与伤害结算，再传到表现。
 * 它是本组的「连抓」成员：贴近后连续几爪，每爪都是一段独立伤害，因此段名用 rake（单次抓击）而不是 power；
 * 总伤害 = rake × rakes。同族的报恩是同一读数、相反方向的单次重击，两者靠「多段快抓」与「一次清洁重击」分开。
 *
 * 数据分散：rake 读亲密度与攻击；rakes 读亲密度缺口与速度；lunge/pressSpeed 读速度；push 读体重；
 * collisionRadius 读体型；pace 读速度。配置 vent（发泄式）把多而轻的连抓换成少而重的猛抓：
 * 每爪更重、但次数更少、起手与冷却更久——两种打法各有适用场面。
 */
namespace PokemonSkills {
    actionParameters.define("frustration", {
        /** 单次抓击威力：基础 15，亲密度缺口（255 − 亲密度，取 0..255）× 0.085（上限 +22），攻击每比 55 多 1 加 0.16（夹 −6..+16），等级每高 1 加 0.2（夹 −3..+8）；发泄 ×1.28、连抓 ×0.92；夹在 9..62。 */
        rake: formula(
            F.base(15)
                .plus(F.const(255).minus(F.individual("friendship", text("worldcombat.skill.frustration.value.friendship")))
                    .times(0.085).clamp(0, 22).as(text("worldcombat.skill.frustration.value.grudge")))
                .plus(F.stat("attack").minus(55).times(0.16).clamp(-6, 16).as(text("worldcombat.skill.frustration.value.force")))
                .plus(F.level().minus(20).times(0.2).clamp(-3, 8).as(text("worldcombat.value.level")))
                .times(F.when(F.pref("vent", text("worldcombat.skill.frustration.preference.vent")), F.const(1.28), F.const(0.92)))
                .clamp(9, 62).round(1),
            "单次抓击威力", {
                unit: "威力",
                description: "每一爪造成的威力；亲密度越低这一爪越狠，攻击给出狠度。总伤害等于这一爪乘以抓击次数。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抓击次数：基础 2，亲密度缺口比例（0..1）每 1 加 1.1（上限 +1.1），速度每比 60 快 1 加 0.006（夹 −0.3..+0.5），发泄式 −1；夹在 1..4 并向下取整。 */
        rakes: formula(
            F.base(2)
                .plus(F.const(255).minus(F.individual("friendship", text("worldcombat.skill.frustration.value.friendship")))
                    .div(255).clamp(0, 1).times(1.1).as(text("worldcombat.skill.frustration.value.grudge")))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.3, 0.5).as(text("worldcombat.skill.frustration.value.tempo")))
                .plus(F.when(F.pref("vent", text("worldcombat.skill.frustration.preference.vent")), F.const(-1), F.const(0)))
                .clamp(1, 4).round(0),
            "抓击次数", {
                unit: "次",
                description: "一口气抓几下；亲密度越低、身法越快抓得越多。发泄式改成少而重的猛抓，次数反而更少。"
            }),
        /** 亲密度缺口：1 − 亲密度 / 255，夹在 0..1。它是本招所有强度项的读数来源，也用于表现强度。 */
        deficit: percent(
            F.const(255).minus(F.individual("friendship", text("worldcombat.skill.frustration.value.friendship")))
                .div(255).clamp(0, 1).round(3),
            "亲密度缺口", "亲密度越低这个值越大；它同时放大单爪威力、抓击次数与画面强度，是这招「越大越凶」的根。"),
        /** 扑近距离：基础 2.0 格，速度每比 55 多 1 加 0.018（夹 −0.3..+1.2），发泄 ×1.08；夹在 1.6..3.4。它同时是实际射程来源。 */
        lunge: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.3, 1.2))
                .times(F.when(F.pref("vent", text("worldcombat.skill.frustration.preference.vent")), F.const(1.08), F.const(1)))
                .clamp(1.6, 3.4).round(2),
            "扑近距离", {
                unit: "格",
                description: "从起步到贴住对手的总位移；腿快的个体扑得更远。"
            }),
        /** 扑近速度：基础 0.62 格/刻，速度每比 55 多 1 加 0.004（夹 −0.1..+0.3）；夹在 0.45..1.0。 */
        pressSpeed: formula(
            F.base(0.62).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.3)).clamp(0.45, 1.0).round(2),
            "扑近速度", {
                unit: "格/刻",
                description: "贴身时每刻前进的距离；越快越难被对手在这段里走开。"
            }),
        /** 抓击间隔：基础 5 刻，速度每比 60 快 1 少 0.02 刻（夹 −1..+1），发泄 +2；夹在 2..7 刻。 */
        pace: formula(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1))
                .plus(F.when(F.pref("vent", text("worldcombat.skill.frustration.preference.vent")), F.const(2), F.const(0)))
                .clamp(2, 7).round(0),
            "抓击间隔", {
                unit: "刻",
                description: "两爪之间停多久；身法快的连抓更密。发泄式每爪之间停顿更久，因为每爪都在蓄力。"
            }),
        /** 每爪顶开：基础 0.22 格，体重每比 50 重 1 加 0.002（夹 −0.05..+0.5）；夹在 0.08..0.7。中间爪不推开，最后一爪把它 × 抓击次数一次送出。 */
        push: formula(
            F.base(0.22).plus(F.body("weight").minus(50).times(0.002).clamp(-0.05, 0.5)).clamp(0.08, 0.7).round(2),
            "每爪积累顶开", {
                unit: "格",
                description: "每一爪为最后一推积累的顶开量；中间爪只贴身不推开，最后一爪把这笔积累乘上抓击次数一次性送给目标，总推力不变。"
            }),
        /** 判定半径：基础 0.4 格，碰撞箱每比 1.4 高 1 格加 0.12；夹在 0.28..0.75。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.28, 0.75).round(2),
            "判定半径", {
                unit: "格",
                description: "每一爪的横向判定半径；身板越大抓得越宽。"
            }),
        reachAhead: hidden(1.0),
        minimumMove: hidden(0.05)
    });

    defineDamage("frustration", "rake", { defenceCoefficient: 0.005 }, { contact: true });

    describe("frustration", [
        { key: "description.0", values: ["rake","rakes","deficit"] },
        { key: "description.1", values: ["lunge","pressSpeed","pace","collisionRadius"] },
        { key: "description.2", values: ["push"] },
        { key: "vent.on", values: [], when: function (context) { return read(context.detail.values, ["vent"]) === true; } },
        { key: "vent.off", values: [], when: function (context) { return read(context.detail.values, ["vent"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
