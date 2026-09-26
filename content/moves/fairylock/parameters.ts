/** Symmetric finite boundary: individual speed and special stats scale its radius, duration and lattice. */
namespace PokemonSkills {
    export const fairyId = "fairylock";
    export const fairyScene = "world_combat:move_fairylock";
    export const fairySeal = "world_combat:fairy_lock";
    export const fairyNet = "world_combat:fairy_lock_net";
    export const fairySealText = "world_combat.move.fairylock.text.seal";
    export const fairyReleaseText = "world_combat.move.fairylock.text.release";
    export const fairyCaughtText = "world_combat.move.fairylock.text.caught";

    actionParameters.define(fairyId, {
        radius: formula(
            F.base(5).plus(F.level().times(0.04).as("经验")).plus(F.body("height").times(0.3).as("身板"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(0.8), F.const(1)))
                .clamp(4, 8).round(1),
            "封印半径", {
                unit: " 格",
                description: "光栅围住多大一圈；圈内每个活体（含术者）都会被钉住。等级与身板越大越广，深锁式收窄。"
            }),
        sealTicks: seconds(
            F.base(60).plus(F.stat("specialDefence").times(1.0).as("特防"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(1.4), F.const(1)))
                .clamp(50, 140).round(0),
            "封印时长", "光栅维持多久；特防越高撑得越久，深锁式再延长。时长一到光栅散开、全员恢复自由。"),
        lattice: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.2).as("特攻")).clamp(14, 34).round(0),
            "光栅道数", {
                unit: " 道",
                description: "竖向光栅的密度；特攻越高越密，也是画面里光栅粒子的数量。"
            }),
        bars: formula(
            F.base(6).plus(F.level().times(0.1).as("经验")).clamp(6, 14).round(0),
            "光栅立柱", {
                unit: " 根",
                description: "一圈立柱的根数；等级越高越多，画面里立柱也随之增多。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).as("速度"))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(4), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把光栅从天上召下来需要多久；速度越快越短，深锁式要多聚几刻。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(5, 12).round(0),
            "收招", "光栅落地后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(120).minus(F.level().times(0.5).as("经验"))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(20), F.const(0)))
                .clamp(80, 160).round(0),
            "冷却", "两次封印之间的等待；等级越高越熟练，深锁式更费。PP 10 的代价。")
    });

    stages(fairyId, [
        { level: 45, values: { radius: 6.0, recharge: 100 } }
    ]);

    describe(fairyId, [
        { key: "description.0", values: ["radius","sealTicks"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo","aftercast","recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius", "tier.0.recharge"] }
    ]);
}
