/** haze：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const hazeId = "haze";
    export const hazeEffect = "world_combat:haze_veil";
    export const hazeScene = "world_combat:move_haze";
    export const hazeClearedText = "world_combat.move.haze.text.cleared";
    export const hazeEmptyText = "world_combat.move.haze.text.empty";
    /** 黑雾会抹平的能力等级项；宝可梦还含命中与闪避，其他活体只有五项。 */
    export const hazeStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    /** 被抹平后的可见标记时长：三秒内物品栏里能看到「刚被抹平」这层共享身份。 */
    export const hazeMarkTicks = 60;

    /** 一份可读的能力等级快照（宝可梦读原生等级，其他活体读公共阶梯）。 */
    export function hazeStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    actionParameters.define(hazeId, {
        fogRadius: formula(
            F.base(4).as("基础").plus(F.level().times(0.03).as("经验")).plus(F.body("height").times(0.3).as("身板"))
                .times(F.when(F.pref("focused", text("worldcombat.skill.haze.preference.focused")), F.const(0.8), F.const(1)))
                .clamp(3, 7.5).round(2),
            "黑雾半径", {
                unit: " 格",
                description: "这口气铺开多大一圈；等级与身板越大越广，定向式收窄。它就是指示圈与实际波及范围。"
            }),
        density: formula(
            F.base(20).plus(F.stat("specialDefence").times(0.1).as("特防")).clamp(16, 52).round(0),
            "黑雾浓度", {
                unit: " 点",
                description: "雾里翻涌的烟粒子总量；特防越高的个体吐出的雾越浓，也决定画面的吞吐量。"
            }),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").times(0.05).as("速度"))
                .plus(F.when(F.pref("focused", text("worldcombat.skill.haze.preference.focused")), F.const(4), F.const(0)))
                .clamp(7, 20).round(0),
            "起手", "把这口气憋成黑雾需要多久；速度越快越短，定向式要多花 4 刻。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").times(1.2).as("身板")).clamp(6, 12).round(0),
            "收招", "吐雾之后的收势；碰撞箱越高大收得越慢。"),
        recharge: seconds(
            F.base(96).minus(F.level().times(0.4).as("经验"))
                .times(F.when(F.pref("focused", text("worldcombat.skill.haze.preference.focused")), F.const(1.2), F.const(1)))
                .clamp(55, 125).round(0),
            "冷却", "两次吐雾之间的等待；等级越高越短，定向式更长。PP 30 的代价。")
    });

    stages(hazeId, [
        { level: 40, values: { fogRadius: 4.6, recharge: 84 } },
        { level: 60, values: { fogRadius: 5.4, recharge: 70 } }
    ]);

    describe(hazeId, [
        { key: "description.0", values: ["fogRadius"] },
        { key: "focused.on", values: [], when: function (context) { return read(context.detail.values, ["focused"]) === true; } },
        { key: "focused.off", values: [], when: function (context) { return read(context.detail.values, ["focused"]) !== true; } },
        { key: "description.1", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fogRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fogRadius"] }
    ]);
}
