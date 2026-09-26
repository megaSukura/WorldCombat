/** One preparation transfer uses haste/(100+haste); the helper retains its short recovery cost. */
namespace PokemonSkills {
    export const afteryouId = "afteryou";
    export const afteryouScene = "world_combat:move_afteryou";
    /** 共享身份：伙伴身上的加速窗口。 */
    export const afteryouStatus = "afteryou";
    /** 共享身份：施法者让出的一拍。 */
    export const afteryouYieldStatus = "afteryou_yield";
    /** 伙伴身上的加速窗口载体（真实 MobEffect，/effect 可见、可被牛奶解）。 */
    export const afteryouReady = "world_combat:afteryou_ready";
    /** 施法者身上的让手载体（真实 MobEffect）。 */
    export const afteryouYield = "world_combat:afteryou_yield";
    /** 负急速的临时属性载体。 */
    export const afteryouDrag = "world_combat:afteryou_drag";
    /** 画面旁挂：伙伴身上的加速数、引线光点数与时限。 */
    export const afteryouMark = "world_combat:afteryou_mark";
    export const afteryouCallText = "world_combat.move.afteryou.text.call";
    export const afteryouGoText = "world_combat.move.afteryou.text.go";
    export const afteryouFadeText = "world_combat.move.afteryou.text.fade";
    export const afteryouYieldText = "world_combat.move.afteryou.text.yield";

    actionParameters.define(afteryouId, {
        readyTicks: seconds(
            F.base(90).plus(F.level().times(1.2)).plus(F.individual("friendship").times(0.3))
                .times(F.when(F.pref("lead").gt(0.5), F.const(0.7), F.const(1.4)))
                .clamp(50, 260).round(0),
            "加速窗口", "等待伙伴开始一次标准准备的时间；已在准备则立即提前，成功后窗口消费。"),
        haste: formula(
            F.base(60).plus(F.stat("speed").times(0.3)).plus(F.stat("specialAttack").times(0.15))
                .times(F.when(F.pref("lead").gt(0.5), F.const(1.2), F.const(0.85)))
                .clamp(30, 140).round(0),
            "催速强度", {
                unit: "点",
                description: "一次缩短当前剩余准备的 强度/(100+强度)，至少保留一刻；速度与特攻越高提前得越多。玩家获得一次真实近战攻速助力。"
            }),
        yieldTicks: seconds(
            F.base(60).plus(F.level().times(0.6)).clamp(40, 160).round(0),
            "让手时长", "施法者自己让出的那一拍多久补回来；等级越高恢复得快一点。"),
        drag: formula(
            F.base(25).plus(F.stat("speed").times(0.1)).clamp(15, 60).round(0),
            "让手减速", {
                unit: "点",
                description: "施法者背上的减速点数（负急速，冷却变长）；速度越高让出去的一拍越沉。"
            }),
        reach: formula(
            F.base(4).plus(F.stat("speed").div(90)).plus(F.body("height").times(0.6)).clamp(3, 10).round(1),
            "引线距离", {
                unit: "格",
                description: "引线能够到多远的伙伴；身法越快、身板越大伸得越远。它也是本招实际射程的来源。"
            }),
        motes: formula(
            F.base(10).plus(F.stat("specialAttack").div(50)).clamp(10, 28).round(0),
            "引线光点", {
                unit: "点",
                description: "搭向伙伴的引线光点数量，也驱动持续画面里的发射量；特攻越高越密。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").times(0.03)).clamp(4, 12).round(0),
            "起手", "向伙伴搭出引线需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").times(0.01)).clamp(3, 8).round(0),
            "收招", "搭完之后的收势。"),
        recharge: seconds(
            F.base(90).minus(F.stat("speed").times(0.15)).clamp(50, 140).round(0),
            "冷却", "两次让手之间的等待；出手越快越熟练。")
    });

    describe(afteryouId, [
        { key: "description.0", values: ["readyTicks", "haste"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["yieldTicks","drag","tempo","aftercast","recharge"] },
        { key: "lead.0", values: [], when: function (context) { return read(context.detail.values, ["lead"]) === 1; } },
        { key: "lead.1", values: [], when: function (context) { return read(context.detail.values, ["lead"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
