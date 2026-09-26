/**
 * 青草滑梯 / grassyglide 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格之内。它是短射程的先制铲击，
 *   愿意在贴脸到近中距离起手；更远交给共享接近逻辑滑过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.onGrass`（默认开）时，站在青草场地上的自己多一档分——这一记会瞬发、更远更重，值得优先出；
 *   `ai.finish`（默认开）时残血目标多一档分，用一记先手铲收尾。
 * 优先次序：射程内基础 22；脚下有草 +12（瞬发且更远）；目标残血 +8；已在射程内 +4。
 * 够不到怎么办：射程由 `dash` 决定，共享任务先把身位收进滑行距离再滑。
 * 放完之后：目标被铲开、落点只扬一撮短草，没有青草场地留下来；交回共享交战计划，冷却一好就能再滑。
 * 场地选择：AI 会把「站在已有青草场地上」当成加分理由；本招自己不铺场，所以不会为了造场反复出招。
 */
namespace PokemonSkills {
    function grassyglideWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    CompanionBehavior.registerUse(grassyglideId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return grassyglideWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !grassyglideWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "onGrass", true)
                && CompanionBehavior.status(context, self, "grassyterrain")) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.4) score += 8;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            return score;
        }
    });

    addPreferences(grassyglideId, {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动滑过去；本招射程短，设大愿意更早起手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记瞬发先手铲收尾；关闭则所有目标同价。"
        }),
        field(pathOf("ai.onGrass"), "草地上优先", "boolean", {
            help: "开启：自己站在青草场地上时优先出这一招（起手归零、射程与速度更高）；关闭则只按普通近战候选排序。"
        })
    ]);
}
