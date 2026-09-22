/**
 * 潜水 / Dive — 伙伴 AI 用途。
 *
 * 这招是一次"先敌一步钻过去"的突袭，所以它的计划围绕接近与绕后：
 *   何时考虑   目标看得见、活着、非友方，且在 `ai.maxChase` 内（或它就是焦点）。
 *   对谁出手   ai.opening=isolated 时只扑身边没有其他敌人的落单目标，避免一头扎进敌群。
 *   出手前     没有硬性视线要求（水痕会绕到脚下），由共用任务走到 reach；驻守且没开 leaveStation
 *              时不硬追，把机会让给别的招。
 *   够不到     由共用任务靠近；走不到就放弃这次，交回交战。
 *   放完之后   after 先退开两步（人已经贴在目标身边），随后由共用交战计划接管。
 *   什么时候紧急  身在水里（深潜、射程与强度更高）时插到更前面。
 *   优先级     0 表示按共享顺序参与；身在水里时 60，抢在别的输出前。
 * 留下的东西：窜出的落点留下一汪涌泉（世界区域），伙伴可以利用它给接下来经过的敌人浇灭灼伤。
 */
namespace CompanionBehavior {
    const diveChase = PokemonSkills.number("ai.maxChase", "突袭距离", 3, 20, 1);
    diveChase.help = "伙伴在威胁离自己这么远以内时才考虑潜水；调小只在近处突袭，调大愿意追出去。";
    const diveOpening = PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "isolated"], ["随时", "只扑落单目标"]);
    diveOpening.help = "「只扑落单目标」时，伙伴只在目标 4 格内没有其他敌人时潜水，不会扎进敌群。";
    const diveLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    diveLeave.help = "开启后，驻守中的伙伴会离开原位去突袭敌人。";

    PokemonSkills.addPreferences("dive", { ai: { maxChase: 12, opening: "anytime", leaveStation: false } }, [diveChase, diveOpening, diveLeave]);

    function diveWet(context: WorldBehavior.Context): boolean {
        var access = world(context), actor = access.actor(source(context).ref);
        var body = actor === null ? null : access.observe(actor);
        return body !== null && body.wet();
    }
    function diveWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.friendly || !threat.visible || threat.health <= 0) return false;
        var self = source(context), range = item.data.range;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        // 驻守且没开 leaveStation 时不硬追，把机会让给别的招。
        if (context.facts.intent === "stay" && !ai<boolean>(item, "leaveStation", false) && distance(self.point, threat.point) > range) return false;
        if (ai<string>(item, "opening", "anytime") !== "isolated") return true;
        var nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === threat.ref || other.friendly || other.health <= 0) continue;
            if (distance(other.point, threat.point) <= 4) return false;
        }
        return true;
    }

    registerUse("dive", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            return !target || diveWants(context, item, target);
        },
        // 身在水里是深潜，射程、威力与顶飞更高，值得抢在别的招前面。
        priority: function (context, item, target) {
            if (!target) return 0;
            return diveWet(context) ? 60 : 0;
        },
        accepts: function (context, item, target) {
            return diveWants(context, item, target);
        },
        // 放完之后：人已经贴在目标身边，先退开两步再交回交战，免得站在对手脸上挨打。
        after: function (context, item, target, progress) {
            if (progress.pullback === undefined) progress.pullback = context.tick;
            if (context.tick - progress.pullback > 20) return;
            var self = source(context), gap = distance(self.point, target.point);
            if (gap >= 2.4) return;
            var dx = self.point[0] - target.point[0], dz = self.point[2] - target.point[2];
            var length = Math.sqrt(dx * dx + dz * dz), unit = length < 0.01 ? 1 : length;
            CompanionBehavior.navigate(context, [self.point[0] + dx / unit * 2, self.point[1], self.point[2] + dz / unit * 2], 1.2);
            return WorldBehavior.running();
        }
    });
}
