/**
 * 力量戏法 / powertrick —— 参数与数值来源。
 *
 * 核心念头：一手假动作，把你身上的两股力道——攻势与守势——在众目睽睽之下一翻，位置整个对调；戏法一旦落定就保持不变，
 *   直到你再演一次把它翻回来。守高攻低的个体翻完能打，攻高守低的个体翻完能扛。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／变化／威力 0／命中必中／PP 10／目标 self；进入 volatile `powertrick`，
 *   把 storedStats 的 atk 与 def 互换；**再施展一次时 `onRestart` 移除 volatile**（等于翻回来），离场时也换回。
 *
 * 翻译：原生交换的是「原始攻防数值」。这里就把两样本钱真正对调——宝可梦走共享 NativeModifiers 的 stats 层，
 *   其他战斗者把原版攻击与护甲属性对调，两条路都让换完的数值真正参与结算；并挂共享身份
 *   world_combat:status/powertrick 的窗口与一枚机读记号。原生「再施展一次就翻回来」正是本招的身份：
 *   **它是一个来回翻的戏法**——落定后保持不变（长戏），或自行褪去（短戏），窗口走完/被清除时按记号换回原样。
 *   取原生「攻防互换、可再次施展翻回、离开前保持」；放弃回合制的离场边界，改成一段可见窗口与手动翻回。
 *
 * 与同族的差异：**力量转换（powershift）是一段自动到点换回的姿态**；力量戏法是一个**手动翻面的戏法**，
 *   Psychic 属性、更快、落定后由你再决定何时翻回。两者在场上的读数不同：一个在倒计时，一个等你再演一次。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上；真正被对调的攻防在出招时读取）：
 *   tempo     起手：速度决定翻得多快；长戏多花 2 刻。
 *   aftercast 收招：身高决定收势站得多稳。
 *   window    保持窗口：等级与特防决定这次戏法维持多久，长戏 ×1.9、短戏 ×0.5。
 *   spin      画面旋转对数：特攻决定环绕的两色牌数量，画面按它发射。
 *   recharge  冷却：等级越高越熟练；长戏 ×1.3、短戏 ×0.85。
 * 配置 long（长戏／短戏）双向取舍：长戏把翻面的形态保持很久（×1.9），代价是起手 +2、冷却 ×1.3；
 *   短戏出手快、冷却短（×0.85），只够应付一下、很快自动翻回。保持与出手频率互相取舍。
 */
namespace PokemonSkills {
    actionParameters.define("powertrick", {
        tempo: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.04).as("速度"))
                .plus(F.when(F.pref("long", text("worldcombat.skill.powertrick.preference.long")), F.const(2), F.const(0)).as("戏法长短"))
                .clamp(2, 10).round(0),
            "起手", "一翻手把两股力道对调需要多久；速度越快越短，长戏多花 2 刻。"),
        aftercast: seconds(
            F.base(5, "基础").plus(F.body("height").times(0.8).as("体型")).clamp(4, 10).round(0),
            "收招", "锁定戏法的收势；身板越高大收得越慢。"),
        window: seconds(
            F.base(2400, "基础").plus(F.level().times(25).as("等级")).plus(F.stat("specialDefence").times(0.8).as("特防"))
                .times(F.when(F.pref("long", text("worldcombat.skill.powertrick.preference.long")), F.const(1.9), F.const(0.5)).as("戏法长短"))
                .clamp(600, 6000).round(0),
            "保持窗口", "这次对调维持多久；等级与特防越高越久，长戏 ×1.9、短戏 ×0.5。窗口走完自动翻回；在窗口内再施展一次也会翻回。"),
        spin: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(55).as("特攻")).clamp(6, 16).round(0),
            "画面对数", { visible: false, unit: " 对", description: "环绕身侧、随后对调位置的两色牌数量；特攻越高越密，画面按它发射。" }),
        recharge: seconds(
            F.base(70, "基础").minus(F.level().times(0.35).as("等级"))
                .times(F.when(F.pref("long", text("worldcombat.skill.powertrick.preference.long")), F.const(1.3), F.const(0.85)).as("戏法长短"))
                .clamp(30, 110).round(0),
            "冷却", "两次戏法之间的等待；等级越高越短，长戏 ×1.3、短戏 ×0.85。PP 10 的代价。")
    });

    stages("powertrick", [{ level: 40, values: { window: 3000, recharge: 52 } }, { level: 55, values: { window: 3600, recharge: 44 } }]);

    describe("powertrick", [
        { key: "description.0", values: ["window"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "long.on", values: [], when: function (context) { return read(context.detail.values, ["long"]) === true; } },
        { key: "long.off", values: [], when: function (context) { return read(context.detail.values, ["long"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.recharge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.recharge"] }
    ]);
}
