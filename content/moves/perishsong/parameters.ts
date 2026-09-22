/**
 * 灭亡之歌 / perishsong —— 参数与机制数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中 必中、PP 5、场上全体；听见歌声的宝可梦经过 3 回合陷入濒死，
 *   替换后效果消失（volatile 随退场移除）；防音特性可免疫。
 *
 * 世界化：当众唱起一首三拍子的歌——半径内所有活物（包括唱的人自己）都被歌声缠上，
 *   每过一拍就离倒下更近一步；走出这场交战、被牛奶解掉、或撑到歌自己走完都会结清。
 *   它是一首同归于尽的歌：唱的人也在名单里，所以只有在自己比对手更能撑、或本来就打算换命时才划算。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数）：
 *   songRadius   4 + 特攻×0.04 + 身高×0.8，挽歌 ×1.3、摇篮曲 ×0.85，夹 3..14 格；嗓门与身板决定歌声传多远。
 *   turnTicks    90 + (等级 − 20)×1.2 + 速度×0.3，挽歌 ×1.35、摇篮曲 ×0.75，夹 50..200 刻；一拍有多长。
 *   motes        12 + 特攻×0.12，夹 12..32 个；画面里的音符数量。
 *   tempo        14 − (速度 − 40)×0.03，夹 8..18 刻；起唱要多久。
 *   aftercast    8 + (身高 − 1.4)×1.0，夹 6..12 刻。
 *   recharge     300 − (等级 − 20)×0.8，挽歌 ×1.15、摇篮曲 ×0.85，夹 180..360 刻。
 * 三拍固定 = 3（原生「经过 3 回合」的身份常量）。配置 dirge（挽歌）双向取舍：开启＝歌声传得更远、每一拍更长，
 *   但冷却更久；关闭（摇篮曲）＝传得更近、每一拍更短、冷却更短——名单更小，但结清得更快。
 */
namespace PokemonSkills {
    export const perishId = "perishsong";
    export const perishEffect = "world_combat:perish_song";
    export const perishCount = "world_combat:perish_count";
    export const perishScene = "world_combat:move_perishsong";
    export const perishStatus = "perish_song";
    export const perishSongText = "world_combat.move.perishsong.text.song";
    export const perishDoomText = "world_combat.move.perishsong.text.doom";
    export const perishLiftText = "world_combat.move.perishsong.text.lift";

    function perishPreference(): Formula.Node {
        return F.pref("dirge", { key: "worldcombat.skill.perishsong.preference.dirge" });
    }

    actionParameters.define(perishId, {
        songRadius: formula(
            F.base(4).plus(F.stat("specialAttack").times(0.04)).plus(F.body("height").times(0.8))
                .times(F.when(perishPreference(), F.const(1.3), F.const(0.85))).clamp(3, 14).round(1),
            "歌声半径", {
                unit: " 格",
                description: "歌声能传到多远，听见的活物都在名单上；特攻越高、身板越大传得越远，挽歌更广、摇篮曲更近。"
            }),
        turnTicks: seconds(
            F.base(90).plus(F.level().minus(20).max(0).times(1.2)).plus(F.stat("speed").times(0.3))
                .times(F.when(perishPreference(), F.const(1.35), F.const(0.75))).clamp(50, 200).round(0),
            "每拍时长", "三拍里每一拍有多长；等级与速度拉长每一拍，挽歌更慢、摇篮曲更快。"),
        motes: formula(
            F.base(12).plus(F.stat("specialAttack").times(0.12)).clamp(12, 32).round(0),
            "音符数量", {
                unit: " 个",
                description: "起唱与倒计时画面里的音符数量；特攻越高越密。"
            }),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(40).max(0).times(0.03)).clamp(8, 18).round(0),
            "起唱", "把这首歌起头需要多久；速度越快越早开口。"),
        aftercast: seconds(
            F.base(8).plus(F.body("height").minus(1.4).max(0).times(1.0)).clamp(6, 12).round(0),
            "收势", "起唱之后的收势。"),
        recharge: seconds(
            F.base(300).minus(F.level().minus(20).max(0).times(0.8))
                .times(F.when(perishPreference(), F.const(1.15), F.const(0.85))).clamp(180, 360).round(0),
            "冷却", "两次起唱之间的等待；等级越高越熟练，挽歌更贵、摇篮曲更便宜。")
    });

    describe(perishId, [
        { key: "description.0", values: ["songRadius", "turnTicks"] },
        { key: "description.1", values: ["motes", "tempo", "recharge"] },
        { key: "dirge.0", values: [], when: function (context) { return read(context.detail.values, ["dirge"]) === true; } },
        { key: "dirge.1", values: [], when: function (context) { return read(context.detail.values, ["dirge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
