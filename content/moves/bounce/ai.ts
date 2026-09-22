/**
 * 弹跳 / bounce —— 伙伴 AI 用途。
 *
 * 这招的 AI 围绕「头顶要有一片能弹起来的天」：压在天花板下只能低跳，伙伴宁可交给别的招。
 *   - 何时考虑：目标看得见、活着、非友方，在 `ai.maxChase` 内（或它就是焦点）；并且自己头顶有净空。
 *   - 对谁出手：任何合格目标；已被麻痹的目标仍然砸，但优先度让给没被麻住的（落地这一击本身也在输出）。
 *   - 出手前：没有视线要求（从上方落，不走地面直线），由共用任务走到 reach。
 *   - 够不到：由共用任务靠近；驻守且没开 leaveStation 时不硬追。
 *   - 放完之后：不追加动作，交回共享交战；落点通常已经贴着目标。
 *   - 什么时候紧急：自身生命低于 `ai.escapeBelow` 且目标在射程内时 priority 提到 60——弹上去既是躲开
 *     贴地火力，也能顺着一记落砸回来。
 */
namespace CompanionBehavior {
    /** 头顶 1.5 格是否有净空；没观察到就当作开阔，不拦着伙伴。 */
    function bounceOpen(context: WorldBehavior.Context): boolean {
        const access = world(context), actor = access.actor(source(context).ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return true;
        const position = body.position();
        const block = access.block(point([position.x(), position.y() + body.height() * 0.5 + 1.5, position.z()]));
        return block === null || String(block.id()).indexOf("air") >= 0;
    }

    const bounceChase = PokemonSkills.number("ai.maxChase", "弹跳距离", 3, 16, 1);
    bounceChase.help = "伙伴在威胁离自己这么远以内时才考虑弹跳；调小只在近处落击，调大愿意从更远处扑过去。";
    const bounceEscape = PokemonSkills.number("ai.escapeBelow", "躲闪血线", 0.15, 0.9, 0.05);
    bounceEscape.help = "伙伴生命低于这个比例时把弹跳当成「弹开贴地近战的一击」，priority 提前；调高更常在挨打时弹起来。";
    const bounceLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    bounceLeave.help = "开启后，驻守中的伙伴会离开原位弹出去落击敌人。";

    PokemonSkills.addPreferences(PokemonSkills.bounceId, { ai: { maxChase: 9, escapeBelow: 0.55, leaveStation: false } },
        [bounceChase, bounceEscape, bounceLeave]);

    registerUse(PokemonSkills.bounceId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!bounceOpen(context)) return false;
            if (!target) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            if (context.facts.focus !== target.ref && distance(source(context).point, target.point) > ai<number>(item, "maxChase", 9)) return false;
            return true;
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 9));
        },
        priority: function (context, item, target) {
            if (!target || !bounceOpen(context)) return 0;
            const self = source(context);
            if (ratio(self) < ai<number>(item, "escapeBelow", 0.55) && distance(self.point, target.point) <= item.data.range) return 60;
            return status(context, target, "paralysis") ? 6 : 14;
        }
    });
}
