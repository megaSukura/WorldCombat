/**
 * 您先请 / afteryou —— 参数与机制数值来源。
 *
 * 原生事实：Normal／变化／威力 0／必中／PP 15／目标 any（可我方也可对手）／优先度 0；
 *   「支援我方或对手的行动，使其紧接着此招式之后行动」——把目标的行动提到自己之后立刻执行。
 *
 * 核心念头：向一个伙伴让出你的节奏——一道引线搭上它，催它紧接着你出手；你把这一拍让出去，自己下一拍要等更久。
 *   它的形状是「先手」的转移：伙伴变快，自己变慢。
 *
 * 世界化：即时战斗没有回合队列，也不存在「插队」；「紧接着此招式之后行动」落成一段有寿命的
 *   **行动加速窗口**——挂在伙伴身上的共享身份效果 world_combat:status/afteryou 让它下一次出手来得更快
 *   （共享的 world_combat:skill_haste 临时修饰，冷却按 100/(100+急速) 缩短），作为代价，施法者自己背上
 *   一段 world_combat:status/afteryou_yield 的减速（负急速，冷却变长）。加速与减速都是真实的原生属性修饰，
 *   走效果生命周期，窗口走完自动收回。伙伴在窗口内真的出手时会浮出「紧接着行动」，让玩家读到这一拍被兑现。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   readyTicks  基础 90 刻 + 等级 ×1.2 + 亲密度 ×0.3，夹 50..260；等级与亲密度让加速窗口更久。
 *   haste       基础 60 + 速度 ×0.3 + 特攻 ×0.15，夹 30..140；速度与特攻决定催得多快（数值是 skill_haste 点数）。
 *   yieldTicks  基础 60 刻 + 等级 ×0.6，夹 40..160；施法者自己让出的那一拍多久补回来。
 *   drag        基础 25 + 速度 ×0.1，夹 15..60；施法者背上的减速（负 skill_haste）。
 *   reach       基础 4 格 + 速度 ÷90 + 身高 ×0.6，夹 3..10；身法越快、身板越大够得越远。它也是实际射程的来源。
 *   motes       基础 10 点 + 特攻 ÷50，夹 10..28；引线上的光点数量（画面里的发射量）。
 *   tempo       基础 7 刻 − 速度 ×0.03，夹 4..12；搭线所需时间。
 *   aftercast   基础 5 刻 − 速度 ×0.01，夹 3..8；搭完的收势。
 *   recharge    基础 90 刻 − 速度 ×0.15，夹 50..140；两次让手之间的等待。
 * 配置项 lead（催促／托付）：催促＝加速 ×1.2、窗口 ×0.7（一拍抢得狠但短）；托付＝加速 ×0.85、窗口 ×1.4
 *   （细水长流）。用爆发强度换持续时间。
 */
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
    /** 正急速的临时属性载体（托管效果，随自身结束自动收回修饰）。 */
    export const afteryouHaste = "world_combat:afteryou_haste";
    /** 负急速的临时属性载体。 */
    export const afteryouDrag = "world_combat:afteryou_drag";
    /** 画面旁挂：伙伴身上的加速数、引线光点数与时限。 */
    export const afteryouMark = "world_combat:afteryou_mark";
    /** 画面旁挂：施法者让手期间减速多少、多久。 */
    export const afteryouCostMark = "world_combat:afteryou_cost_mark";
    export const afteryouCallText = "world_combat.move.afteryou.text.call";
    export const afteryouGoText = "world_combat.move.afteryou.text.go";
    export const afteryouFadeText = "world_combat.move.afteryou.text.fade";
    export const afteryouYieldText = "world_combat.move.afteryou.text.yield";

    actionParameters.define(afteryouId, {
        readyTicks: seconds(
            F.base(90).plus(F.level().times(1.2)).plus(F.individual("friendship").times(0.3))
                .times(F.when(F.pref("lead").gt(0.5), F.const(0.7), F.const(1.4)))
                .clamp(50, 260).round(0),
            "加速窗口", "伙伴身上的加速维持多久；等级与亲密度延长它，催促缩短换取更强的加速。"),
        haste: formula(
            F.base(60).plus(F.stat("speed").times(0.3)).plus(F.stat("specialAttack").times(0.15))
                .times(F.when(F.pref("lead").gt(0.5), F.const(1.2), F.const(0.85)))
                .clamp(30, 140).round(0),
            "催速强度", {
                unit: "点",
                description: "伙伴获得的技能急速点数（冷却按 100/(100+急速) 缩短）；速度与特攻越高催得越快，催促更狠、托付更温和。"
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
        { key: "description.1", values: ["reach", "motes"] },
        { key: "description.2", values: ["yieldTicks", "drag", "tempo", "aftercast", "recharge"] },
        { key: "lead.0", values: [], when: function (context) { return read(context.detail.values, ["lead"]) === 1; } },
        { key: "lead.1", values: [], when: function (context) { return read(context.detail.values, ["lead"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
