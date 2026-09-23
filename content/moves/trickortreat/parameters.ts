/**
 * 万圣夜 / Trick-or-Treat 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：幽灵、变化、威力 0、命中 100、PP 20、优先度 0、目标 normal（单体）；
 *   命中给目标追加一个幽灵属性（已有幽灵时失败）。追加后它自己得到幽灵本系，防守面也随之改变：
 *   一般与格斗对它免疫，幽灵与恶对它效果绝佳。
 *
 * 世界化：即时战场没有第六个属性槽，所以把这招落到共享的临时属性层 NativeModifiers.types 上——**给对手套上
 *   一件幽灵外壳**，只在这件外套还没穿满三层属性时套得上（目标已到第三属性或已是幽灵时套不上，预检直接
 *   拒绝，不浪费 PP）。外壳期间 `NativeEffects.types` 带着 ghost，于是本系、受击相性、AI 与 ready 一起变化；
 *   壳到期或提前被解掉时解除属性层，属性随原生个体本身恢复。反制：属性层已满的目标套不上；识破／气味侦测也能把
 *   这件壳的幽灵免疫再摘掉。
 *
 * 与识破同族：识破一族在对手身上「看穿并摘掉幽灵」，万圣夜反过来「把幽灵外壳套上去」——一摘一套，正好成对。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   shell       外壳时长：基础 200 刻 + 等级 × 3 + 体重 × 0.5，盛大 ×1.6／轻巧 ×0.85，夹 120..600。
 *   motes       装饰点数：基础 14 + 体重 × 0.25，盛大 ×1.15，夹 12..40；越重的目标，画面里的装饰越多。
 *   reach       套壳距离：基础 4 + 碰撞箱高度 × 0.6，夹 3..8；要靠近才套得上。
 *   tempo       起手：基础 7 − (速度 − 60) × 0.02（只取正值），盛大 +4，夹 4..12。
 *   aftercast   收招：基础 5 + 碰撞箱高度 × 1，夹 3..8。
 *   recharge    冷却：基础 78 − 等级 × 0.3，盛大 +20／轻巧 −8，夹 45..120。PP 20。
 * 配置 grand（盛大）双向取舍：开启＝外壳 ×1.6、装饰更盛，但起手 +4、冷却 +20；关闭＝外壳短、起手快、冷却短。
 *   PP 只有 20 发，盛大与轻巧的取舍直接落在资源上。
 */
namespace PokemonSkills {
    export const trickortreatId = "trickortreat";
    export const trickortreatScene = "world_combat:move_trickortreat";
    export const trickortreatShellEffect = "world_combat:trick_shell";
    export const trickortreatRecordEffect = "world_combat:trick_record";
    export const trickortreatStatus = "trickortreat";
    export const trickortreatDressText = "world_combat.move.trickortreat.text.dress";
    export const trickortreatTearText = "world_combat.move.trickortreat.text.tear";
    export const trickortreatBlockedText = "world_combat.move.trickortreat.text.blocked";
    export const trickortreatNoRoomText = "world_combat.move.trickortreat.text.noroom";

    actionParameters.define(trickortreatId, {
        shell: seconds(
            F.base(200).plus(F.level().times(3)).plus(F.body("weight").times(0.5))
                .times(F.when(F.pref("grand", text("worldcombat.skill.trickortreat.preference.grand")), F.const(1.6), F.const(0.85)))
                .clamp(120, 600).round(0),
            "外壳时长", "幽灵外壳留多久：等级与体重延长它，盛大明显更长；壳到期或提前被解掉时属性还原。"),
        motes: formula(
            F.base(14).plus(F.body("weight").times(0.25))
                .times(F.when(F.pref("grand", text("worldcombat.skill.trickortreat.preference.grand")), F.const(1.15), F.const(1)))
                .clamp(12, 40).round(0),
            "装饰点数", {
                unit: " 点",
                description: "外壳上南瓜灯火花与糖果装饰的粒子数量；目标越重越密，画面里的装饰与它一致。"
            }),
        reach: formula(
            F.base(4).plus(F.body("height").times(0.6)).clamp(3, 8).round(1),
            "套壳距离", {
                unit: " 格",
                description: "能靠近对手把壳套上去的距离；身板越高够得越远，这是本招偏短的射程。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("grand", text("worldcombat.skill.trickortreat.preference.grand")), F.const(4), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "披上外衣需要多久；速度越快越短，盛大更慢。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1)).clamp(3, 8).round(0),
            "收招", "套好之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(78).minus(F.level().times(0.3))
                .plus(F.when(F.pref("grand", text("worldcombat.skill.trickortreat.preference.grand")), F.const(20), F.const(-8)))
                .clamp(45, 120).round(0),
            "冷却", "两次套壳之间的等待；等级越高越熟练，盛大更费力。PP 20。")
    });

    describe(trickortreatId, [
        { key: "description.0", values: ["shell"] },
        { key: "grand.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["grand"]) === true; } },
        { key: "grand.off", values: [], when: function (context) { return read(context.detail.values, ["grand"]) !== true; } },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
