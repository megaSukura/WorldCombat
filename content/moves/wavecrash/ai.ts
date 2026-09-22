/**
 * 波动冲 / wavecrash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这一招的价值在“浇湿”——
 * 开启 `ai.preferDry`（默认开）时，还没被浇湿的目标排得更前：把这一发留给还干着的对手；
 * 已经被浇透的目标只按普通近身候选排。施法者本身湿透时水势更盛，这时排得更前。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function wavecrashValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("wavecrash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!wavecrashValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) { return wavecrashValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && !CompanionBehavior.status(context, target, "soaked")) score += 16;
            if (self.wet) score += 10;
            return score;
        }
    });

    addPreferences("wavecrash", {}, [
        field(pathOf("thick"), "厚水壳", "boolean", {
            help: "开启：水壳更厚，威力更高、反伤更轻、把目标浇得更久，但涌进更短、起手与冷却更慢——重击又保命。关闭（薄水刃）：水壳更薄，涌得更远更快，反伤更重——适合追击与先手。"
        }),
        field(pathOf("ai.maxChase"), "涌进距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动涌进，先靠近。越大越早发起，也越容易冲空。"
        }),
        field(pathOf("ai.preferDry"), "留给还干着的目标", "boolean", {
            help: "开启：优先对还没被浇湿的目标出手（命中会挂上湿身）；关闭：只按威胁与距离排序。"
        })
    ]);
}
