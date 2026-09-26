/**
 * 庆祝 / celebrate 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 必中、PP 40、目标 self、
 *   `onTryHit` 只播一条「为特别的你庆祝」；它是活动配信的一招，原作里同样不影响战斗。
 *
 * 世界化：把「为十分开心的你庆祝」翻成**一场会传染的庆祝**——施法者原地撒出一圈彩带与礼花，
 *   身边所有友方（含自己）都被这份欢喜感染，带上一段共享身份 world_combat:status/celebrate 的「庆祝中」状态。
 *   这份休整收益有两种表达，由配置选择：助兴给每个人一股短暂的行进劲（移动速度提高，挨一下打就散），
 *   慰劳则当场按各自已失生命分掉一份体力（越伤补得越多）。它对敌人完全无效，也不给任何攻击收益。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   partyRadius 基础 3 格 + 亲密度/40 + 碰撞箱高×0.3，夹 2.5..7；感情越深越想把身边人也拉进来。
 *   spiritTicks 基础 100 刻 + 亲密度×0.8 + 等级×1.5，夹 80..320；「庆祝中」这份标记在身上留多久。
 *   marchTicks  基础 60 刻 + 等级×0.6 + 亲密度×0.15，夹 40..140；助兴的这股行进劲留多久（短暂）。
 *   marchSpeed  基础 15% + 速度/2000 + 等级/1000，夹 12%..45%；助兴提高的移动速度比例，挨打即退。
 *   mend        基础 6% + 亲密度/2500 + 等级/2000，夹 2%..20%；慰劳按各自**已失生命**的这比例补回。
 *   confetti    基础 24 点 + 亲密度×0.5 + 等级×0.6，夹 20..90；彩带与礼花粒子的总量。
 *   streamers   基础 3 拍 + 等级/25，夹 3..6；礼花喷几拍。
 *   tempo       基础 6 刻 − 速度×0.02，夹 3..9；起手。
 *   aftercast   基础 7 刻 + 碰撞箱高×1.0，夹 5..11；收招。
 *   recharge    基础 70 刻 − 等级×0.3，夹 40..95；两场庆祝之间的等待。PP 40。
 * 配置 vigor（慰劳）双向取舍：开启＝按已失生命回一口、越伤越有用，但没有行进劲；关闭（助兴）＝移动更快，
 *   但挨打即退、不回血。两个方向各有局面。
 */
namespace PokemonSkills {
    export const celebrateId = "celebrate";
    export const celebrateEffect = "world_combat:celebrate_spirit";
    export const celebrateScene = "world_combat:move_celebrate";
    export const celebrateCheerText = "world_combat.move.celebrate.text.cheer";
    export const celebrateMendText = "world_combat.move.celebrate.text.mend";

    actionParameters.define(celebrateId, {
        partyRadius: formula(
            F.base(3).as("基础").plus(F.individual("friendship").div(40).as("亲密度")).plus(F.body("height").times(0.3).as("身板"))
                .clamp(2.5, 7).round(2),
            "庆祝半径", {
                unit: " 格",
                description: "这一场庆祝能感染多大一圈友方；亲密度越高、身板越大，越想把身边人也拉进来。"
            }),
        spiritTicks: seconds(
            F.base(100).as("基础").plus(F.individual("friendship").times(0.8).as("亲密度")).plus(F.level().times(1.5).as("等级"))
                .clamp(80, 320).round(0),
            "庆祝标记", "「庆祝中」这份标记在身上留多久；亲密度与等级越高留得越久。"),
        marchTicks: seconds(
            F.base(60).as("基础").plus(F.level().times(0.6).as("等级")).plus(F.individual("friendship").times(0.15).as("亲密度"))
                .clamp(40, 140).round(0),
            "鼓舞时长", "助兴式下，这一股行进劲在身上留多久；等级与亲密度越高越久，挨一下打就提前散掉。"),
        marchSpeed: percent(
            F.base(0.15).as("基础").plus(F.stat("speed").div(2000).as("速度")).plus(F.level().div(1000).as("等级"))
                .clamp(0.12, 0.45).round(3),
            "行进增益", "助兴式下，被庆祝到的友方移动速度提高的比例；速度与等级越高越明显。受到伤害即刻退去。"),
        mend: percent(
            F.base(0.06).as("基础").plus(F.individual("friendship").div(2500).as("亲密度")).plus(F.level().div(2000).as("等级"))
                .clamp(0.02, 0.2).round(4),
            "慰劳回复", "慰劳式下，每个被庆祝到的友方各按自身**已失生命**的这个比例回补；越伤补得越多，亲密度与等级越高分得越多。"),
        confetti: formula(
            F.base(24).as("基础").plus(F.individual("friendship").times(0.5).as("亲密度")).plus(F.level().times(0.6).as("等级"))
                .clamp(20, 90).round(0),
            "彩带数量", {
                unit: " 件",
                description: "撒出的彩带与礼花粒子总量；亲密度与等级越高越热闹，粒子按它发射。"
            }),
        streamers: formula(
            F.base(3).plus(F.level().div(25).as("等级")).clamp(3, 6).round(0),
            "礼花拍数", {
                unit: " 拍",
                description: "礼花喷几拍；等级越高越热闹，画面按它一拍一拍地放。"
            }),
        tempo: seconds(F.base(6).minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 9).round(0), "起手",
            "就地起庆祝需要多久；速度越快越短。"),
        aftercast: seconds(F.base(7).plus(F.body("height").times(1.0).as("身板")).clamp(5, 11).round(0), "收招",
            "庆祝落定后的收势；身板越大越慢。"),
        recharge: seconds(F.base(70).minus(F.level().times(0.3).as("等级")).clamp(40, 95).round(0), "冷却",
            "两场庆祝之间的等待；等级越高越短。PP 40。")
    });

    describe(celebrateId, [
        { key: "description.0", values: ["partyRadius","spiritTicks"] },
        { key: "vigor.on", values: ["mend"], when: function (context) { return read(context.detail.values, ["vigor"]) === true; } },
        { key: "vigor.off", values: ["marchTicks", "marchSpeed"], when: function (context) { return read(context.detail.values, ["vigor"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
