/**
 * 摔打 / slam 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 5）之内。它是一记慢而重的落点重砸，
 * 砸点会留在对手扬起时的位置，所以 AI 默认 `ai.preferStill`（开）：**专挑站得住的目标砸**——不动、被定住、
 * 睡眠或冰冻的目标排得更前；已经在高速移动的目标排在后面（大概率砸空，浪费一发长冷却）。
 * 对谁出手：血太少的目标适当降分——用一记最重的招收残是浪费，留给更便宜的招；焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑走到射程内。
 */
namespace PokemonSkills {
    function slamValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function slamStill(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.rooted || target.sleeping) return true;
        const motion = CompanionBehavior.velocity(context, target);
        if (motion === null) return true;
        return Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]) < 0.05;
    }

    CompanionBehavior.registerUse("slam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!slamValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) { return slamValid(target); },
        priority: function (context, capability, target) {
            if (!target || !slamValid(target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferStill", true)) {
                if (slamStill(context, target)) score += 18;
                else score -= 8;
            }
            if (CompanionBehavior.status(context, target, "sleep") || CompanionBehavior.status(context, target, "frozen")) score += 12;
            if (CompanionBehavior.ratio(target) < 0.2) score -= 12;
            if (context.facts.focus === target.ref) score += 14;
            return Math.max(0, score);
        }
    });

    addPreferences("slam", {}, [
        field(pathOf("heavy"), "沉砸式", "boolean", {
            help: "开启：砸得更重、砸坑更大、震得更远，但落下更慢、更容易被躲开，收招与冷却也更久；关闭（疾砸式）：落得快、出手快，更容易砸中移动中的目标，但单发略低、面更小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动抡起，先走近。这一招慢，调大只在追击时更容易砸空。"
        }),
        field(pathOf("ai.preferStill"), "只砸站得住的目标", "boolean", {
            help: "开启：不动、被定住、睡眠或冰冻的目标优先，正在奔跑的目标降分；关闭：只按威胁与距离排序，愿意赌一发预判。"
        })
    ]);
}
