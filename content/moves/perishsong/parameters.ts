/**
 * 灭亡之歌 / perishsong —— 参数与机制数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中 必中、PP 5、场上全体；听见歌声的宝可梦经过 3 回合陷入濒死，
 *   替换后效果消失（volatile 随退场移除）；防音特性可免疫。
 *
 * 世界化：起唱时以施法者为中心定下一块固定「歌域」，把最近的其他活物（最多 11 名）连同自己写进名单；
 *   施法者必须占用动作在原地唱完三拍，每拍结束名单上仍留在歌域里的人数就少一档。
 *   末拍对名单上仍带着本曲 carrier 的每个活物（友敌与施法者自己同规则）结算一次有限的固定世界伤害。
 *   离开歌域的目标立刻脱出本次名单、之后回到圈内也不再进入；取消、换下或死亡会终止整首歌，不结算。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数）：
 *   songRadius  4 + 特攻×0.04 + 身高×0.8，挽歌 ×1.3、摇篮曲 ×0.85，夹 3..14 格；嗓门与身板决定歌域多大。
 *   beatTicks   旧每拍(90 + (等级 − 20)×1.2 + 速度×0.3) × 挽歌1.35／摇篮曲0.75 后取四分之一，夹 20..40 刻。
 *   judge       28 + 特攻×0.55 + 等级×0.4，夹 28..170 世界伤害；末拍每名名单一份，由施法者而非受害者决定。
 *   motes       12 + 特攻×0.12，夹 12..32 个；起唱与歌域画面里的音符数量（内部表现，不在玩家数值里显示）。
 *   tempo       14 − (速度 − 40)×0.03，夹 8..18 刻；起唱要多久。
 *   aftercast   8 + (身高 − 1.4)×1.0，夹 6..12 刻。
 *   recharge    300 − (等级 − 20)×0.8，挽歌 ×1.15、摇篮曲 ×0.85，夹 180..360 刻。
 * 三拍固定 = 3（原生「经过 3 回合」的身份常量）。配置 dirge（挽歌）双向取舍：开启＝歌域更大、每拍更长，
 *   但冷却更久；关闭（摇篮曲）＝歌域更近、每拍更短、冷却更短——名单更小，但结算得更快。
 */
namespace PokemonSkills {
    export const perishId = "perishsong";
    export const perishEffect = "world_combat:perish_song";
    export const perishScene = "world_combat:move_perishsong";
    export const perishNotesScene = "world_combat:move_perishsong_notes";
    export const perishDomainScene = "world_combat:move_perishsong_domain";
    export const perishStatus = "perish_song";
    export const perishTurns = 3;
    export const perishTargets = 12;
    export const perishSongText = "world_combat.move.perishsong.text.song";
    export const perishDoomText = "world_combat.move.perishsong.text.doom";
    export const perishWithstandText = "world_combat.move.perishsong.text.withstand";
    export const perishLiftText = "world_combat.move.perishsong.text.lift";
    export const perishResistText = "world_combat.move.perishsong.text.resist";

    function perishPreference(): Formula.Node {
        return F.pref("dirge", { key: "worldcombat.skill.perishsong.preference.dirge" });
    }

    actionParameters.define(perishId, {
        songRadius: formula(
            F.base(4).plus(F.stat("specialAttack").times(0.04)).plus(F.body("height").times(0.8))
                .times(F.when(perishPreference(), F.const(1.3), F.const(0.85))).clamp(3, 14).round(1),
            "歌域半径", {
                unit: " 格",
                description: "起唱时以自身为圆心固定下来的歌域半径；歌声穿墙，只在圈内按距离判定，出圈立即脱出名单。特攻越高、身板越大歌域越广，挽歌更广、摇篮曲更近。"
            }),
        beatTicks: seconds(
            F.base(90).plus(F.level().minus(20).max(0).times(1.2)).plus(F.stat("speed").times(0.3))
                .times(F.when(perishPreference(), F.const(1.35), F.const(0.75)))
                .times(0.25).clamp(20, 40).round(0),
            "每拍时长", "三拍里每一拍有多长，20–40 刻；等级与速度拉长每一拍，挽歌更慢、摇篮曲更快。"),
        judge: formula(
            F.base(28).plus(F.stat("specialAttack").times(0.55)).plus(F.level().times(0.4)).clamp(28, 170).round(0),
            "末拍伤害", {
                unit: " 点",
                description: "末拍对名单上每个仍留在歌域里的活物结算的固定世界伤害；由施法者特攻与等级决定，不取受害者当前生命比例，也不按 Boss／普通归一化。"
            }),
        motes: formula(
            F.base(12).plus(F.stat("specialAttack").times(0.12)).clamp(12, 32).round(0),
            "音符数量", {
                unit: " 个",
                description: "起唱与歌域画面里的音符数量；特攻越高越密（内部表现量，不单独显示给玩家）。"
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
        { key: "description.0", values: ["songRadius", "beatTicks"] },
        { key: "description.1", values: ["judge", "recharge"] },
        { key: "description.additional", values: [] },
        { key: "dirge.0", values: [], when: function (context) { return read(context.detail.values, ["dirge"]) === true; } },
        { key: "dirge.1", values: [], when: function (context) { return read(context.detail.values, ["dirge"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] }
    ]);
}
