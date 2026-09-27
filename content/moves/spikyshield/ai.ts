/**
 * 尖刺防守 / spikyshield 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有藤甲时炸开；对手已经贴到 3 格内时抬到 100
 * 抢在共享顺序前——藤刺甲的意义就是让接下来撞上来的人当场掉血，所以它等的是近战对手贴上来。
 * 封变化招式是附带收益，AI 不为它单独起意。撑甲期间可走动，所以它不像拦堵那样把自己钉住。
 * 只剩本招时：威胁一进 `ai.range` 就会炸甲等它撞。
 */
namespace PokemonSkills {
    /** 威胁贴到身边还要多久（刻）：距离 ÷ 移动速度；速度不可用时按中等速度估算。 */
    function spikyShieldArrival(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): number {
        const speed = typeof threat.speed === "number" && isFinite(threat.speed) && threat.speed > 0.01 ? threat.speed : 0.15;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) / speed;
    }
    CompanionBehavior.registerUse("spikyshield", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), SpikyShieldRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat: CompanionBehavior.Entity | null = target || context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let contact = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (!other.friendly && other.health > 0 && CompanionBehavior.distance(other.point, self.point) <= 4) contact++;
            }
            let value = CompanionBehavior.distance(self.point, threat.point) <= 3 ? 100 : 55;
            if (contact > 1) value += Math.min(24, (contact - 1) * 6);        // 被围时立甲更值：每个人各扎一次
            if (spikyShieldArrival(context, threat) <= 20) value += 6;         // 马上就撞上来，先摆好等它
            return Math.min(120, value);
        }
    });

    addPreferences("spikyshield", {}, [
        field(pathOf("thorn"), "锐刺／厚藤", "boolean", {
            help: "开启锐刺：刺伤威力 ×1.25，但藤甲总量 ×0.8、持续 ×0.85、收招 5 刻——惩罚重，挡得薄。关闭厚藤：总量 ×1.25、持续 ×1.15，但刺伤 ×0.8、收招 8 刻——挡得厚，惩罚轻。"
        }),
        field(pathOf("ai.range"), "炸甲距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才炸开藤甲。越大越早摆好，也越可能空炸；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
