/**
 * 光合作用 / Synthesis —— 参数与数值来源。
 *
 * 核心念头：摊开叶片，把此刻照到身上的光合成生命——头顶的光越足，回复越多。它读的是施法者所在点的
 *   真实日照（WorldEnvironment.sunlight = 天光 × 白天 × 可见天空 × 阴雨折扣），而不是一个天气枚举。
 * 数值来源：原生「回复自己最大 HP 的 1/2，晴天 2/3、恶劣天气 1/4」；这里把天气落成连续日照：晴天正午
 *   接近 2/3，阴雨与遮蔽处明显减少。回复比例随特防增长（叶片韧性），吸收时长随速度缩短（快的个体摊叶更快）。
 * 与原生：放弃回合制的天气查表，改读世界真实光照；因此树荫、室内与正午的差别都会留在数值上。
 */
namespace PokemonSkills {
    export const synthesisId = "synthesis";

    function synthesisPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? body.position() : null;
    }
    /** 施法者所在点的日照：0（夜里／遮蔽）到 1（晴天正午）。 */
    function synthesisLight(context: FactContext): number {
        var point = synthesisPoint(context);
        return point && context.world ? WorldEnvironment.sunlight(context.world, point) : 0;
    }
    defineFacts(synthesisId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "light") return Formula.fact(synthesisLight(context));
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "light") return undefined;
                return { value: synthesisLight(context), label: { key: "worldcombat.skill." + synthesisId + ".value.light" }, terms: [] };
            }
        };
    });

    actionParameters.define(synthesisId, {
        heal: percent(F.base(0.34)
            .plus(F.var("light", { key: "worldcombat.skill." + synthesisId + ".value.light" }).times(0.30))
            .plus(F.stat("specialDefence").minus(60).max(0).times(0.0008).as("叶片韧性"))
            .clamp(0.30, 0.72).round(3),
            "回复比例", "按缺失生命比例回复：日照越足越高（晴天正午接近 2/3），特防越高叶片越强韧；夜里或遮蔽处只回下限。"),
        soakTicks: seconds(F.base(18).minus(F.stat("speed").minus(40).max(0).times(0.08)).clamp(10, 20).as("速度修正"),
            "吸收时长", "摊开叶片吸收光照的站定时间；速度越快收得越快，但整段时间都不能移动。")
    });
    stages(synthesisId, [
        { level: 40, values: { cooldown: 210 } },
        { level: 60, values: { cooldown: 180 } }
    ]);
    describe(synthesisId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["soakTicks"] },
        { key: "description.additional", values: [] },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
