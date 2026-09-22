/**
 * 晨光 / Morning Sun —— 参数与数值来源。
 *
 * 核心念头：把初升的日光一次拽到身上——它读的是「白天且天晴」这件事，白天晴空一次补回三分之二并精神一振，
 *   夜里或阴雨只补一点点，也没有那份劲头。
 * 数值来源：原生「回复最大 HP 的 1/2，晴天 2/3、恶劣天气 1/4」；这里落成二值的 dawn（白天 × 可见天空 × 无雨）
 *   与特攻成长：晴天白天 0.24 + 0.42 ≈ 2/3，夜里／阴雨回落到 0.24。回复后给自己一段速度提升。
 * 与原生：放弃回合制天气枚举，改读世界此刻是不是「晨光可及」；白天与夜晚因此是两套完全不同的结果。
 */
namespace PokemonSkills {
    export const morningsunId = "morningsun";

    function morningsunPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? body.position() : null;
    }
    /** 晨光可及：共享语义烈日直接算晨光；别的语义天气挡住；无现场时回到白天晴空的原生判定。0 或 1。 */
    function morningsunDawn(context: FactContext): number {
        var point = morningsunPoint(context);
        if (!point || !context.world) return 0;
        var kind = WorldEnvironment.weather(context.world, point);
        if (kind === "sun") return 1;
        if (kind !== null) return 0;
        var env = WorldEnvironment.read(context.world, point);
        return env && env.loaded && env.day && env.skyVisible && (env.rain || 0) < 0.05 && (env.thunder || 0) < 0.05 ? 1 : 0;
    }
    defineFacts(morningsunId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "dawn") return morningsunDawn(context);
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "dawn") return undefined;
                var dawn = morningsunDawn(context);
                return { value: dawn, label: { key: "worldcombat.skill." + morningsunId + ".value.dawn" },
                    formula: [{ key: dawn > 0 ? "worldcombat.skill." + morningsunId + ".value.dawn.yes" : "worldcombat.skill." + morningsunId + ".value.dawn.no" }], terms: [] };
            }
        };
    });

    actionParameters.define(morningsunId, {
        heal: percent(F.base(0.24)
            .plus(F.var("dawn", { key: "worldcombat.skill." + morningsunId + ".value.dawn" }).times(0.42))
            .plus(F.stat("specialAttack").minus(60).max(0).times(0.0007).as("日照亲和"))
            .clamp(0.20, 0.70).round(3),
            "回复比例", "按缺失生命比例回复：白天晴空接近 2/3，夜里或阴雨只回下限；特攻越高晨光越暖。"),
        sunriseTicks: seconds(F.base(14).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(8, 16).as("速度修正"),
            "迎候时长", "抬头接住晨光的时间；速度越快越短。"),
        vigorTicks: seconds(F.base(80).plus(F.stat("speed").minus(40).max(0).times(0.8)).clamp(60, 180).as("速度修正"),
            "晨间振作", "白天晴空下回复后获得的速度提升时长；夜里或阴雨没有这份劲头。")
    });
    stages(morningsunId, [
        { level: 40, values: { cooldown: 190 } },
        { level: 60, values: { cooldown: 160 } }
    ]);
    describe(morningsunId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["sunriseTicks", "vigorTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
