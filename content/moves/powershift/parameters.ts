/**
 * 力量转换 / powershift 的参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 0／命中必中／PP 10／目标 self；进入 volatile `powershift`，把 storedStats 的
 *   atk 与 def 互换，离场时再换回（Cobblemon 1.8 / Showdown）。它是本组里唯一**交换数值本身**而不是等级的一招。
 *
 * 翻译：把「将自己的攻击与防御互相交换」翻成即时战斗里一段可逆的**倒转**——施术者身侧的两股力道（攻势与守势）
 *   交换位置，交换只在窗口内维持，窗口走完自己换回来。它不改等级、不改上限，只是把你现成的两样本钱对调：
 *   攻高防低的人换完能扛，防高攻低的人换完能打。取原生「攻/防互换、保持一段时间、可逆」；放弃「离场才换回」
 *   的回合制边界，改成一段可见窗口，让对手能读出交换的起止。
 *
 * 换的是真实数值，不是等级：宝可梦走共享的临时属性层（NativeModifiers.stats，与纹理、特性替换同一机制），
 *   其他战斗者把 NativeEffects.boost 的载体落在原版攻击与护甲属性上——两条路都让「换完的数值」真正参与结算。
 *
 * 数值来源（每个参数读不同的精灵数据／现场事实，分散到不同参数上）：
 *   window    交换窗口：基础 160 刻 ＋ 等级 ×3 ＋ 防御 ×0.4，夹 120..480；配置「维持」×1.8。
 *   bands     流转条数（同时是画面里的粒子数）：物攻与防御之和派生，夹 12..40。
 *   tempo     起手：速度每比 60 快 1 减 0.02 刻，夹 5..12；维持 +3。
 *   aftercast 收招：基础 5 刻 ＋ 碰撞箱高度，夹 5..9。
 *   wait      冷却：基础 80 刻 − 等级 ×0.4；维持 ×1.3、短换 ×0.9，夹 45..110。PP 10 的代价。
 * 配置 hold（维持）双向取舍：开启＝交换窗口 ×1.8，能把转换后的形态用得更久；代价是起手 +3 刻、冷却 ×1.3，
 *   而且这段时间里换不回来。关闭＝短换，出手快、冷却短、随时能换回，但只够应付一下。
 */
namespace PokemonSkills {
    actionParameters.define("powershift", {
        /** 流转条数：攻防之和派生，直接驱动画面里的粒子数。 */
        bands: formula(
            F.base(14).plus(F.stat("attack").plus(F.stat("defence")).div(24)).clamp(12, 40).round(0),
            "流转条数", {
                unit: " 条",
                description: "交换时在身侧对流的力道条数（也是画面里的粒子总数）；物攻与防御越高，转换的规模越大。"
            }),
        /** 交换窗口：维持多久。 */
        window: seconds(
            F.base(160).plus(F.level().times(3)).plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("hold", text("worldcombat.skill.powershift.preference.hold")), F.const(1.8), F.const(1)))
                .clamp(120, 480).round(0),
            "交换窗口", "交换维持多久；等级与防御越高撑得越久，配置「维持」再 ×1.8。窗口走完自动换回原来的数值。"),
        /** 起手：速度决定倒转多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.powershift.preference.hold")), F.const(3), F.const(0)))
                .clamp(5, 12).round(0),
            "起手", "把两股力道倒转过来需要多久；速度越高越快，维持多花 3 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height")).clamp(5, 9).round(0),
            "收招", "锁定转换的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(80).minus(F.level().times(0.4))
                .times(F.when(F.pref("hold", text("worldcombat.skill.powershift.preference.hold")), F.const(1.3), F.const(0.9)))
                .clamp(45, 110).round(0),
            "冷却", "两次转换之间的等待；等级越高越短，维持 ×1.3、短换 ×0.9。PP 10 的代价。")
    });

    stages("powershift", [
        { level: 40, values: { window: 260 } },
        { level: 55, values: { window: 320 } }
    ]);

    describe("powershift", [
        { key: "description.0", values: ["window"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "description.1", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window"] }
    ]);
}
