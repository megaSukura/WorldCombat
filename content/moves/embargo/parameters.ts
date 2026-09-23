/**
 * 查封 / embargo —— 第 159 组「资源线的封锁与转手」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：恶、变化、威力 —、命中 100、PP 15、单体；
 *   `volatileStatus: embargo`，持续 5 回合：目标不能使用携带的道具，训练家也不能再给它道具。
 * - 即时战斗翻译：一枚会跟着目标走的查封印记。命中后印记扣在目标的道具位上一段时间——道具的轮廓还在，
 *   力量却传不出来；这段时间里它既用不了、也收不到新的道具。单体、跟随、短而狠，是专门冲着“带物”的对手去的。
 * - 与同组分开：回复封锁（healblock）封的是回血这条线；腐蚀气体（corrosivegas）是范围里当场溶毁；
 *   传递礼物（bestow）是把自己的道具送出去。查封只封住目标一个人的道具通道，道具本身仍在（不是拍掉、不是熔化）。
 * - 与魔法空间（magicroom，另一组）分开：魔法空间是一片落地的区域、对双方一视同仁、封的是“道具效果”；
 *   查封是一个跟着单个目标走的印记、只封它一个、还封住“收到道具”这条路。
 *
 * 参数分散到精灵数据：时长取等级（熟练）与特攻（封印强度），射程取体型高度与等级，印记速度取速度，
 * 印记大小取体型高度，起手取速度，收招收特防，冷却取等级，锁环数取特攻，封条数取等级。配置 deep 双向取舍。
 * 本招不造成伤害。
 */
namespace PokemonSkills {
    actionParameters.define("embargo", {
        /** 封锁时长：基础 200 刻；等级每级 +2.2（夹 44..176），特攻每 1 点 +0.9（夹 18..108）；
         *  deep 开 ×1.35、关 ×0.75；夹在 120..560 刻。 */
        seal: seconds(
            F.base(200)
                .plus(F.level().times(2.2).as("等级"))
                .plus(F.stat("specialAttack").times(0.9).as("特攻"))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(0.75)).as("锁法"))
                .clamp(120, 560).round(0),
            "封锁时长", "这枚查封印记把目标的手按住多久；等级与特攻越高越久，深锁 ×1.35、快锁 ×0.75。到期自动松开。"),
        /** 施放距离：基础 9 格；体型高度每比 1.4 高 1 格 +0.5，20 级起每级 +0.06；夹在 6..14 格。 */
        reach: formula(
            F.base(9)
                .plus(F.body("height").minus(1.4).times(0.5).as("体型"))
                .plus(F.level().minus(20).max(0).times(0.06).as("等级"))
                .clamp(6, 14).round(1),
            "施放距离", { unit: " 格", description: "能把查封印记送到多远；个头越大、等级越高够得越远。它也是本招实际射程的来源。" }),
        /** 印记速度：基础 0.6 格/刻；速度每 3000 点 +1；夹在 0.45..1.1 格/刻。 */
        velocity: formula(
            F.base(0.6).plus(F.stat("speed").div(3000).as("速度")).clamp(0.45, 1.1).round(3),
            "印记速度", { unit: " 格/刻", description: "封印冲向目标的速度；越快的个体越难被反应。" }),
        /** 印记大小：基础 0.32 格；体型高度每比 1.4 高 1 格 +0.12；夹在 0.22..0.6 格。 */
        radius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.12).as("体型")).clamp(0.22, 0.6).round(2),
            "印记大小", { unit: " 格", description: "套在目标道具位上的锁环大小；个头越大环越大，判定与画面按它铺开。" }),
        /** 起手：基础 11 刻，速度每点 −0.04 刻；夹在 6..14 刻。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").times(0.04).as("速度")).clamp(6, 14).round(0),
            "起手", "捏出这枚印记需要多久；速度越快起得越短。"),
        /** 收招：基础 8 刻，特防每点 −0.02 刻；夹在 5..11 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("specialDefence").times(0.02).as("特防")).clamp(5, 11).round(0),
            "收招", "送出印记后的收势；特防越稳收得越快。"),
        /** 冷却：基础 95 刻 − 等级 ×0.5；deep 开 +14、关 −8；夹在 55..125 刻。 */
        recharge: seconds(
            F.base(95).minus(F.level().times(0.5).as("等级"))
                .plus(F.when(F.pref("deep"), F.const(14), F.const(-8)).as("锁法"))
                .clamp(55, 125).round(0),
            "冷却", "两次查封之间的等待；深锁更长、快锁更短，等级越高越熟练。"),
        /** 锁环数量：基础 10 个，特攻每 8 点 +1；夹在 8..24 个。 */
        shackles: formula(
            F.base(10).plus(F.stat("specialAttack").div(8).as("特攻")).clamp(8, 24).round(0),
            "锁环数量", { unit: " 个", description: "套在目标身上转动的锁环与封条数量；特攻越高越多，粒子按它发射。" }),
        /** 封条数量：基础 8 条，等级每 4 级 +1；夹在 8..20 条。 */
        motes: formula(
            F.base(8).plus(F.level().div(4).as("等级")).clamp(8, 20).round(0),
            "封条数量", { unit: " 条", description: "从施法者手中飞出的封条数量；等级越高越多，驱动飞行粒子。" })
    });

    stages("embargo", [
        { level: 30, values: { seal: 260 } },
        { level: 50, values: { seal: 320, shackles: 16 } }
    ]);

    describe("embargo", [
        { key: "description.0", values: ["seal", "reach"] },
        { key: "description.1", values: [] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.seal"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.seal"] }
    ]);
}
