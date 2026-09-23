/**
 * 集沙 / Shore Up —— 参数与数值来源。
 *
 * 原生事实：Ground／变化／威力 —／命中 —／PP 5／target self；回复自己最大 HP 的一半，沙暴中改为 2/3。
 * 世界化：「集沙」就是这个字的字面意思——把脚边的**散沙**一缕缕卷起来糊在身上堵住伤口。于是回复量真的取决于
 *   此刻能取到多少沙：站在沙地／沙丘上回得多，站在草地石地上只能糊一点土尘；身处沙暴（共享身份
 *   `world_combat:status/sandstorm`，由沙暴场地给在场活体挂上）时，风把沙送到手边，永远取之不尽，回复回到 2/3。
 *   取沙是**真的把地面的沙拿走**（`world.breakBlock`，松散沙块消耗后留在被挖开的状态）——所以同一片沙地被反复
 *   使用会变薄，回复随之下降，这是这招独有的地面代价，也是它和光合作用（只读光照、不改世界）分开的地方。
 * 与同族分开：羽栖是落地分段、可被清除效果打断；集沙是一次结算、吃地面材质，并在沙暴里最强。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal         回复比例：0.42 + 探到的散沙密度[0,0.12] + 沙暴[0,0.13] + 防御偏移[−0.04,0.07]，厚结档 ×1.12，夹 0.30..0.70。
 *   grains       集沙量：3 + 等级(≥20)偏移[0,0.6]，厚结档 ×1.5，夹 2..10 块。
 *   sandReach    探沙范围：2.2 + 身高偏移[−0.2,0.8]，夹 1.6..4.2 格，也是取沙与画面的参考半径。
 *   grainDensity 沙粒密度：22 + 体重(≥30)偏移[0,30]，夹 14..60 点，直接驱动粒子数量。
 *   gather       起手：14 刻 − 速度偏移[0,6]，厚结档 +5 刻，夹 8..22。
 *   settle       收招：8 刻 − 速度偏移[0,3]，夹 5..12。
 * 配置 thick（厚结）：集沙量与每口回复更高，代价是起手更久、冷却更长、一次挖走更多沙；
 *   关闭（薄敷）起手更快、更省沙、冷却更短，适合在原地反复小补。
 */
namespace PokemonSkills {
    export const shoreupId = "shoreup";

    function shoreupPoint(context: FactContext): CombatPoint | null {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return null;
        var body = context.world.observe(context.actor);
        return body ? body.position() : null;
    }

    export function shoreupLoose(block: CombatBlock | null): boolean {
        if (block === null) return false;
        var id = String(block.id());
        return id === "minecraft:sand" || id === "minecraft:red_sand";
    }

    /** 身边可取的散沙：以施法者落脚层为中心、3×3 一层里松散沙块的密度（0..1）。 */
    function shoreupSand(context: FactContext): number {
        var point = shoreupPoint(context);
        if (!point || !context.world) return 0;
        var world = context.world;
        var baseY = Math.floor(point.y()) - 1;
        var cx = Math.floor(point.x()), cz = Math.floor(point.z());
        var found = 0;
        for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
            if (shoreupLoose(world.block(WorldCombat.point(cx + dx, baseY, cz + dz)))) found++;
        }
        return Math.max(0, Math.min(1, found / 9));
    }

    /** 身处沙暴：共享身份 world_combat:status/sandstorm（沙暴场地给在场活体挂上的身份）。 */
    function shoreupStorm(context: FactContext): number {
        return context.world && context.actor && context.world.valid(context.actor)
            && CombatStatus.has(context.world, context.actor, "sandstorm") ? 1 : 0;
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
            "集沙量", { unit: " 块", description: "从地面卷起多少块散沙糊到身上；等级越高、厚结档越多，一次挖走的沙也越多。" }),
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
        { key: "description.1", values: ["grains", "sandReach"] },
        { key: "description.2", values: ["gather", "settle"] },
        { key: "stance.thick", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "stance.loose", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
