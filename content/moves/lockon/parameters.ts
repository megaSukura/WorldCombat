/**
 * 锁定 / Lock-On 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 5、优先度 0、目标 normal（单体）、
 *   onHit 给施法者加 lockon volatile（持续 2 回合；onSourceAccuracy 恒真，且忽略目标的无敌状态）。
 *
 * 世界化：即时战场没有回合制的「命中判定」，所以把「下一次必定打中」翻译成**把目标钉在准星里**：提交后
 *   施法者身上留住一层锁定期（身份 world_combat:status/lockon），目标身上挂一圈咬住痕、移动被压低
 *   （配置「钉死」时完全钉住移动与飞行）。目标因此甩不开接下来的这一击；命中锁住的目标时这层锁用掉、
 *   痕迹一并移除。锁窗口走完或目标被清除类效果解掉时，锁与痕迹一起散。
 *   反制：目标可以在锁定期间退出射程、被队友解掉、或让施法者这一击打到别的目标（锁定只对锁住的那个人兑现）。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   lockTicks   锁定期：基础 140 刻 + 等级 × 2 + 物攻 × 0.3，钉死 ×1.5／松锁 ×0.8，夹 90..360。
 *   pinTicks    咬住时长：基础 60 刻 + 等级 × 1.2，钉死 ×1.4／松锁 ×0.8，夹 40..200；目标被拖住多久。
 *   motes       准星量：基础 14 + 物攻 × 0.1，钉死 ×1.15，夹 10..36；画面里的准星光点与它一致。
 *   tempo       起手：基础 7 − (速度 − 60) × 0.02（只取正值），钉死 +2，夹 4..12。
 *   aftercast   收招：基础 4 + 碰撞箱高度 × 1.1，夹 3..8。
 *   recharge    冷却：基础 88 − 等级 × 0.25，钉死 +20／松锁 −8，夹 55..140。PP 5。
 *   reach       锁定距离：基础 6 + 碰撞箱高度 × 0.8，夹 4..10；身板越高锁定得越远。
 * 配置 hold（钉死）双向取舍：开启＝窗口 ×1.5、完全钉住目标移动、命中更稳，但起手 +2、冷却 +20；
 *   关闭＝只压低目标移动、窗口更短、冷却更短。PP 只有 5，钉死与松锁的取舍直接落在资源上。
 */
namespace PokemonSkills {
    export const lockonId = "lockon";
    export const lockonScene = "world_combat:move_lockon";
    export const lockonFocusEffect = "world_combat:lockon_focus";
    export const lockonTrackEffect = "world_combat:lockon_track";
    export const lockonClampEffect = "world_combat:lockon_clamp";
    export const lockonMark = "world_combat:lockon_mark";
    export const lockonStatus = "lockon";
    export const lockonReadyText = "world_combat.move.lockon.text.ready";
    export const lockonStrikeText = "world_combat.move.lockon.text.strike";
    export const lockonFadeText = "world_combat.move.lockon.text.fade";

    actionParameters.define(lockonId, {
        lockTicks: seconds(
            F.base(140).plus(F.level().times(2)).plus(F.stat("attack").times(0.3))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.5), F.const(0.8)))
                .clamp(90, 360).round(0),
            "锁定期", "准星咬住对手多久；等级与物攻延长它，钉死明显更长；兑现或走完即散。"),
        pinTicks: seconds(
            F.base(60).plus(F.level().times(1.2))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.4), F.const(0.8)))
                .clamp(40, 200).round(0),
            "咬住时长", "目标被拖住多久；等级越高越久，钉死更长。"),
        motes: formula(
            F.base(14).plus(F.stat("attack").times(0.1))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.15), F.const(1)))
                .clamp(10, 36).round(0),
            "准星量", {
                unit: " 点",
                description: "锁定线与目标准星的粒子数量；物攻越高越密，画面里的准星光点与它一致。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "把准星咬上去需要多久；速度越快越短，钉死多花两刻。"),
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.1)).clamp(3, 8).round(0),
            "收招", "锁上之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(88).minus(F.level().times(0.25))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(20), F.const(-8)))
                .clamp(55, 140).round(0),
            "冷却", "两次锁定之间的等待；等级越高越熟练，钉死更费力。PP 5。"),
        reach: formula(
            F.base(6).plus(F.body("height").times(0.8)).clamp(4, 10).round(1),
            "锁定距离", {
                unit: " 格",
                description: "能咬住对手的距离；身板越高够得越远，也是玩家瞄准能接受的范围。"
            })
    });

    describe(lockonId, [
        { key: "description.0", values: ["lockTicks", "pinTicks"] },
        { key: "description.1", values: ["motes"] },
        { key: "hold.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
