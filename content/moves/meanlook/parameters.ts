/**
 * 黑色目光 / meanlook — 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中必中／PP 5／单体；命中即让目标 trapped（无法逃走、无法换人）。
 * 原生介绍「用好似要勾人心魂的黑色目光一动不动地凝视对手，使其不能从战斗中逃走。」学习者 51。
 *
 * 世界化：把「一动不动地凝视」落成**一条只靠视线维持的锁**——术者站定不动、把目光钉在目标身上，
 *   目标被完全钉在原地；术者一被打断、被掩体挡住视线、或目标被外力拽出 `leash` 之外，目光就断，
 *   目标立刻恢复自由。它是本族唯一**由术者持续维持**的一招：锁在术者身上，不在目标身上。
 *   这正是它天然的代价——术者在这段时间里既不能移动也不能出手，只能瞪。
 *
 * 与同族分开：挡路在目标背后立一堵实墙（墙在退路就不在）；蛛网把目标缠成茧（术者可以走开，火能烧开）；
 *   黑色目光把术者自己钉在原地当锁，术者一松劲就散。
 *
 * 数据分散（每项读不同精灵数据，落到不同参数）：
 *   hold       凝视时长：特防与等级决定能撑多久不眨眼；深凝视再拉长。
 *   leash      绷断距离：特攻决定目光能拉住多远；深凝视更结实。
 *   gazeRange  施放距离：特攻决定能在多远开始凝视；深凝视要贴近一点。
 *   strands    目光道数：特攻换算，驱动画面里视线束的密度。
 *   grip       目光压强：体重换算，决定目标脚下那圈黑光画多大。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏。
 *
 * 配置 `deep`（深凝视）双向取舍（默认关）：
 *   开（深凝视）：凝视时长 ×1.4、绷断距离 +1 格；代价是起手 +3 刻、冷却 +15 刻、施放距离 −1 格——锁得更久更牢，但更慢更近。
 *   关（快锁）：起手快、距离远、冷却短；代价是锁得更短、更容易被拽断。
 */
namespace PokemonSkills {
    actionParameters.define("meanlook", {
        /** 凝视时长：100 + 特防 ×0.5 + 等级 ×2；深凝视 ×1.4；夹 80..300。 */
        hold: seconds(
            F.base(100).plus(F.stat("specialDefence").times(0.5)).plus(F.level().times(2))
                .times(F.when(F.pref("deep", text("worldcombat.skill.meanlook.preference.deep")), F.const(1.4), F.const(1.0)))
                .clamp(80, 300).round(0),
            "凝视时长", "目光能维持多久不眨；特防与等级越高撑得越久，深凝视再拉长。术者一被打断或失去视线就提前断开。"),
        /** 绷断距离：5 + (特攻 −60) ×0.03 + 深凝视 1；夹 4..9。 */
        leash: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.03))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.meanlook.preference.deep")), F.const(1), F.const(0)))
                .clamp(4, 9).round(1),
            "绷断距离", {
                unit: "格",
                description: "目标被外力（击退、拉拽、传送）拽离术者超过这个距离，目光就断、锁定解除。"
            }),
        /** 施放距离：7 + (特攻 −60) ×0.02 − 深凝视 1；夹 6..10。 */
        gazeRange: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.02))
                .minus(F.when(F.pref("deep", text("worldcombat.skill.meanlook.preference.deep")), F.const(1), F.const(0)))
                .clamp(6, 10).round(1),
            "施放距离", {
                unit: "格",
                description: "能在多远开始凝视目标；特攻越高够得越远，深凝视要贴近一点。它也是本招的实际射程。"
            }),
        /** 目光道数：4 + 特攻 ÷30；夹 3..9。 */
        strands: formula(
            F.base(4).plus(F.stat("specialAttack").div(30)).clamp(3, 9).round(0),
            "目光道数", {
                unit: "道",
                description: "用来钉住目标的视线束道数；特攻越高越密，画面里的黑光也随之增减。"
            }),
        /** 目光压强：6 + 体重 ÷30；夹 5..16。 */
        grip: formula(
            F.base(6).plus(F.body("weight").div(30)).clamp(5, 16).round(1),
            "目光压强", {
                unit: "格",
                description: "目光钉在目标身上有多重；体重越大那片黑光铺得越开，是表现里地面黑圈的参考尺寸。"
            }),
        /** 起手：8 − (速度 −60) ×0.03 + 深凝视 3；夹 6..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.meanlook.preference.deep")), F.const(3), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把目光聚成一道黑光需要多久；速度越快越短，深凝视要多定一会儿。"),
        /** 收招：6 + (身高 −1.4) ×0.8；夹 5..11。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 11).round(0),
            "收招", "松开目光后的收势；身量越大收得越慢。"),
        /** 冷却：150 − (等级 −30) ×0.5 + 深凝视 15；夹 110..200。 */
        recharge: seconds(
            F.base(150).minus(F.level().minus(30).max(0).times(0.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.meanlook.preference.deep")), F.const(15), F.const(0)))
                .clamp(110, 200).round(0),
            "冷却", "两次凝视之间的等待；等级越高越熟练，深凝视更费。PP 5 的代价。")
    });

    stages("meanlook", [
        { level: 45, values: { hold: 200, recharge: 120 } }
    ]);

    describe("meanlook", [
        { key: "description.0", values: ["hold", "leash"] },
        { key: "description.gaze", values: [] },
        { key: "description.1", values: ["gazeRange"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hold", "tier.0.recharge"] }
    ]);
}
