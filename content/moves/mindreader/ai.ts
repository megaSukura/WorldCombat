/**
 * 心之眼 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次读。
 * 什么时候最想出手：对手正在拉开（共享 movement 感官判为 fleeing）或正在横移（真实 velocity 与视线方向几乎垂直）
 *   时 priority 抬最高——移动的目标最需要先看清走向；打自己／主人时次之；其余情况 74，仍排在普通攻击之前，
 *   把这次更准的攻击铺好。读还在身上时不重复读，交给后续攻击兑现（打别的目标不消耗这层读）。
 * 对谁出手：当前威胁。
 * 够不到怎么办：reach 直接取本招 resolve 出的 reach 参数，与执行同一份；由共享接近逻辑把身体带进范围。
 * 配置：ai.maxChase 限制考虑距离（追击意愿，不是命中距离）；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("mindreader", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 真实速度与「目标→施法者」的水平方向越接近垂直，越是横移中的对手。 */
    function mindreaderStrafing(context: WorldBehavior.Context, threat: Entity): boolean {
        const motion = velocity(context, threat);
        if (!motion) return false;
        const self = source(context);
        const vx = motion[0], vz = motion[2], speed = Math.sqrt(vx * vx + vz * vz);
        if (speed < 0.05) return false;
        const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        return Math.abs((vx * dx + vz * dz) / (length * speed)) < 0.5;
    }

    function mindreaderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, self, "mindreader")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("mindreader", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || mindreaderWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !mindreaderWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            if (fleeing(context, target)) return 86;
            if (mindreaderStrafing(context, target)) return 84;
            return target.attacking === self.ref || !!owner && target.attacking === owner.ref ? 80 : 74;
        }
    });
}
