/** topsyturvy：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const topsyId = "topsyturvy";
    export const topsyScene = "world_combat:move_topsyturvy";
    export const topsyEffect = "world_combat:topsy_turvy";
    export const topsyFlipText = "world_combat.move.topsyturvy.text.flip";
    export const topsyEmptyText = "world_combat.move.topsyturvy.text.empty";
    /** 会被翻面的能力等级项；宝可梦还含命中与闪避，其他活体只有五项。 */
    export const topsyStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

    /** 一份可读的能力等级快照（宝可梦读原生阶梯，其他活体读公共阶梯）。 */
    export function topsyStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    /**
     * 把 actor 的每一项非零能力变化取反；返回翻过的项数。`onlyGains` 为真时只翻正面变化。
     * 持久等级与临时窗口分别原位取反；临时窗口沿用原来源、归属和剩余时长。
     */
    export function topsyFlip(world: CombatWorld, actor: CombatActor, onlyGains: boolean): number {
        return NativeEffects.invertStages(world, actor, onlyGains) + MobEffects.invert(world, actor, onlyGains);
    }

    actionParameters.define(topsyId, {
        reach: formula(
            F.base(7).plus(F.stat("speed").minus(60).times(0.02).as("速度"))
                .minus(F.when(F.pref("gain", text("worldcombat.skill.topsyturvy.preference.gain")), F.const(1), F.const(0)))
                .clamp(6, 10).round(1),
            "镜片射程", {
                unit: " 格",
                description: "镜片能甩到多远；速度越快甩得越远，择映式收近 1 格。它也是本招的实际射程。"
            }),
        shards: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.12).as("特攻")).clamp(8, 26).round(0),
            "镜片数量", {
                unit: " 枚",
                description: "一次崩出多少枚镜片；特攻越高越多，也是画面里掠过那道光的密度。"
            }),
        shardSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).as("速度")).clamp(0.7, 1.6).round(2),
            "镜片速度", {
                unit: " 格/刻",
                description: "镜片飞行的速度；速度快的个体更早命中，目标更难走开。"
            }),
        shardRadius: formula(
            F.base(0.28).plus(F.body("width").minus(0.9).times(0.2).as("身宽")).clamp(0.22, 0.5).round(2),
            "镜片判定", {
                unit: " 格",
                description: "镜片的横向判定半径；身体越宽判定越宽。"
            }),
        markTicks: seconds(
            F.base(40).plus(F.level().times(1.0).as("经验")).clamp(40, 110).round(0),
            "颠倒印记", "被翻过面的目标身上留下一道短暂印记多久；等级越高留得越久，印记记着翻了几项。"),
        shatter: formula(
            F.base(0.6).plus(F.body("width").times(0.5).as("身宽")).clamp(0.5, 1.4).round(2),
            "落空崩开", {
                unit: " 格",
                description: "镜片没打中人时在地上崩开的半径；体型越宽崩得越大，是画面的参考尺寸。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).as("速度"))
                .plus(F.when(F.pref("gain", text("worldcombat.skill.topsyturvy.preference.gain")), F.const(4), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把镜片聚起来甩出去需要多久；速度越快越短，择映式要多聚几刻。"),
        aftercast: seconds(
            F.base(6).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(5, 12).round(0),
            "收招", "甩出镜片后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(90).minus(F.level().times(0.5).as("经验"))
                .plus(F.when(F.pref("gain", text("worldcombat.skill.topsyturvy.preference.gain")), F.const(20), F.const(0)))
                .clamp(55, 130).round(0),
            "冷却", "两次甩镜之间的等待；等级越高越熟练，择映式更费。PP 20 的代价。")
    });

    stages(topsyId, [
        { level: 45, values: { reach: 8.2, recharge: 72 } }
    ]);

    describe(topsyId, [
        { key: "description.0", values: ["reach", "shardSpeed"] },
        { key: "description.1", values: ["shardRadius", "markTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["gain"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["gain"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.recharge"] }
    ]);
}
