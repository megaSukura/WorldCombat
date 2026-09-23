/**
 * 复生祈祷 / revivalblessing —— 参数、数值来源与共享身份。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal／变化／威力 —／命中 —／PP 1／noPPBoosts／heal／target self；
 *   说明是「通过以慈爱之心祈祷，让陷入昏厥的后备宝可梦以回复一半HP的状态复活」。
 *
 * 世界化翻译：祈祷**会真正复苏自己队伍里昏厥的伙伴**——为最近倒下的同阵营伙伴在倒下处立起光柱，若队伍里有
 *   同队昏厥者则按本招的复活比例恢复它的真实生命，并给自己与身边的伙伴挂上慈爱祝福；野生或无后备时，祈祷只落在
 *   倒下位置。倒下记录由 `world_combat:damage_applied` 里 `after <= 0` 的死亡事件收集（同伴关系用队伍／主人判定）。
 *
 * 数据分散：
 *   prayerRange   祈祷能触及多远 = 等级 ＋ 配置；它也是本招的实际射程；
 *   beaconTicks   光柱停留多久 = 等级 ＋ 配置；
 *   blessTicks    慈爱祝福时长 = 亲密度 ＋ 配置；
 *   beams         光柱里升起的光束数 = 等级；
 *   motes         落下光点 = 特防（沉静的守护）；
 *   tempo／aftercast／recharge = 速度／等级／配置。
 *
 * 配置 vigil（守夜祷告）：开启＝祈祷范围 ×1.25、光柱 ×1.35、祝福 ×1.2，代价是起手 +4、冷却 +40；
 *   关闭（简短祈祷）＝范围 ×0.85、光柱 ×0.8、祝福 ×0.9，起手与冷却更省。两向各有局面：久守 vs 快祷。
 * 无伤害段：这是祈祷＋加状态的 Status 招。
 */
namespace PokemonSkills {
    export const revivalblessingId = "revivalblessing";
    export const revivalblessingScene = "world_combat:move_revivalblessing";
    export const revivalblessingEffect = "world_combat:revival_blessing";
    export const revivalblessingStatus = "revival_blessing";
    export const revivalblessingText = "world_combat.move.revivalblessing.text.vigil";
    export const revivalblessingNoneText = "world_combat.move.revivalblessing.text.none";
    export const revivalblessingAnointText = "world_combat.move.revivalblessing.text.anoint";
    export const revivalblessingReviveText = "world_combat.move.revivalblessing.text.revive";
    /** 倒下记录的可祈祷窗口（协议常量）：超过这么久就不再回应祈祷。 */
    export var revivalblessingWindow = 1600;

    actionParameters.define(revivalblessingId, {
        /** 复活比例：原生固定为一半最大生命；这是本招自己的独立代价参数。 */
        reviveRatio: hidden(0.5),
        /** 祈祷范围：6 +（等级 − 30）×0.06 [−1,3]；守夜 ×1.25／简短 ×0.85；夹 4..14。 */
        prayerRange: formula(
            F.base(6).plus(F.level().minus(30).times(0.06).clamp(-1, 3))
                .times(F.when(F.pref("vigil", text("worldcombat.skill.revivalblessing.preference.vigil")), F.const(1.25), F.const(0.85)))
                .clamp(4, 14).round(2),
            "祈祷范围", {
                unit: " 格",
                description: "祈祷能触及多远：这个范围内有同阵营的伙伴倒下过，才立得起光柱。它也是本招的实际射程。"
            }),
        /** 光柱停留：120 +（等级 − 30）×1.5 [−20,45]；守夜 ×1.35／简短 ×0.8；夹 80..320。 */
        beaconTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.5).clamp(-20, 45))
                .times(F.when(F.pref("vigil", text("worldcombat.skill.revivalblessing.preference.vigil")), F.const(1.35), F.const(0.8)))
                .clamp(80, 320).round(0),
            "光柱停留", "祈祷光柱在原地立多久；等级越高、守夜祷告时留得越久。"),
        /** 慈爱祝福：100 + 亲密度 ÷ 3；守夜 ×1.2／简短 ×0.9；夹 80..240。 */
        blessTicks: seconds(
            F.base(100).plus(F.individual("friendship").div(3))
                .times(F.when(F.pref("vigil", text("worldcombat.skill.revivalblessing.preference.vigil")), F.const(1.2), F.const(0.9)))
                .clamp(80, 240).round(0),
            "慈爱祝福", "施法者与身边伙伴身上「复生祝福」身份的时长；亲密度越高留得越久。"),
        /** 光束数：6 +（等级 − 30）×0.2 [−2,6]；夹 4..14。 */
        beams: formula(
            F.base(6).plus(F.level().minus(30).times(0.2).clamp(-2, 6)).clamp(4, 14).round(0),
            "光束数", {
                unit: " 束",
                description: "祈祷时从地面升起的光束数量，直接驱动表现；等级越高越多。"
            }),
        /** 光点数：24 + 特防 ÷ 8；夹 14..56。 */
        motes: formula(
            F.base(24).plus(F.stat("specialDefence").div(8)).clamp(14, 56).round(0),
            "光点数", {
                unit: " 点",
                description: "光柱里飘落的光点数量；特防越高越密。"
            }),
        /** 起手：12 −（速度 − 50）×0.02 [−1,2]；守夜 +4；夹 8..20。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("vigil", text("worldcombat.skill.revivalblessing.preference.vigil")), F.const(4), F.const(0)))
                .clamp(8, 20).round(0),
            "起手", "以慈爱之心祈祷需要的时间；速度越快越短，守夜祷告先跪定。"),
        /** 收招：10；夹 6..16。 */
        aftercast: seconds(F.base(10).clamp(6, 16).round(0), "收招", "祈祷后的收势时间。"),
        /** 冷却：240 +（等级 − 30）×0.6 [−8,16]；守夜 +40／简短 −12；夹 160..360。 */
        recharge: seconds(
            F.base(240).plus(F.level().minus(30).times(0.6).clamp(-8, 16))
                .plus(F.when(F.pref("vigil", text("worldcombat.skill.revivalblessing.preference.vigil")), F.const(40), F.const(-12)))
                .clamp(160, 360).round(0),
            "冷却", "再做一次祈祷前的等待；等级越高越熟练，守夜祷告更费、简短祈祷更省。")
    });

    stages(revivalblessingId, [
        { level: 40, values: { prayerRange: 8, recharge: 210 } },
        { level: 58, values: { prayerRange: 10, beaconTicks: 220, recharge: 180 } }
    ]);

    describe(revivalblessingId, [
        { key: "description.0", values: ["prayerRange"] },
        { key: "description.1", values: ["blessTicks"] },
        { key: "vigil.on", values: [], when: function (context) { return read(context.detail.values, ["vigil"]) === true; } },
        { key: "vigil.off", values: [], when: function (context) { return read(context.detail.values, ["vigil"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.prayerRange"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.prayerRange"] }
    ]);
}
