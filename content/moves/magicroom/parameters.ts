/**
 * 魔法空间 / magicroom 的参数与数值来源。
 *
 * 原生事实：Psychic、Status、威力 —、命中 必中、PP 10、场上伪天气 pseudoWeather magicroom，持续 5 回合，
 *   期间所有宝可梦携带道具的效果都会消失。
 * 核心念头：施法者在地面撑开一片银灰的静默空间，圈内所有携带物的微光被吸走；道具的轮廓还在，
 *   力量却传不出来；空间散去，光回到道具上。
 * 世界化：以落点为心租出一片场地（WorldEffects.field），半径内的活体带共享身份
 *   world_combat:status/magicroom 的 MobEffect；宝可梦成员额外叠加共享的临时压制层
 *   （NativeModifiers 的 suppressItems），于是所有读取持有物的结算（攻击、防御、受伤、机动、特性触发）
 *   都读到「没有携带物」。走出去立刻解除；其他生物只带身份。对双方一视同仁。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gagTicks   基础 250 刻 + 等级 ×2 + 特攻 ×0.3，再乘沉默系数（长默 ×1.2、快默 ×0.8），夹 160..520；
 *              空间撑多久，特攻高的人撑得久。
 *   gagRadius  基础 3.4 格 + 身高 ×0.9 + 特攻 ×0.012，再乘沉默系数（长默 ×1.1、快默 ×0.9），夹 2.4..6.8；
 *              身板大、特攻高铺得广。
 *   density    基础 22 点 + 特攻 ×0.1 + 等级 ×0.3，夹 14..56；被吸走的道具微光数量，直接驱动画面。
 *   reach      施放距离：基础 12 格，20 级起每级 +0.08，夹 9..16；等级越高够得越远。
 *   tempo      基础 13 刻 − 速度 ×0.03，夹 8..17；撑开空间的起手，长默 +2 刻。
 *   aftercast  基础 8 刻 − 速度 ×0.01，夹 4..11；收招。
 *   recharge   基础 175 刻 − 速度 ×0.1，夹 100..215；两次撑空间之间的等待，长默 ×1.15、快默 ×0.85。
 * 配置 hush（长默／快默）双向取舍：长默更久更广（时长 ×1.2、半径 ×1.1），代价是起手 +2、冷却 ×1.15；
 *   快默更短更小（时长 ×0.8、半径 ×0.9），换来起手不增、冷却 ×0.85。
 */
namespace PokemonSkills {
    export const magicRoomId = "magicroom";
    export const magicRoomField = "world_combat:field/magicroom";
    export const magicRoomGag = "world_combat:magicroom_gag";
    export const magicRoomScene = "world_combat:move_magicroom";
    export const magicRoomStatus = "magicroom";
    export const magicRoomOpenText = "world_combat.move.magicroom.text.open";
    export const magicRoomGagText = "world_combat.move.magicroom.text.gag";

    actionParameters.define(magicRoomId, {
        gagTicks: seconds(
            F.base(250).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.3))
                .times(F.when(F.pref("hush"), F.const(1.2), F.const(0.8)))
                .clamp(160, 520),
            "空间时长", "静默空间撑多久；等级与特攻让它更久，长默（×1.2）比快默（×0.8）更持久。"),
        gagRadius: formula(
            F.base(3.4).plus(F.body("height").times(0.9)).plus(F.stat("specialAttack").times(0.012))
                .times(F.when(F.pref("hush"), F.const(1.1), F.const(0.9)))
                .clamp(2.4, 6.8),
            "空间半径", { unit: " 格", description: "空间罩住多大一片地；身板越大、特攻越高铺得越广。" }),
        density: formula(
            F.base(22).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.3)).clamp(14, 56).round(0),
            "静默密度", { unit: " 点", description: "被吸走的道具微光数量；特攻与等级越高越密，粒子按它发射。" }),
        reach: formula(F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(9, 16).round(1),
            "施放距离", { unit: " 格", description: "能往多远的地面撑开空间；等级越高够得越远。" }),
        tempo: seconds(F.base(13).minus(F.stat("speed").times(0.03)).clamp(8, 17).round(0), "起手",
            "撑开空间需要多久；速度越快越短，长默多花 2 刻。"),
        aftercast: seconds(F.base(8).minus(F.stat("speed").times(0.01)).clamp(4, 11).round(0), "收招",
            "撑开空间之后的收势。"),
        recharge: seconds(F.base(175).minus(F.stat("speed").times(0.1)).clamp(100, 215).round(0), "冷却",
            "两次撑空间之间的等待；长默更贵、快默更省。")
    });
    describe(magicRoomId, [
        { key: "description.0", values: ["gagTicks","gagRadius"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "hush.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.hush === 1); } },
        { key: "hush.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.hush !== 1; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] }
    ]);
}
