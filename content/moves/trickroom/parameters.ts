/**
 * 戏法空间 / trickroom 的参数与数值来源。
 *
 * 原生事实：Psychic、Status、威力 —、命中 必中、PP 5、场上伪天气 pseudoWeather trickroom，持续 5 回合，
 *   期间速度慢的宝可梦可以先行动。
 * 核心念头：施法者在地面按出一片靛紫的歪斜空间，边界是一圈反着转的波纹；站进去的人速度被倒转——
 *   慢的变快、快的变慢；空间走完，波纹反向收拢。
 * 世界化：以落点为心租出一片场地（WorldEffects.field），半径内的活体带共享身份
 *   world_combat:status/trickroom 的 MobEffect；本单元在 `world_combat:navigate` 上按「以空间基准为轴
 *   把该活体的有效速度取反」改写移动速度（宝可梦读原生速度与速度等级，其他生物读公共速度等级）。
 *   空间双方平等，走出去即恢复；「基准」与「扭转幅度」由施法者的特攻、特防与等级决定。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   spinTicks   基础 260 刻 + 等级 ×2 + 特攻 ×0.4，再乘扭转系数（强扭 ×0.8、缓扭 ×1.2），夹 160..520；
 *               空间撑多久，特攻高的人撑得久，缓扭更久。
 *   spinRadius  基础 3.6 格 + 身高 ×1.0 + 特攻 ×0.012，夹 2.8..7；身板大、特攻高铺得广。
 *   reference   基础 80 + 特攻 ×0.08 + 等级 ×0.4，夹 60..130；空间视作「不快不慢」的基准速度，
 *               扭转都绕它发生；特攻高的人把基准抬得更高。
 *   depth       基础 0.5 + 特防 ×0.0015 + 等级 ×0.003，再乘扭转系数（强扭 ×1.35、缓扭 ×0.7），夹 0.3..0.85；
 *               扭转幅度（±），越大差距拉得越开；特防高的人扭得更狠。
 *   density     基础 24 点 + 特攻 ×0.1 + 等级 ×0.3，夹 16..60；边界粒子的数量，直接驱动画面。
 *   reach       施放距离：基础 12 格，20 级起每级 +0.08，夹 9..16；等级越高按得越远。
 *   tempo       基础 14 刻 − 速度 ×0.03，夹 8..18；按出空间的起手。
 *   aftercast   基础 9 刻 − 速度 ×0.01，夹 5..12；收招。
 *   recharge    基础 175 刻 − 速度 ×0.1，夹 100..215；两次按空间之间的等待，强扭 ×1.15、缓扭 ×0.85。
 * 配置 turn（强扭／缓扭）双向取舍：强扭扭转幅度 ×1.35、时长 ×0.8、冷却 ×1.15——差距拉得开但撑得短；
 *   缓扭幅度 ×0.7、时长 ×1.2、冷却 ×0.85——扭转温和但罩得久、补得勤。
 */
namespace PokemonSkills {
    export const trickRoomId = "trickroom";
    export const trickRoomField = "world_combat:field/trickroom";
    export const trickRoomShift = "world_combat:trickroom_shift";
    export const trickRoomScene = "world_combat:move_trickroom";
    export const trickRoomStatus = "trickroom";
    export const trickRoomOpenText = "world_combat.move.trickroom.text.open";
    export const trickRoomFlipText = "world_combat.move.trickroom.text.flip";

    actionParameters.define(trickRoomId, {
        spinTicks: seconds(
            F.base(260).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.4))
                .times(F.when(F.pref("turn"), F.const(0.8), F.const(1.2)))
                .clamp(160, 520),
            "空间时长", "这片歪斜空间撑多久；等级与特攻让它更久，缓扭（×1.2）比强扭（×0.8）更持久。"),
        spinRadius: formula(
            F.base(3.6).plus(F.body("height").times(1.0)).plus(F.stat("specialAttack").times(0.012)).clamp(2.8, 7),
            "空间半径", { unit: " 格", description: "空间罩住多大一片地；身板越大、特攻越高铺得越广。" }),
        reference: formula(
            F.base(80).plus(F.stat("specialAttack").times(0.08)).plus(F.level().times(0.4)).clamp(60, 130).round(0),
            "基准速度", { unit: " 点", description: "空间视作不快不慢的那条线；慢于它的被推快、快于它的被拖慢，特攻高的人把基准抬高。" }),
        depth: percent(
            F.base(0.5).plus(F.stat("specialDefence").times(0.0015)).plus(F.level().times(0.003))
                .times(F.when(F.pref("turn"), F.const(1.35), F.const(0.7)))
                .clamp(0.3, 0.85),
            "扭转幅度", "速度被倒转的强度（±）；越大差距拉得越开，特防高的人扭得更狠，强扭 ×1.35、缓扭 ×0.7。"),
        density: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.3)).clamp(16, 60).round(0),
            "边界密度", { unit: " 点", description: "空间边界与拉扯粒子的数量；特攻与等级越高越密，粒子按它发射。" }),
        reach: formula(F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(9, 16).round(1),
            "施放距离", { unit: " 格", description: "能往多远的地面按出空间；等级越高够得越远。" }),
        tempo: seconds(F.base(14).minus(F.stat("speed").times(0.03)).clamp(8, 18).round(0), "起手",
            "按出空间需要多久；速度越快越短。"),
        aftercast: seconds(F.base(9).minus(F.stat("speed").times(0.01)).clamp(5, 12).round(0), "收招",
            "按出空间之后的收势。"),
        recharge: seconds(F.base(175).minus(F.stat("speed").times(0.1)).clamp(100, 215).round(0), "冷却",
            "两次按空间之间的等待；强扭更贵、缓扭更省。")
    });
    describe(trickRoomId, [
        { key: "description.0", values: ["spinTicks", "spinRadius"] },
        { key: "description.1", values: ["reference", "depth"] },
        { key: "description.2", values: ["density", "reach"] },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "turn.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.turn === 1); } },
        { key: "turn.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.turn !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
