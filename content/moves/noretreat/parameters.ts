/** A finite local oath: individual stats scale lifetime, area and presentation; temporary boosts honor native stage policies. */
namespace PokemonSkills {
    export const noRetreatId = "noretreat";
    export const noRetreatScene = "world_combat:move_noretreat";
    export const noRetreatEffect = "world_combat:no_retreat";
    export const noRetreatStand = "world_combat:noretreat_stand";
    export const noRetreatRootText = "world_combat.move.noretreat.text.root";
    export const noRetreatReleaseText = "world_combat.move.noretreat.text.release";

    actionParameters.define(noRetreatId, {
        standTicks: seconds(
            F.base(200).plus(F.level().times(2).as("经验")).plus(F.stat("defence").times(0.6).as("防御"))
                .times(F.when(F.pref("rush", text("worldcombat.skill.noretreat.preference.rush")), F.const(0.5), F.const(1)))
                .clamp(160, 440).round(0),
            "立誓时长", "把自己钉在原地多久；等级与防御越高站得越久，疾战式只站一半。时长走完或被打倒才拔脚。"),
        surge: formula(
            F.base(14).plus(F.stat("attack").times(0.15).as("物攻")).clamp(12, 34).round(0),
            "力量迸发", {
                unit: " 点", visible: false,
                description: "怒吼顶起那一下喷出的力场粒子量；物攻越高越多，也是画面的吞吐量。"
            }),
        ring: formula(
            F.base(1.2).plus(F.body("weight").div(70).as("体重")).times(1.6).clamp(2.4, 4.16).round(2),
            "阵环半径", {
                unit: " 格", visible: true,
                description: "固定阵界的真实半径，圈内可自由走位；体重更大时可用范围更宽。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).as("速度")).clamp(7, 16).round(0),
            "起手", "沉腰、怒吼、把力顶起来需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(6, 13).round(0),
            "收招", "怒吼之后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(160).minus(F.level().times(0.6).as("经验"))
                .times(F.when(F.pref("rush", text("worldcombat.skill.noretreat.preference.rush")), F.const(0.75), F.const(1)))
                .clamp(90, 220).round(0),
            "冷却", "两次立誓之间的等待；等级越高越熟练，疾战式更短。PP 5 的代价。")
    });

    stages(noRetreatId, [
        { level: 45, values: { standTicks: 300, recharge: 130 } }
    ]);

    describe(noRetreatId, [
        { key: "description.0", values: ["standTicks"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo","aftercast","recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["rush"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["rush"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.standTicks", "tier.0.recharge"] }
    ]);
}
