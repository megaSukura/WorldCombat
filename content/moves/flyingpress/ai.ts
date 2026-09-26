/**
 * 飞身重压 / flyingpress 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 9）之内。它是短距离跃压：
 * `ai.preferAir` 打开时，会飞/离地的目标（`grounded===false`、飞行属性，或带 fly／magnetrise／telekinesis
 * 身份）明显优先——从上方压一个空中目标正是它的长处；关闭时对走地与空中的目标一视同仁。
 * 目标是自己关注的对象时也略高。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function flyingpressFlies(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.grounded === false) return true;
        const facts = target.facts;
        if (facts && Array.isArray(facts.types) && facts.types.indexOf("flying") >= 0) return true;
        return CompanionBehavior.status(context, target, "fly") || CompanionBehavior.status(context, target, "magnetrise")
            || CompanionBehavior.status(context, target, "telekinesis");
    }

    function flyingpressWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("flyingpress", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return flyingpressWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flyingpressWants(context, capability, target)) return 0;
            let base = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferAir", true) && flyingpressFlies(context, target)) base += 18;
            if (context.facts.focus === target.ref) base += 8;
            // 预判走得慢的目标更好压：水平速度很快的对手容易在一次校向后侧移躲开。
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : -1;
            if (speed >= 0) base += speed < 0.05 ? 6 : speed > 0.2 ? -6 : 0;
            // 头顶留得下真实跃起空间才值得高跳；顶棚太低的场地降权。
            const world = CompanionBehavior.world(context);
            const self = CompanionBehavior.source(context);
            const probe = CompanionBehavior.point([self.point[0], self.point[1] + 1.3, self.point[2]]);
            if (!world.freeSpace(probe, 0.7, 0.7)) base -= 8;
            return base;
        }
    });

    addPreferences("flyingpress", { ai: { maxChase: 9, preferAir: true } }, [
        field(pathOf("highDive"), "高空压顶", "boolean", {
            help: "开启：跃高 +1.2 格、重压约 ×1.12、俯冲更快，但起手 +2 刻、冷却 +8 刻，适合砸空中与硬目标。关闭（低空快压）：贴地压过去、重压约 ×0.92，收手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "伙伴在目标离自己这么远以内时才跃压；调小只在贴身时压，调大愿意先追一段再跃。"
        }),
        field(pathOf("ai.preferAir"), "空中目标优先", "boolean", {
            help: "开启：会飞或离地的目标明显优先，从上方压它正是这招的长处；关闭：走地与空中一视同仁。"
        })
    ]);
}
