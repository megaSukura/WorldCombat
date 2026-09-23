/**
 * 月光 / Moonlight —— 参数与数值来源。
 *
 * 核心念头：把清冷的月色披到身上——它读的是「夜里且天晴」这件事，夜里晴空一次补回三分之二并冷却掉身上的灼伤，
 *   白天或阴雨只补一点点。
 * 数值来源：原生「回复最大 HP 的 1/2，晴天 2/3、恶劣天气 1/4」；这里落成二值的 moon（夜晚 × 可见天空 × 无雨），
 *   并以亲密度作为月光的眷顾项：夜里晴空 0.24 + 0.42 ≈ 2/3，白天／阴雨回落到 0.24。
 * 与原生：放弃回合制天气枚举，改读世界此刻是不是「月色可及」；夜里与白天因此是两套完全不同的结果。
 */
namespace PokemonSkills {
    export const moonlightId = "moonlight";

    function moonlightPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? body.position() : null;
    }
    /** 月色可及：共享语义天气在场时不算晴夜；无现场时回到夜晚晴空的原生判定。0 或 1。 */
    function moonlightSky(context: FactContext): number {
        var point = moonlightPoint(context);
        if (!point || !context.world) return 0;
        if (WorldEnvironment.weather(context.world, point) !== null) return 0;
        var env = WorldEnvironment.read(context.world, point);
        return env && env.loaded && !env.day && env.skyVisible && (env.rain || 0) < 0.05 && (env.thunder || 0) < 0.05 ? 1 : 0;
    }
    defineFacts(moonlightId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "moon") return moonlightSky(context);
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "moon") return undefined;
                var moon = moonlightSky(context);
                return { value: moon, label: { key: "worldcombat.skill." + moonlightId + ".value.moon" },
                    formula: [{ key: moon > 0 ? "worldcombat.skill." + moonlightId + ".value.moon.yes" : "worldcombat.skill." + moonlightId + ".value.moon.no" }], terms: [] };
            }
        };
    });

    actionParameters.define(moonlightId, {
        heal: percent(F.base(0.24)
            .plus(F.var("moon", { key: "worldcombat.skill." + moonlightId + ".value.moon" }).times(0.42))
            .plus(F.individual("friendship").times(0.0004).as("月光眷顾"))
            .clamp(0.20, 0.70).round(3),
            "回复比例", "按缺失生命比例回复：夜里晴空接近 2/3，白天或阴雨只回下限；亲密度越高月色越眷顾。"),
        moonriseTicks: seconds(F.base(14).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(8, 16).as("速度修正"),
            "承月时长", "抬头接住月光的时间；速度越快越短。")
    });
    stages(moonlightId, [
        { level: 40, values: { cooldown: 200 } },
        { level: 60, values: { cooldown: 170 } }
    ]);
    describe(moonlightId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["moonriseTicks"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
