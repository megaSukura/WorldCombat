/**
 * 定身法 / disable —— 参数与机制数值来源。
 *
 * 原生事实：Normal／变化／威力 0／命中 100／PP 20／目标单体／volatile `disable`，持续 4 回合；
 *   「阻碍对手行动，之前使出的招式将在 4 回合内无法使用」。没有可用上一手、Z／极巨、挣扎时失败。
 *
 * 核心念头：指出对手刚用过的那一手，把一枚钉别在它的招式表上——那一手在钉拔掉前使不出来。
 *   不是封一片，而是点名封一手，封的是「你刚才用的那一下」。
 *
 * 世界化：命中后在目标身上挂共享身份 world_combat:status/disable 的真实 MobEffect（/effect 可见、可被牛奶解），
 *   旁挂机读记下被点名的招式 id；共享动作策略在提交点把这一手顶回去。它不碰 PP 存量，只封当下的可用性；
 *   目标换一手不在名单里的招照样能打。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   disableTicks  基础 160 刻 + 等级 ×1.5，夹 100..320；等级决定这一钉钉多久（重钉再延长）。
 *   memory        基础 200 刻 + 特攻 ×0.6，夹 120..400；特攻决定能读回多久以前的出手。
 *   reach         基础 10 格 + 特攻 ×0.03 + 身高 ×1.2，夹 6..20；特攻与身板决定能够到多远。
 *   tempo         基础 9 刻 − 速度 ×0.03，夹 5..14；出手越快钉得越早。
 *   aftercast     基础 6 刻 − 速度 ×0.008，夹 4..9；钉完的收势。
 *   recharge      基础 120 刻 − 速度 ×0.1，夹 70..160；两次定身之间的等待。
 *   nails         基础 5 枚 + 特攻 ÷40，夹 5..16；钉上的枚数（画面里的发射量）。
 * 配置项 heavy（重钉／轻钉）：重钉＝时长 ×1.3、射程 ×0.9、冷却 ×1.15（钉得久但伸得近、更贵）；
 *   轻钉＝时长 ×0.8、射程 ×1.1、冷却 ×0.85（伸得远、更便宜，但很快就松开）。时长与射程互相取舍。
 */
namespace PokemonSkills {
    export const disableId = "disable";
    export const disableScene = "world_combat:move_disable";
    export const disableStatus = "disable";
    /** 定身钉的登记 id（目标身上）；行为写在本单元 skill.ts 的共享动作策略里。 */
    export const disableEffect = "world_combat:disable_lock";
    /** 机读旁挂：记下被点名的招式与画面要用的数。 */
    export const disableMark = "world_combat:disable_mark";
    export const disableLockText = "world_combat.move.disable.text.lock";
    export const disableFadeText = "world_combat.move.disable.text.fade";
    export const disableBreakText = "world_combat.move.disable.text.break";
    export const disableMissText = "world_combat.move.disable.text.miss";

    actionParameters.define(disableId, {
        disableTicks: seconds(
            F.base(160).plus(F.level().times(1.5))
                .times(F.when(F.pref("heavy"), F.const(1.3), F.const(0.8)))
                .clamp(100, 320).round(0),
            "定身时长", "这一钉把对手刚用的那一手封住多久；等级越高越久，重钉再延长、轻钉很快松开。"),
        memory: seconds(
            F.base(200).plus(F.stat("specialAttack").times(0.6)).clamp(120, 400).round(0),
            "记忆窗口", "能读回多久以前的出手；特攻越高读得越远，太老的招式读不到、这一钉落空。"),
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.03)).plus(F.body("height").times(1.2))
                .times(F.when(F.pref("heavy"), F.const(0.9), F.const(1.1)))
                .clamp(6, 20).round(1),
            "定身距离", {
                unit: "格",
                description: "钉能够到多远；特攻越高、身板越大伸得越远，重钉更近、轻钉更远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.03)).clamp(5, 14).round(0),
            "起手", "认出并钉住那一手需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").times(0.008)).clamp(4, 9).round(0),
            "收招", "钉完之后的收势。"),
        recharge: seconds(
            F.base(120).minus(F.stat("speed").times(0.1)).clamp(70, 160).round(0),
            "冷却", "两次定身之间的等待；出手越快越熟练。"),
        nails: formula(
            F.base(5).plus(F.stat("specialAttack").div(40)).clamp(5, 16).round(0),
            "定身钉数", {
                unit: "枚",
                description: "钉在被点名招式上的枚数，也驱动命中与持续画面里的发射量；特攻越高越密。"
            })
    });

    describe(disableId, [
        { key: "description.0", values: ["disableTicks"] },
        { key: "description.1", values: ["memory", "reach"] },
        { key: "description.2", values: ["nails", "tempo", "aftercast", "recharge"] },
        { key: "heavy.0", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.1", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
