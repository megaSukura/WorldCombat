/**
 * 飞翔 / Fly — 伙伴 AI 用途。
 *
 * 这招的 AI 围绕“头顶那片天空是资源”：
 *   - 何时考虑：目标看得见、活着、非友方，且在 `ai.maxChase` 内（或它就是焦点）；并且自己头顶有净空
 *     （`flyOpen` 检查头顶 1.5 格是不是空的）。压在天花板下只剩低跳，伙伴宁可交给别的招。
 *   - 对谁出手：默认接受任何合格目标；`ai.minHealth` 决定带伤到什么程度还愿意飞上去换一击。
 *   - 出手前：没有视线要求（从上方落，不走地面直线），由共用任务走到 reach。
 *   - 够不到：由共用任务靠近；驻守且没开 leaveStation 时不硬追。
 *   - 放完之后：不追加动作，交回共享交战；落点通常已经贴着目标。
 *   - 什么时候紧急：自身生命低于 `ai.minHealth` 且目标在射程内时 priority 提到 60——用天空躲开近战火力
 *     的同时仍然砸出去，是这招最像“逃也是打”的一刻。
 */
namespace CompanionBehavior {
    /** 头顶 1.5 格是否有净空；没观察到就当作开阔，不拦着伙伴。 */
    function flyOpen(context: WorldBehavior.Context): boolean {
        var access = world(context), actor = access.actor(source(context).ref);
        var body = actor === null ? null : access.observe(actor);
        if (body === null) return true;
        var position = body.position();
        var block = access.block(point([position.x(), position.y() + body.height() * 0.5 + 1.5, position.z()]));
        return block === null || String(block.id()).indexOf("air") >= 0;
    }

    const flyChase = PokemonSkills.number("ai.maxChase", "俯冲距离", 3, 22, 1);
    flyChase.help = "伙伴在威胁离自己这么远以内时才考虑飞翔；调小只在近处落击，调大愿意从更远处飞过去。";
    const flyHealth = PokemonSkills.number("ai.minHealth", "最低血线", 0.15, 0.9, 0.05);
    flyHealth.help = "伙伴生命低于这个比例时才把飞翔当成“躲开近战的一击”，priority 提前；调高更常在挨打时飞。";
    const flyLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    flyLeave.help = "开启后，驻守中的伙伴会离开原位飞出去落击敌人。";

    PokemonSkills.addPreferences("fly", { ai: { maxChase: 14, minHealth: 0.5, leaveStation: false } }, [flyChase, flyHealth, flyLeave]);

    registerUse("fly", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (!flyOpen(context)) return false;
            if (!target) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            if (context.facts.focus !== target.ref && distance(source(context).point, target.point) > ai<number>(item, "maxChase", 14)) return false;
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var self = source(context), range = item.data.range;
            // 带伤、目标又在射程内：飞上去既能躲开贴地的火力，又能砸下去。
            if (ratio(self) < ai<number>(item, "minHealth", 0.5) && distance(self.point, target.point) <= range) return 60;
            return 0;
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 14));
        }
    });
}
