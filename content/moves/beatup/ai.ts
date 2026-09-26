/**
 * 围攻 / beatup 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 10 格）以内；更重要的是**身边得有看得见目标的同伴**——
 *   本招的价值随「真能射到目标的支援线路」增大，墙后或掉队的友方不计入；孤身时它只是一记普通的暗属小伤。
 *   `ai.minPack`（默认 1，即自己也算）可要求至少几条清晰线路才一起上；只有目标已经很残时（`ai.finishLow`，默认开、
 *   三成血以下）才允许破例单上收尾。
 * 对谁出手：当前威胁；残血目标额外排前，因为它是一串小伤害、正适合收尾。
 * 够不到怎么办：reach 就是召集半径，同伴不在范围内就先把身位收进射程。
 * 放完之后：一串暗影散开，交回共享交战计划。
 */
namespace PokemonSkills {
    function beatupPack(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const rally = p("beatup", "rally", world);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        const goal = CompanionBehavior.point(target.point);
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || !other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) > rally) continue;
            // 只有从这位同伴的位置真能射到目标才算一条支援线路，墙后的不算。
            if (!world.clear(CompanionBehavior.point(other.point), goal)) continue;
            count++;
        }
        return Math.min(6, count);
    }

    function beatupWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
        const min = CompanionBehavior.ai<number>(capability, "minPack", 1);
        if (beatupPack(context, target) < min && !(CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.35)) return false;
        return true;
    }

    CompanionBehavior.registerUse("beatup", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return !target || beatupWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !beatupWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 12 + beatupPack(context, target) * 8;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.35) score += 14;
            return score;
        }
    });

    addPreferences("beatup", {}, [
        field(pathOf("widen"), "围攻式", "boolean", {
            help: "开启（围攻式）：召集半径 ×1.3、每一下 ×0.82——更多同伴加入、每人更轻，总段数更多。关闭（精锐式）：召集半径 ×0.7、每一下 ×1.2——只有近处强手加入，段落少但每下更重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不招呼同伴，先靠近；调大更愿意远距离起手，调小则只在贴身时围殴。"
        }),
        field(pathOf("ai.minPack"), "最少同伴数", "number", {
            min: 1, max: 4, step: 1,
            help: "至少要有几名成员（含自己）在召集半径内才主动出手；调高更挑人数，调低则随时可以单上。目标已经很残时不受这一条限制。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，并允许在人数不足时破例单上收尾；关闭则只看人数与普通排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会招呼同伴扑上去；关闭则只在原地方便时施放。"
        })
    ]);
}
