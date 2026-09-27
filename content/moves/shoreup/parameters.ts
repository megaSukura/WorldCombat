/**
 * 集沙 / Shore Up —— 参数与数值来源。
 *
 * 原生事实：Ground／变化／威力 —／命中 —／PP 5／target self；回复自己最大 HP 的一半，沙暴中改为 2/3。
 * 世界化：「集沙」就是这个字的字面意思——把脚边的**散沙**一缕缕卷起来糊在身上堵住伤口。于是回复量真的取决于
 *   此刻能取到多少沙：站在沙地／沙丘上回得多，站在草地石地上只能糊一点土尘；身处沙暴
 *   （WorldEnvironment 的语义天气 `sandstorm`，与画面同一读数）时，风把沙送到手边，回复回到约 2/3。
 *   取材全程只读取地面同一片沙（环境可用量），**不挖走方块、也不消耗任何掉落物**，地表保持连续、世界不被改动。
 *   沙只作只读的环境疗量灵感；疗量、AI 与画面读同一个脚点、同一片沙、同一个沙暴读数。
 *   与同族分开：羽栖是落地分段、可被清除效果打断；集沙是一次结算、吃环境材质，并在沙暴里最强。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal         回复比例：0.42 + 脚点散沙密度[0,0.12] + 沙暴[0,0.13] + 防御偏移[−0.04,0.07]，厚结档 ×1.12，夹 0.30..0.70。
 *   grains       集沙量：3 + 等级(≥20)偏移[0,0.6]，厚结档 ×1.5，夹 2..10 粒，也是取景的上限。
 *   sandReach    探沙范围：2.2 + 身高偏移[−0.2,0.8]，夹 1.6..4.2 格，也是取沙与画面的参考半径。
 *   grainDensity 沙粒密度：22 + 体重(≥30)偏移[0,30]，夹 14..60 点，直接驱动粒子数量。
 *   gather       起手：14 刻 − 速度偏移[0,6]，厚结档 +5 刻，夹 8..22。
 *   settle       收招：8 刻 − 速度偏移[0,3]，夹 5..12。
 * 配置 thick（厚结）：集沙量与每口回复更高，代价是起手更久、冷却更长；
 *   关闭（薄敷）起手更快、冷却更短，适合在原地反复小补。
 */
namespace PokemonSkills {
    export const shoreupId = "shoreup";

    /** 统一的取材/采样脚点：身体中心减去半身高，高矮个体都落在真正踩地的那一层。 */
    export function shoreupFeet(body: CombatObservation): CombatPoint {
        return body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
    }
    function shoreupPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? shoreupFeet(body) : null;
    }

    export function shoreupLoose(block: CombatBlock | null): boolean {
        if (block === null) return false;
        var id = String(block.id());
        return id === "minecraft:sand" || id === "minecraft:red_sand";
    }

    /** 脚点下方 3×3 一层里松散沙块的密度（0..1）；疗量、AI、画面共用这一片地，只读不消耗。 */
    export function shoreupSandAround(world: CombatWorld, feet: CombatPoint): number {
        var baseY = Math.floor(feet.y()) - 1;
        var cx = Math.floor(feet.x()), cz = Math.floor(feet.z());
        var found = 0;
        for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
            if (shoreupLoose(world.block(WorldCombat.point(cx + dx, baseY, cz + dz)))) found++;
        }
        return Math.max(0, Math.min(1, found / 9));
    }

    /** 脚点是否处于沙暴：读 WorldEnvironment 的语义天气（与画面同一读数），离场即时失效。 */
    export function shoreupStormAt(world: CombatWorld, feet: CombatPoint): boolean {
        return WorldEnvironment.weather(world, feet) === "sandstorm";
    }

    function shoreupSand(context: FactContext): number {
        var point = shoreupPoint(context);
        return point && context.world ? shoreupSandAround(context.world, point) : 0;
    }

    function shoreupStorm(context: FactContext): number {
        var point = shoreupPoint(context);
        return point && context.world && shoreupStormAt(context.world, point) ? 1 : 0;
    }

    defineFacts(shoreupId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "sand") return Formula.fact(shoreupSand(context));
                if (id === "storm") return Formula.fact(shoreupStorm(context));
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id === "sand") return { value: shoreupSand(context), label: { key: "worldcombat.skill." + shoreupId + ".value.sand" }, terms: [] };
                if (id === "storm") return { value: shoreupStorm(context), label: { key: "worldcombat.skill." + shoreupId + ".value.storm" }, terms: [] };
                return undefined;
            }
        };
    });

    actionParameters.define(shoreupId, {
        heal: percent(F.base(0.42)
            .plus(F.var("sand", { key: "worldcombat.skill." + shoreupId + ".value.sand" }).times(0.12))
            .plus(F.var("storm", { key: "worldcombat.skill." + shoreupId + ".value.storm" }).times(0.13))
            .plus(F.stat("defence").minus(60).times(0.0005).clamp(-0.04, 0.07).as("砂甲"))
            .times(F.when(F.pref("thick"), F.const(1.12), F.const(1)))
            .clamp(0.30, 0.70).round(3),
            "回复比例", "按最大生命回复：身边的散沙越密、身处沙暴中回得越多；防御越高砂甲越厚。"),
        grains: formula(F.base(3).plus(F.level().minus(20).max(0).times(0.06))
            .times(F.when(F.pref("thick"), F.const(1.5), F.const(1)))
            .clamp(2, 10).round(),
            "集沙量", { unit: " 粒", description: "从探沙范围内卷起多少粒散沙糊到身上；等级越高、厚结档越多。地面沙块只作取材来源、不被挖走，也不消耗任何掉落物；世界不被改动。" }),
        sandReach: formula(F.base(2.2).plus(F.body("height").minus(1.4).times(0.6)).clamp(1.6, 4.2).round(2),
            "探沙范围", { unit: " 格", description: "从多远的地面取沙；身量越大够得越远，也是取沙与画面的参考尺度。" }),
        grainDensity: formula(F.base(22).plus(F.body("weight").minus(30).max(0).times(0.15)).clamp(14, 60).round(),
            "沙粒密度", { unit: " 点", description: "扬起的沙粒数量；体重越沉铺得越密，直接驱动粒子。" }),
        gather: seconds(F.base(14).minus(F.stat("speed").minus(40).max(0).times(0.06))
            .plus(F.when(F.pref("thick"), F.const(5), F.const(0))).clamp(8, 22),
            "起手", "俯身把沙拢起来的时间；速度越快越利落，厚结档更慢。"),
        settle: seconds(F.base(8).minus(F.stat("speed").minus(40).max(0).times(0.03)).clamp(5, 12),
            "收招", "把沙压实收势的时间；速度越快收得越快。")
    });

    stages(shoreupId, [
        { level: 40, values: { cooldown: 185 } },
        { level: 60, values: { cooldown: 155 } }
    ]);

    describe(shoreupId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["grains","sandReach"] },
        { key: "description.2", values: ["gather","settle"] },
        { key: "stance.thick", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "stance.loose", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
