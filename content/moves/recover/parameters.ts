/**
 * 自我再生 / Recover —— 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中 —／PP 5／target self；heal: [1,2] —— 回复自己最大 HP 的一半。
 *
 * 世界化：把「让细胞再生」落成一段**持续的再生窗口**：提交后身上亮起再生的青光，回复按刻均匀交付、不锁足，
 *   因此在窗口里它还能继续走位；伤得越重，细胞干得越猛（伤势深度项），等级越高底子越厚。这段窗口就是对手的
 *   余地：持续但缓慢，爆发伤害能在它补满之前把它按死；清除共享身份 `world_combat:status/regenerating`
 *   （牛奶／`/effect clear`）会立刻掐断剩下的再生，只留下已交付的部分。
 * 与同族分开：光合作用读日照、集沙吃地面、羽栖落地分段；自我再生**不吃环境、不锁足、按刻连续交付**，
 *   是唯一能在移动中回血的一口。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal         回复比例：0.40 + 伤势深度[0,1]×0.16 + 等级(≥30)偏移[0,0.05]，稳态档 +0.05／速生档 −0.04，夹 0.30..0.64。
 *   restoreTicks 再生窗口：52 − 速度(≥40)偏移[0,14]，稳态档 ×1.35、速生档 ×0.75，夹 26..78 刻。
 *   motes        再生光点：22 + 体重(≥30)偏移[0,34]，夹 16..64 点，直接驱动粒子数量。
 *   glow         光晕范围：0.9 + 身高偏移[−0.2,0.5]，夹 0.7..1.9 格。
 *   gather       起手：10 − 速度偏移[0,4]，夹 6..13 刻。
 *   settle       收招：8 − 速度偏移[0,3]，夹 5..11 刻。
 * 配置 steady（稳态再生）：回复总量 +0.05、窗口 ×1.35（每刻更慢、总暴露更久），代价是冷却 ×1.08；
 *   关闭（速生）回复 −0.04、窗口 ×0.75，冷却 ×0.95，适合在受击间隙里快速补一口。
 */
namespace PokemonSkills {
    export const recoverId = "recover";

    function recoverPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? body.position() : null;
    }
    /** 伤势深度：0（满血）到 1（濒危）。没有现场时取 0.15，详情页读到的是中间的保底值而不是极端值。 */
    function recoverInjury(context: FactContext): number {
        if (!recoverPoint(context)) return 0.15;
        var body = context.world!.observe(context.actor!);
        if (!body) return 0.15;
        return body.maxHealth() > 0 ? Math.max(0, Math.min(1, 1 - body.health() / body.maxHealth())) : 0.15;
    }
    defineFacts(recoverId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "injury") return recoverInjury(context);
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "injury") return undefined;
                return { value: recoverInjury(context), label: { key: "worldcombat.skill." + recoverId + ".value.injury" }, terms: [] };
            }
        };
    });

    actionParameters.define(recoverId, {
        heal: percent(F.base(0.40)
            .plus(F.var("injury", { key: "worldcombat.skill." + recoverId + ".value.injury" }).times(0.16).as("伤势再生"))
            .plus(F.level().minus(30).max(0).times(0.002).clamp(0, 0.05).as("等级底子"))
            .plus(F.when(F.pref("steady"), F.const(0.05), F.const(-0.04)))
            .clamp(0.30, 0.64).round(3),
            "回复比例", "整段再生回复的最大生命比例；伤得越重细胞干得越猛、等级越高底子越厚，稳态档再补一点。"),
        restoreTicks: seconds(F.base(52)
            .minus(F.stat("speed").minus(40).max(0).times(0.30))
            .times(F.when(F.pref("steady"), F.const(1.35), F.const(0.75)))
            .clamp(26, 78),
            "再生时长", "把回复按刻摊开交付的窗口长度；速度越快收得越快，稳态档拉长、速生档压缩。"),
        motes: formula(F.base(22).plus(F.body("weight").minus(30).max(0).times(0.5)).clamp(16, 64).round(),
            "再生光点", { unit: " 点", description: "再生期间升起的细光数量；体重越大铺得越密，直接驱动粒子。" }),
        glow: formula(F.base(0.9).plus(F.body("height").minus(1.4).times(0.4)).clamp(0.7, 1.9).round(2),
            "光晕范围", { unit: " 格", description: "再生光晕铺开的半径；身量越大范围越广，也是画面的参考尺度。" }),
        gather: seconds(F.base(10).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(6, 13),
            "起手", "聚起再生微光的时间；速度越快越短。"),
        settle: seconds(F.base(8).minus(F.stat("speed").minus(40).max(0).times(0.04)).clamp(5, 11),
            "收招", "再生结束后收势的时间；速度越快收得越快。")
    });

    stages(recoverId, [
        { level: 40, values: { cooldown: 200 } },
        { level: 60, values: { cooldown: 170 } }
    ]);

    describe(recoverId, [
        { key: "description.0", values: ["heal", "restoreTicks"] },
        { key: "description.1", values: ["motes", "glow"] },
        { key: "description.2", values: ["gather", "settle"] },
        { key: "stance.steady", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "stance.quick", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
