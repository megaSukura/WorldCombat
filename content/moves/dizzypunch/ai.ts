/**
 * 迷昏拳 / dizzypunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.punishCrowd`（默认开）打开时，按**本招自己的真实扇**（朝向该目标、本招实际拳程与张角）
 *   数出还能一起罩住的敌人，越多越优先；`ai.finishLow`（默认开）打开时，残血目标排得更前，用它收尾。
 * 够不到怎么办：拳程短，reach 之内才动手，不够先贴近。
 * 放完之后：打出的混乱交回共享交战计划，让队友接手失手窗口。
 */
namespace PokemonSkills {
    function dizzypunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 本招自己的真实扇角，由服务端按当前个体算出；非宝可梦或无读取时退回设计基准 90 度。 */
    CompanionBehavior.registerFact("world_combat:move_dizzypunch/fan", function (access: CombatWorld, actor: CombatActor) {
        if (!access.valid(actor) || String(actor.domain()) !== "cobblemon") return 0;
        try {
            const values = CompanionRepertoire.catalogue.config(access, actor, "dizzypunch");
            return Number(p("dizzypunch", "arc", { world: access, actor: actor, detail: { values: values } })) || 0;
        } catch (error) { return 0; }
    });

    /** 以自身到目标的朝向开扇，数出扇内除目标外还挤着几个敌人（不含友方/倒地/不可见者）。 */
    function dizzypunchFanCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
        self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        const range = typeof capability.data.range === "number" && isFinite(capability.data.range) ? capability.data.range : 0;
        if (!(range > 0)) return 0;
        const arc = Number(CompanionBehavior.fact<number>(context, "world_combat:move_dizzypunch/fan", self)) || 90;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 0;
        const ux = dx / length, uz = dz / length, cosHalf = Math.cos(Math.min(180, Math.max(5, arc)) * Math.PI / 360);
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > range) continue;
            if (distance < 1e-6 || (ox * ux + oz * uz) / distance >= cosHalf - 1e-9) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("dizzypunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dizzypunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !dizzypunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishCrowd", true)) {
                score += Math.min(16, dizzypunchFanCount(context, capability, self, target) * 8);
            }
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 10;
            if (CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences("dizzypunch", {}, [
        field(pathOf("rapid"), "疾风连打", "boolean", {
            help: "开启：多打一拳、节拍更紧、起手收招与冷却更短，但每拳 ×0.82、混乱更短更少见——压制为主。关闭（重拳节拍）：拳少而重、更容易打晕，循环更慢。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动连打，先走近。拳程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.punishCrowd"), "优先打扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先连打，小扇面能一起罩住；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这串拳收尾；关闭则所有目标同价。"
        })
    ]);
}
