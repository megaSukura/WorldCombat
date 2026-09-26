/**
 * 光合作用 / Synthesis —— 参数与数值来源。
 *
 * 核心念头：摊开叶片把此刻照到身上的光合成生命——头顶的光越足，每一次光合收得越多。它读的是施法者
 *   所在点的真实日照（WorldEnvironment.sunlight = 天光 × 白天 × 可见天空 × 阴雨折扣），而不是天气枚举。
 * 数值结构：起手只占很短的准备时间，提交后进入一段完整光合期，把总回复拆成 4 次均匀小回复，每次按当刻
 *   日照取「原单次 heal 比例的四分之一」；固定上限是开始时缺的那部分生命，中途再挨打也不会把它撑大。
 * 数值来源：原生「回复最大 HP 的 1/2，晴天 2/3、恶劣天气 1/4」落成连续日照；回复比例随特防增长（叶片
 *   韧性），光合期随速度缩短（快的个体收得快），起手时间也随速度略短。
 * 与原生：放弃回合制的天气查表，改读世界真实光照；树荫、室内与正午的差别都会逐口留在数值上。
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
            "回复比例", "整段光合按缺失生命回复的总比例上限：日照越足越高（晴天正午接近 2/3），特防越高叶片越强韧；夜里或遮蔽处只回下限。这口总量会均分成 4 次、各按当刻日照结算。"),
        prepareTicks: seconds(F.base(7).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(5, 11).as("速度修正"),
            "起手时长", "摊开叶片起手、尚未开始计光合的准备时间；速度越快越短。"),
        soakTicks: seconds(F.base(18).minus(F.stat("speed").minus(40).max(0).times(0.08)).clamp(10, 20).as("速度修正"),
            "光合时长", "提交后持续吸光的整段时间，回复均分成 4 次落在其中；整段站定，被打断则停止剩余几口。")
    });
    stages(synthesisId, [
        { level: 40, values: { cooldown: 210 } },
        { level: 60, values: { cooldown: 180 } }
    ]);
    describe(synthesisId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["prepareTicks", "soakTicks"] },
        { key: "description.additional", values: [] },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
