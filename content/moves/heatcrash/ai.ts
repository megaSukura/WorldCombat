/**
 * 高温重压 / heatcrash 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内，且自己相对对手的体重比达到 `ai.minRatio`（默认 0＝总是可以）。
 * 对谁出手：**优先压得过、且还没着火的**目标——火是这招的另一半，压上去才不浪费；`ai.opening` 开启时跳过已经带灼烧的目标。
 * 怎么排序：按整段真实低扑滑行的线路评分——沿线还能压到更多、且压得过的人时更值得选这条线（距离取本个体公式）。
 * 够不到怎么办：距离交给 `reach`，共享任务把身位收进射程。
 * 放完接什么：交回共享交战计划；被点着的目标交给别的招继续烫。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_heatcrash/mass", function (_access, actor) {
        return String(actor.domain()) === "cobblemon" ? CobblemonCombat.pokemon(actor).weight() : null;
    });

    function heatcrashMassOf(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const mass = CompanionBehavior.fact<number>(context, "world_combat:move_heatcrash/mass", target);
        if (typeof mass === "number" && mass > 0) return mass;
        if (typeof target.width === "number" && typeof target.height === "number")
            return target.width * target.width * target.height * 1000;
        return 0;
    }

    /** 本个体当前配置下整段低扑滑行的总距离；与出手公式同源，用来沿真实线路数敌人。 */
    function heatcrashSlideLength(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        return p("heatcrash", "slideLength", { world: world, actor: world.source(), skill: skills["heatcrash"], detail: { values: capability.data.config } });
    }

    /** 沿施法者到目标的实际方向、在整段滑行距离内、靠近线路的敌人；返回命中数与他们相对施法者的重量优势。 */
    function heatcrashPath(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: WorldMethods.Subject): { count: number; heavier: number } {
        const self = CompanionBehavior.source(context);
        const length = Math.max(0.5, heatcrashSlideLength(context, capability));
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz) || 1, ux = dx / span, uz = dz / span;
        const nearby = (context.facts.nearby || []) as WorldMethods.Subject[];
        const selfMass = heatcrashMassOf(context, self);
        let count = 0, heavier = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along < -0.5 || along > length) continue;
            if (Math.abs(ox * uz - oz * ux) > 1.8) continue;
            count++;
            if (selfMass > 0 && selfMass / Math.max(1, heatcrashMassOf(context, other)) >= 2) heavier++;
        }
        return { count: count, heavier: heavier };
    }

    CompanionBehavior.registerUse("heatcrash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            // 贴地滑行需要一小段清楚的路径：中间隔墙就不扑；不动的 Boss 直接压也在这条线上。
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            const targetMass = Math.max(1, heatcrashMassOf(context, target));
            const ratio = heatcrashMassOf(context, self) / targetMass;
            return ratio >= CompanionBehavior.ai<number>(capability, "minRatio", 0);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && (!CompanionBehavior.ai<boolean>(capability, "opening", true) || !CompanionBehavior.status(context, target, "burn"));
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const targetMass = Math.max(1, heatcrashMassOf(context, target));
            const ratio = heatcrashMassOf(context, CompanionBehavior.source(context)) / targetMass;
            let score = 20;
            if (ratio >= 3) score += 28;
            else if (ratio >= 2) score += 16;
            if (target.grounded === false) score -= 12;
            const burning = CompanionBehavior.status(context, target, "burn");
            if (!burning) score += 22;
            else if (!CompanionBehavior.ai<boolean>(capability, "opening", true)) score += 4;
            // 完整线路与各敌重量：沿线还能压到更多、且压得过的人时，更值得选这条线。
            const path = heatcrashPath(context, capability, target);
            if (path.count >= 2) score += Math.min(18, path.count * 5);
            if (path.heavier >= 2) score += Math.min(12, path.heavier * 4);
            return score;
        }
    });

    addPreferences("heatcrash", {}, [
        field(pathOf("scorch"), "炙压式", "boolean", {
            help: "开启：滑得更远、火痕更宽更久、点燃概率更高、灼烧更久，但单发威力略低、出手与冷却更慢。关闭（疾扑式）：更短更重的一记低扑，滑行短、火痕小、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "起跳距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手进入这个距离内才考虑起跳；调大愿意从远处扑下来，也越容易在腾空期被闪开。"
        }),
        field(pathOf("ai.opening"), "只烧没着火的", "boolean", {
            help: "开启：已经带着灼烧的目标不再主动压上去，把点燃留给还能点着的人；关闭：一视同仁地砸。"
        }),
        field(pathOf("ai.minRatio"), "只压轻的", "number", {
            min: 0, max: 5, step: 0.5,
            help: "只有自己体重达到目标的这个倍数时才主动发起高温重压；0＝总是可以。调高能让它只在明显压过对手时才砸。"
        })
    ]);
}
