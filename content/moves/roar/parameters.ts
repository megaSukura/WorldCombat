/**
 * 吼叫 / roar —— 第 078 组「强制退场」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：一般、变化、PP 20、优先度 -6、命中 100；说明是
 *   「放走对手，强制拉后备宝可梦上场；如果对手为野生宝可梦，战斗将直接结束」。
 * - 即时战斗翻译：一声吼，以自己为中心把声浪贴地铺开一圈，圈里的所有敌人被震慑、失去当前目标并被逐出
 *   交战圈（溃退），没有伤害；有合法后备的对手会被原生队伍操作真正换下，野生或没有后备时只逐退。
 *   它是本组唯一绕身一圈、唯一不挑方向的逐退，靠威势而不是推击；代价是射程短、起手慢、冷却长。
 *   溃退即共享身份 `world_combat:status/routed`（本单元效果 world_combat:roar_routed）：
 *   带着它的活体会失去目标，并在一段时间里每 10 刻被从施法者身边逐开一步。
 * - 参数分散到精灵数据：声浪半径取特攻（嗓门）与身高（肺量），溃退时长取物攻（凶悍）与等级（名望），
 *   每刻驱逐步长取体重（分量），驱逐保持距离取防御（镇不镇得住），起手／收招／冷却取速度与等级，
 *   声波道数取特攻。同一招在两只精灵手里，半径、时长、步长、节奏各不相同。
 * - 配置 unleash（狂啸）：开启＝声浪 ×1.25、持续时间 ×1.15，代价是起手 +3 刻、冷却 +20 刻；
 *   关闭＝出手更快、冷却更短、声浪较窄。一次逼退得更开更久，换更长的站定与等待。
 */
namespace PokemonSkills {
    export const roarId = "roar";
    export const roarRouted = "world_combat:roar_routed";
    export const roarRout = "world_combat:roar_rout";
    export const roarScene = "world_combat:move_roar";
    export const roarWaveText = "world_combat.move.roar.text.wave";
    export const roarMissText = "world_combat.move.roar.text.miss";
    export const roarSwitchText = "world_combat.move.roar.text.switch";

    actionParameters.define(roarId, {
        /** 声浪半径：基础 4.4 格；特攻每比 60 多 1 加 0.022（夹 -0.8..+1.8），身高每比 1.4 高 1 米加 0.7（夹 -0.4..+1.4）；unleash ×1.25；夹在 3..9.5 格。 */
        reach: formula(
            F.base(4.4, "声浪半径")
                .plus(F.stat("specialAttack").minus(60).times(0.022).clamp(-0.8, 1.8))
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.4, 1.4))
                .times(F.when(F.pref("unleash", text("worldcombat.skill.roar.preference.unleash")), F.const(1.25), F.const(1)))
                .clamp(3, 9.5).round(2),
            "声浪半径", {
                unit: " 格",
                description: "以施法者为中心吼开多大一圈（地面与空中一起算）；嗓门大、体格高铺得更开，狂啸再 ×1.25。它同时是本招的实际射程与指示圈半径。"
            }),
        /** 溃退时长：基础 70 刻 +（物攻 − 60）×0.28（夹 -10..+32）+ 等级 ×0.7；unleash ×1.15；夹在 50..200 刻。 */
        flee: seconds(
            F.base(70, "溃退时长")
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-10, 32))
                .plus(F.level().times(0.7))
                .times(F.when(F.pref("unleash", text("worldcombat.skill.roar.preference.unleash")), F.const(1.15), F.const(1)))
                .clamp(50, 200).round(0),
            "溃退时长", "被吼退的敌人多久失去斗志；越凶悍、等级越高的个体吼得越久，狂啸更长。"),
        /** 驱逐步长：基础 0.7 格 +（体重 − 50）×0.006（夹 -0.1..+0.6）；夹在 0.5..1.4 格。 */
        panic: formula(
            F.base(0.7, "驱逐步长")
                .plus(F.body("weight").minus(50).times(0.006).clamp(-0.1, 0.6))
                .clamp(0.5, 1.4).round(2),
            "驱逐步长", {
                unit: " 格",
                description: "溃退期间每 10 刻把敌人从你身边逐开多远；身子越重的个体推得越开。"
            }),
        /** 保持距离：基础 3.0 格 +（防御 − 60）×0.012（夹 -0.4..+0.8）+（身高 − 1.4）×0.4（夹 -0.2..+0.8）；夹在 2.6..6 格。 */
        keepOut: formula(
            F.base(3.0, "保持距离")
                .plus(F.stat("defence").minus(60).times(0.012).clamp(-0.4, 0.8))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.8))
                .clamp(2.6, 6).round(2),
            "保持距离", {
                unit: " 格",
                description: "溃退期间敌人只要离你不足这么远，就会被再一次逐开；越镇得住场面、体格越高，逼得越远。"
            }),
        /** 起手：基础 9 刻 −（速度 − 60）×0.03（夹 -2..+2）；unleash +3；夹在 5..15 刻。 */
        tempo: seconds(
            F.base(9, "起手")
                .minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("unleash", text("worldcombat.skill.roar.preference.unleash")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "鼓起声浪再吼出去要多久；速度越快越早，狂啸要多花几刻。"),
        /** 收招：基础 8 刻 −（速度 − 60）×0.02（夹 -2..+2）；夹在 5..12 刻。 */
        recover: seconds(
            F.base(8, "收招")
                .minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .clamp(5, 12).round(0),
            "收招", "吼完收声的时间；快的个体收得干脆。"),
        /** 冷却：基础 110 刻 − 等级 ×0.4；unleash +20、常吼 −10；夹在 80..170 刻。 */
        wait: seconds(
            F.base(110, "冷却")
                .minus(F.level().times(0.4))
                .plus(F.when(F.pref("unleash", text("worldcombat.skill.roar.preference.unleash")), F.const(20), F.const(-10)))
                .clamp(80, 170).round(0),
            "冷却", "两次吼叫之间的等待；等级越高越熟练，狂啸更久，常吼更短。PP 20 的代价。"),
        /** 声波道数：基础 12 道 +（特攻 − 60）×0.18（夹 -3..+20）；夹在 10..34 道；驱动画面里的声浪数量。 */
        waves: formula(
            F.base(12, "声波道数")
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-3, 20))
                .clamp(10, 34).round(0),
            "声波道数", {
                unit: " 道",
                description: "吼开时一圈里铺开的声波道数；嗓门越大越多，画面里的声波也按它发射。"
            })
    });

    stages(roarId, [
        { level: 30, values: { reach: 5.4, flee: 92 } },
        { level: 50, values: { reach: 6.6, flee: 122, waves: 26 } }
    ]);

    describe(roarId, [
        { key: "description.0", values: ["reach", "waves"] },
        { key: "description.1", values: ["flee", "keepOut", "panic"] },
        { key: "description.2", values: [] },
        { key: "unleash.on", values: [], when: function (context) { return read(context.detail.values, ["unleash"]) === true; } },
        { key: "unleash.off", values: [], when: function (context) { return read(context.detail.values, ["unleash"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.flee"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.flee", "tier.1.waves"] }
    ]);
}
