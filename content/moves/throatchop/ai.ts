/**
 * 地狱突刺 / throatchop 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见、敌对、存活且**尚未被封声**的目标，且在 ai.maxChase（默认 4）格内；
 *   近身突刺要先贴近，所以追击距离比远程招小。目标正在打自己时 priority 抬到 55。
 * 对谁出手：当前威胁；已经带着咽喉身份的敌人会被跳过，不浪费一次突刺去刷新。
 * 更想封谁：带声音招式或刚出过声音招式的目标优先级更高（+20）；纯物理敌人保持普通近伤价值，不夸大封锁。
 * 够不到怎么办：交给共享接近逻辑；reach 就是本招由物攻与体型决定的突刺距离。
 * 放完之后：目标一段时间内发不出声音类招式，伙伴按共用计划继续交战。
 * 配置 choke（锁喉／割喉）改变封声时长、威力与出手快慢。
 */
namespace PokemonSkills {
    // 感知事实：目标是否带声音招式、是否刚出过声音招式。只读探针，决策帧内缓存。
    CompanionBehavior.registerFact("world_combat:move/throatchop/sound", function (access, actor) {
        return throatChopSoundCapable(access, actor);
    });
    CompanionBehavior.registerFact("world_combat:move/throatchop/recent-sound", function (access, actor) {
        return throatChopRecentSound(access, actor);
    });

    CompanionBehavior.registerUse(throatChopId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const silenced = CompanionBehavior.status(context, target, throatChopStatus);
            let score = silenced ? 20 : 35;
            if (target.attacking === self.ref) score = Math.max(score, 55);
            // 对手带着声音招式或刚唱过声时更值得先封喉；纯物理敌人保持普通近伤价值，不夸大封锁。
            if (!silenced && (CompanionBehavior.fact<boolean>(context, "world_combat:move/throatchop/sound", target)
                || CompanionBehavior.fact<boolean>(context, "world_combat:move/throatchop/recent-sound", target))) score += 20;
            return score;
        }
    });

    addPreferences(throatChopId, { choke: true, ai: { maxChase: 4 } }, [
        field(pathOf("choke"), "锁喉", "boolean", {
            help: "开启（锁喉）：封声时长 ×1.25，但威力 ×0.9、起手多 2 刻、冷却多 6 刻。关闭（割喉）：出手更快、威力 ×1.15，代价是封声只有 ×0.75。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 10, step: 1,
            help: "目标在这个距离内才考虑突刺；近身招调大只在必须贴身时才用，调小更容易出手。"
        })
    ]);
}
