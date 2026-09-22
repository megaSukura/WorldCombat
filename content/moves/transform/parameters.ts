/**
 * 变身 / transform —— 参数与机制数值来源。
 *
 * 原生事实：Normal／变化／威力 0／必中／PP 10／目标单体；flags `failencore`／`failcopycat`／`failmimic`／`failinstruct`；
 *   「变身成对手宝可梦的样子，能够使用和对手完全相同的招式」——复制目标的招式、六维、类型与特性，HP 不变。
 *
 * 核心念头：照着一名对手的样子重塑自己——招式、六维、类型、特性整套搬过来一段时间；它变成谁的形状，
 *   就只能用谁的手。它不是借一手，也不是只抄特性，而是把整个战斗形态一次性换过来。
 *
 * 世界化：即时战斗没有「换出场就还原」的回合边界，于是变身落成一段有寿命的临时层——走共享的
 *   NativeModifiers（与腹鼓、纹理、模仿同一套临时覆盖机制），把目标的六维、类型、特性与全部招式
 *   写进施法者身上；到期或被清除时按旁挂记下的层 id 精确收回，施法者回到自己原来的形态。
 *   变身期间挂共享身份 world_combat:status/transformed，消费方与 AI 用 CombatStatus.has 按身份读。
 *   目标是宝可梦时才有可复制的形态；不能复制一个正在变身的对手（原生的「不能抄副本」规则）。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   hold     基础 300 刻 + 等级 ×4 + 特防 ×1.5，夹 200..900；等级与特防支撑这层临时形态更久。
 *   reach    基础 6 格 + 特攻 ×0.02 + 身高 ×1.0，夹 4..10；特攻与身板决定能描到多远。它也是实际射程的来源。
 *   motes    基础 10 点 + 特攻 ÷45，夹 10..24；镜面外壳的光点数量（画面里的发射量）。
 *   tempo    基础 10 刻 − 速度 ×0.03，夹 6..15；照着对手重塑所需时间。
 *   aftercast 基础 9 刻 − 速度 ×0.01，夹 6..12；变完的收势。
 *   recharge 基础 150 刻 − 速度 ×0.12，夹 90..200；两次变身之间的等待。
 * 配置项 dwell（深扮／浅扮）：深扮＝时长 ×1.35、冷却 ×1.2（留得久但换得慢）；浅扮＝时长 ×0.75、冷却 ×0.8
 *   （换来换去，但每次都短）。用形态的时长换改装频率。
 */
namespace PokemonSkills {
    export const transformId = "transform";
    export const transformScene = "world_combat:move_transform";
    /** 共享身份：正在借用别人形态。 */
    export const transformStatus = "transformed";
    /** 形态载体的登记 id（施法者身上）；行为（收回临时层）写在本单元 skill.ts。 */
    export const transformEffect = "world_combat:transform_shift";
    /** 机读旁挂：记下这次临时层的 id 与复制来的形态信息，供收回与画面读取。 */
    export const transformMark = "world_combat:transform_mark";
    export const transformShiftText = "world_combat.move.transform.text.shift";
    export const transformRevertText = "world_combat.move.transform.text.revert";
    export const transformFailText = "world_combat.move.transform.text.fail";

    actionParameters.define(transformId, {
        hold: seconds(
            F.base(300).plus(F.level().times(4)).plus(F.stat("specialDefence").times(1.5))
                .times(F.when(F.pref("dwell"), F.const(1.35), F.const(0.75)))
                .clamp(200, 900).round(0),
            "形态时长", "这层临时形态维持多久；等级与特防越高越久，深扮再延长、浅扮大幅缩短。"),
        reach: formula(
            F.base(6).plus(F.stat("specialAttack").times(0.02)).plus(F.body("height").times(1.0))
                .clamp(4, 10).round(1),
            "描形距离", {
                unit: "格",
                description: "能描到多远之外的对手；特攻越高、身板越大看得越远。它也是本招实际射程的来源。"
            }),
        motes: formula(
            F.base(10).plus(F.stat("specialAttack").div(45)).clamp(10, 24).round(0),
            "镜面光点", {
                unit: "点",
                description: "变身的镜面外壳上亮起的光点数量，也驱动持续画面里的发射量；特攻越高越密。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").times(0.03)).clamp(6, 15).round(0),
            "起手", "照着对手重塑自己需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").times(0.01)).clamp(6, 12).round(0),
            "收招", "变完之后的收势。"),
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.12))
                .times(F.when(F.pref("dwell"), F.const(1.2), F.const(0.8)))
                .clamp(90, 200).round(0),
            "冷却", "两次变身之间的等待；出手越快越熟练，深扮更费。")
    });

    describe(transformId, [
        { key: "description.0", values: ["hold"] },
        { key: "description.1", values: ["reach", "motes"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "dwell.0", values: [], when: function (context) { return read(context.detail.values, ["dwell"]) === true; } },
        { key: "dwell.1", values: [], when: function (context) { return read(context.detail.values, ["dwell"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
