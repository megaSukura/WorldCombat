/**
 * 音爆 / sonicboom 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 它是最便宜、最快的一记固定伤害，所以在别的招式都不划算时被当作填充；`ai.finish`（默认开）在目标生命
 * 已经很低时把它排到前面——固定 20 点不看防御，正好用来补刀；代价是可能把这一发浪费在满血目标上。
 * 裂痕在起手窗口里即时落点，所以移动慢的目标更可能仍停在准线上；回响式的第二声尤其吃这一点，排序会再抬高。
 * 回响式不改变出手条件，只把第二声与更长的冷却带进来。
 */
namespace PokemonSkills {
    /** 本个体这一次的固定伤害；AI 与出招共用同一条 damage 公式，收残按绝对生命判断。 */
    function sonicboomFixed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1, PokemonSkills.p("sonicboom", "damage",
                { world: world, actor: world.source(), skill: skills["sonicboom"], detail: { values: capability.data.config || {} } }));
        } catch (error) { return 20; }
    }

    CompanionBehavior.registerUse("sonicboom", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 16;
            // 收残用绝对生命与固定伤害比较（不看目标上限，也不会把高血 Boss 误判成残血），而不是按比例判断。
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) {
                const fixed = sonicboomFixed(context, capability);
                if (target.health <= fixed) score += 26;
                else if (target.health <= fixed * 1.5) score += 12;
            }
            // 裂痕在起手窗口里即时落点：移动慢的目标更可能仍停在准线上，回响式的第二声尤其吃这一点。
            const velocity = target.velocity;
            if (velocity) {
                const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
                if (speed < 0.06) score += capability.data.config && capability.data.config.reverb === true ? 10 : 5;
            }
            return score;
        }
    });

    addPreferences("sonicboom", {}, [
        field(pathOf("reverb"), "回响式", "boolean", {
            help: "开启：第一声之后隔一小段，从当时的位置沿原方向再裂一次，对那时仍在新线上的人再削固定的 20（适合仍停在准线上的目标）；代价是多一段收势、冷却更长。关闭（单声式，默认）：一声了事，更快更省。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手发一声。"
        }),
        field(pathOf("ai.finish"), "残血优先", "boolean", {
            help: "开启：目标生命很低时优先用它补刀（固定 20 点不看防御）；关闭：只把它当普通填充招式。"
        })
    ]);
}
