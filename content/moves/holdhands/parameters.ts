/**
 * 牵手 / Hold Hands —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 必中、PP 40、目标 adjacentAlly；
 *   无战斗效果，描写是「我方宝可梦之间牵手，能带来非常幸福的心情」。
 *
 * 世界化：把牵手的**连接**本身做成机制——两只宝可梦拉起手，一条暖色的链子连着他们；只要链子还在，
 *   双方每隔一小段就从彼此那里匀回一点体力（各自按自身最大生命的一个比例回复）。
 *   链子有长度：走远了连接就断，两端同时失去这份幸福。这让「待在一起」变成有意义的站位要求。
 *   任何活着的伙伴都能牵手，不限于宝可梦。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach       起手距离：基础 3 格 + 速度/120，夹 3..5；要够近才牵得上。
 *   linkRange   链子长度：基础 3.5 格 + 亲密度/60 + 身高×0.3，夹 3..8；感情越深、身板越大，链子越长。
 *   linkTicks   连接时长：基础 140 刻 + 等级×1.5 + 亲密度×0.4，紧握 ×0.7、松开 ×1.3，夹 100..360。
 *   healShare   每拍回复：基础 2% + 特攻/3000 + 亲密度/8000，紧握 ×1.4、松开 ×0.85，夹 1.2%..5%。
 *   healInterval 回复间隔：基础 20 刻 − 速度×0.01，夹 15..25；快的个体匀得更勤。
 *   motes       心光数量：基础 16 + 亲密度×0.08，夹 12..40；链子与持续心光的粒子量。
 *   tempo / aftercast / recharge：起手、收招、冷却，随速度与等级变化。
 * 配置 tight（紧握）双向取舍：紧握＝每拍回复 ×1.4，但连接 ×0.7、链子 ×0.85（短促深疗）；
 *   松开＝每拍 ×0.85，但连接 ×1.3、链子 ×1.15（长距离慢疗）。
 */
namespace PokemonSkills {
    export const holdhandsId = "holdhands";
    export const holdhandsEffect = "world_combat:hand_in_hand";
    export const holdhandsLink = "world_combat:holdhands_link";
    export const holdhandsScene = "world_combat:move_holdhands";
    export const holdhandsStatus = "holdhands";
    export const holdhandsClaspText = "world_combat.move.holdhands.text.clasp";
    export const holdhandsSnapText = "world_combat.move.holdhands.text.snap";
    export const holdhandsFadeText = "world_combat.move.holdhands.text.fade";

    actionParameters.define(holdhandsId, {
        reach: formula(
            F.base(3).plus(F.stat("speed").div(120).min(2)).clamp(3, 5).round(1),
            "起手距离", { unit: " 格", description: "要牵到伙伴的手所需的最大距离；速度越快够得越远。" }),
        linkRange: formula(
            F.base(3.5).plus(F.individual("friendship").div(60)).plus(F.body("height").times(0.3)).clamp(3, 8).round(1),
            "链子长度", { unit: " 格", description: "牵着手的两人能拉开多远；超出就会断；亲密度与体型延长它。" }),
        linkTicks: seconds(
            F.base(140).plus(F.level().times(1.5)).plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("tight"), F.const(0.7), F.const(1.3)))
                .clamp(100, 360).round(0),
            "连接时长", "牵手能维持多久；等级与亲密度延长它，紧握更短、松开更久。"),
        healShare: percent(
            F.base(0.02).plus(F.stat("specialAttack").div(3000)).plus(F.individual("friendship").div(8000))
                .times(F.when(F.pref("tight"), F.const(1.4), F.const(0.85)))
                .clamp(0.012, 0.05).round(4),
            "每拍回复", "每隔一小段，双方各按自身最大生命回复的比例；紧握更深、松开更浅。"),
        healInterval: seconds(
            F.base(20).minus(F.stat("speed").times(0.01)).clamp(15, 25).round(0),
            "回复间隔", "每隔多久匀一次体力；速度越快越勤。"),
        motes: formula(
            F.base(16).plus(F.individual("friendship").times(0.08)).clamp(12, 40).round(0),
            "心光数量", { unit: " 点", description: "链子与持续心光的粒子量；亲密度越高越多。" }),
        tempo: seconds(F.base(6).minus(F.stat("speed").times(0.01)).clamp(3, 9).round(0), "起手",
            "伸手牵住伙伴需要多久；速度越快越短。"),
        aftercast: seconds(F.base(6).minus(F.stat("speed").times(0.008)).clamp(3, 8).round(0), "收招",
            "牵好之后的收势。"),
        recharge: seconds(F.base(60).minus(F.level().times(0.3)).clamp(35, 80).round(0), "冷却",
            "两次牵手之间的等待；等级越高越熟练。")
    });

    describe(holdhandsId, [
        { key: "description.0", values: ["healShare", "linkTicks"] },
        { key: "description.1", values: ["reach", "linkRange", "healInterval"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "stance.tight", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "stance.loose", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
