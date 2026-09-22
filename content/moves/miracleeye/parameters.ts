/**
 * 奇迹之眼 / Miracle Eye 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：超能、变化、威力 0、命中必中、PP 40、优先度 0、目标 normal（单体）；
 *   命中给目标挂 miracleeye 挥发状态：① 目标若为恶属性，超能招式对它不再免疫；② 目标身上正的闪避等级被
 *   视作 0；③ 目标已有识破／气味侦测时失败。
 *
 * 世界化：把「心眼穿透恶的屏障」翻译成**在对手身上留下一个心眼印记**——印记期间目标被照亮、当前正闪避被
 *   一次剥掉并在窗口结束还回；`PokemonDamage.metadata` 在伤害结算前读这层共享身份，把目标属性里的 dark 摘掉，
 *   超能招式因此接得上。施法者同时借着这一眼把自己的命中等级抬一级（窗口结束原样收回），心眼越亮，瞄得越稳。
 *   反制：窗口走完或被牛奶一类效果解掉；目标若已有识破印记，心眼点不上去。
 *
 * 与同族分开：识破／气味侦测破的是幽灵对一般／格斗的免疫，奇迹之眼破的是恶对超能的免疫，还额外抬施法者命中。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   window      心眼窗口：基础 150 刻 + 等级 × 2 + 特攻 × 0.15，专注 ×1.5／浅读 ×0.8，夹 100..420。
 *   reveal      照亮时长：基础 90 刻 + 等级 × 1.8，专注 ×1.3，夹 60..300。
 *   insight     心见级数：基础 2 + 特攻 ÷ 60，专注 +1，夹 1..3 级；借这一眼抬自己的命中。
 *   strips      闪避剥离：基础 2 + 等级 × 0.04，夹 1..5 级；实际剥离量受目标现有闪避封顶。
 *   motes       心眼点数：基础 14 + 特攻 × 0.14，专注 ×1.2，夹 10..40。
 *   reach       心眼距离：基础 5 + 碰撞箱高度 × 0.6，夹 4..9；身板越高看得越远。
 *   tempo       起手：基础 8 − (速度 − 60) × 0.02（只取正值），专注 +3，夹 5..13。
 *   aftercast   收招：基础 5 + 碰撞箱高度 × 1.1，夹 4..9。
 *   recharge    冷却：基础 90 − 等级 × 0.3，专注 +22／浅读 −10，夹 55..140。PP 40。
 * 配置 focus（专注）双向取舍：开启＝窗口 ×1.5、照亮 ×1.3、心见 +1 级，但起手 +3、冷却 +22；关闭＝窗口短、
 *   起手快、冷却短、心见更低。PP 有 40 发，长读与短读的取舍直接落在节奏上。
 */
namespace PokemonSkills {
    export const miracleeyeId = "miracleeye";
    export const miracleeyeScene = "world_combat:move_miracleeye";
    export const miracleeyeMarkEffect = "world_combat:miracleeye_mark";
    export const miracleeyeRecordEffect = "world_combat:miracleeye_record";
    export const miracleeyeStatus = "miracleeye";
    export const miracleeyeReadText = "world_combat.move.miracleeye.text.read";
    export const miracleeyeFadeText = "world_combat.move.miracleeye.text.fade";
    export const miracleeyeBlockedText = "world_combat.move.miracleeye.text.blocked";
    export const miracleeyeEmptyText = "world_combat.move.miracleeye.text.empty";

    actionParameters.define(miracleeyeId, {
        window: seconds(
            F.base(150).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.15))
                .times(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(1.5), F.const(0.8)))
                .clamp(100, 420).round(0),
            "心眼窗口", "心眼印记留多久：等级与特攻延长它，专注明显更长；窗口里超能打得上恶。"),
        reveal: seconds(
            F.base(90).plus(F.level().times(1.8))
                .times(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(1.3), F.const(1)))
                .clamp(60, 300).round(0),
            "照亮时长", "目标被心眼照出、在掩体后也可见的时长；等级越高越久，专注更长。"),
        insight: formula(
            F.base(2).plus(F.stat("specialAttack").div(60))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "心见级数", {
                unit: " 级",
                description: "借这一眼给自己抬几级命中；特攻越高越稳，专注再 +1 级，窗口结束原样收回。"
            }),
        strips: formula(
            F.base(2).plus(F.level().times(0.04)).clamp(1, 5).round(0),
            "闪避剥离", {
                unit: " 级",
                description: "一次剥掉目标几级正闪避；实际剥离量受目标现有闪避封顶，窗口结束原样还回。"
            }),
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.14))
                .times(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(1.2), F.const(1)))
                .clamp(10, 40).round(0),
            "心眼点数", {
                unit: " 点",
                description: "心眼线与瞳孔环的粒子数量；特攻越高越密，画面里的心眼点与它一致。"
            }),
        reach: formula(
            F.base(5).plus(F.body("height").times(0.6)).clamp(4, 9).round(1),
            "心眼距离", {
                unit: " 格",
                description: "能看穿对手的距离；身板越高看得越远，也是玩家瞄准能接受的范围。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(3), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "凝起心眼需要多久；速度越快越短，专注多花几刻。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.1)).clamp(4, 9).round(0),
            "收招", "看穿之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(90).minus(F.level().times(0.3))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.miracleeye.preference.focus")), F.const(22), F.const(-10)))
                .clamp(55, 140).round(0),
            "冷却", "两次心眼之间的等待；等级越高越熟练，专注更费力。PP 40。")
    });

    describe(miracleeyeId, [
        { key: "description.0", values: ["strips", "window"] },
        { key: "description.1", values: ["insight", "reveal", "motes"] },
        { key: "focus.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
