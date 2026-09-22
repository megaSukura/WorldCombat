/**
 * 识破 / Foresight 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：一般、变化、威力 0、命中必中、PP 40、优先度 0、目标 normal（单体）；
 *   命中给目标挂 foresight 挥发状态：① 目标若为幽灵属性，一般与格斗招式对它不再免疫；② 目标身上正的闪避
 *   等级被视作 0；③ 目标已有奇迹之眼时失败。
 *
 * 世界化：即时战场没有回合制的命中判定与挥发槽，所以把「看穿幽灵的虚体」翻译成**在对手身上留下一个识破印记**：
 *   印记期间目标被照亮（minecraft:glowing），它当前的正闪避等级被一次剥掉并在窗口结束时原样还回；同时
 *   `PokemonDamage.metadata` 在伤害结算前读取这层共享身份，把目标属性里的 ghost 摘掉——一般与格斗招式因此
 *   接得上，结算仍走共享的本系、相性、暴击与特性。反制：窗口走完、被牛奶一类效果解掉，或目标被重新提到闪避。
 *
 * 与同族分开：气味侦测（odorsleuth）借同一份共享身份但窗口更长、还会拖慢目标脚步；奇迹之眼（miracleeye）
 *   改的是超能对恶的免疫并抬施法者的命中；识破最短最便宜，只做「剥幽灵 + 一次拔闪避」这一件事。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   window      识破窗口：基础 120 刻 + 等级 × 2 + 速度 × 0.4，深识 ×1.6／快识 ×0.7，夹 80..360。
 *   reveal      照亮时长：基础 80 刻 + 等级 × 2，深识 ×1.4，夹 60..300；目标被照亮可见。
 *   strips      闪避剥离：基础 3 + 等级 × 0.05，夹 1..6 级；身高越高压得住越高（当前实际剥离量受目标现有闪避封顶）。
 *   motes       目光点数：基础 12 + 物攻 × 0.08，深识 ×1.2，夹 10..32；力道越足，画面里的目光点越多。
 *   reach       识破距离：基础 5 + 碰撞箱高度 × 0.8，夹 4..10；身板越高看得越远。
 *   tempo       起手：基础 6 − (速度 − 60) × 0.02（只取正值），深识 +3，夹 4..11。
 *   aftercast   收招：基础 4 + 碰撞箱高度 × 1，夹 3..8。
 *   recharge    冷却：基础 70 − 等级 × 0.25，深识 +18／快识 −8，夹 45..120。PP 40。
 * 配置 deep（深识）双向取舍：开启＝窗口 ×1.6、照亮 ×1.4、目光更盛，但起手 +3、冷却 +18；关闭＝窗口短、
 *   起手快、冷却短。PP 有 40 发，深识与快识的取舍直接落在节奏上。
 */
namespace PokemonSkills {
    export const foresightId = "foresight";
    export const foresightScene = "world_combat:move_foresight";
    export const foresightMarkEffect = "world_combat:foresight_mark";
    export const foresightRecordEffect = "world_combat:foresight_record";
    export const foresightStatus = "foresight";
    export const foresightSceneText = "world_combat.move.foresight.text.read";
    export const foresightFadeText = "world_combat.move.foresight.text.fade";
    export const foresightBlockedText = "world_combat.move.foresight.text.blocked";
    export const foresightEmptyText = "world_combat.move.foresight.text.empty";

    actionParameters.define(foresightId, {
        window: seconds(
            F.base(120).plus(F.level().times(2)).plus(F.stat("speed").times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.foresight.preference.deep")), F.const(1.6), F.const(0.7)))
                .clamp(80, 360).round(0),
            "识破窗口", "印记留多久：等级与速度延长它，深识明显更长；窗口里一般/格斗打得上幽灵。"),
        reveal: seconds(
            F.base(80).plus(F.level().times(2))
                .times(F.when(F.pref("deep", text("worldcombat.skill.foresight.preference.deep")), F.const(1.4), F.const(1)))
                .clamp(60, 300).round(0),
            "照亮时长", "目标被照亮、在掩体后也可见的时长；等级越高越久，深识更长。"),
        strips: formula(
            F.base(3).plus(F.level().times(0.05)).clamp(1, 6).round(0),
            "闪避剥离", {
                unit: " 级",
                description: "一次剥掉目标几级正闪避；等级越高压得越多，实际剥离量受目标现有闪避封顶，窗口结束原样还回。"
            }),
        motes: formula(
            F.base(12).plus(F.stat("attack").times(0.08))
                .times(F.when(F.pref("deep", text("worldcombat.skill.foresight.preference.deep")), F.const(1.2), F.const(1)))
                .clamp(10, 32).round(0),
            "目光点数", {
                unit: " 点",
                description: "识破线与目标瞳孔环的粒子数量；物攻越高越密，画面里的目光点与它一致。"
            }),
        reach: formula(
            F.base(5).plus(F.body("height").times(0.8)).clamp(4, 10).round(1),
            "识破距离", {
                unit: " 格",
                description: "能识破对手的距离；身板越高看得越远，也是玩家瞄准能接受的范围。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.foresight.preference.deep")), F.const(3), F.const(0)))
                .clamp(4, 11).round(0),
            "起手", "凝目看穿需要多久；速度越快越短，深识多花几刻。"),
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1)).clamp(3, 8).round(0),
            "收招", "看穿之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(70).minus(F.level().times(0.25))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.foresight.preference.deep")), F.const(18), F.const(-8)))
                .clamp(45, 120).round(0),
            "冷却", "两次识破之间的等待；等级越高越熟练，深识更费力。PP 40。")
    });

    describe(foresightId, [
        { key: "description.0", values: ["strips", "window"] },
        { key: "description.1", values: ["reveal", "motes"] },
        { key: "deep.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
