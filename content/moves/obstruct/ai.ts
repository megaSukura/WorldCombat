/**
 * 拦堵 / obstruct 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有拒马时立起；
 * 优先正在逼近的接触攻击者：已经贴上或正把矛头指向自己时抬到 110，正朝自己移动且在 5 格内时抬到 80；
 * 只有远程／不靠近的独敌时降到 25，不抢守住的位置。撑罩期间定身，所以它是一记“请君入瓮”的取舍。
 * 只剩本招时，敌人贴进 `ai.range` 就会立起等它撞。
 */
namespace PokemonSkills {
    /** 该威胁是否正朝自己移动（用 survey 提供的速度）：贴过来的是接触攻击者，才值得为它立拒马。 */
    function obstructClosing(self: CompanionBehavior.Entity, threat: CompanionBehavior.Entity): boolean {
        const velocity = threat.velocity;
        if (!velocity || !Array.isArray(velocity) || velocity.length < 3) return false;
        const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        return length > 0.01 && (velocity[0] * dx + velocity[2] * dz) / length > 0.01;
    }

    CompanionBehavior.registerUse("obstruct", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), ObstructRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 4);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            if (threat.attacking === self.ref || distance <= 2.5) return 110;
            if (obstructClosing(self, threat) && distance <= 5) return 80;
            return distance <= 4 ? 55 : 25;
        }
    });

    addPreferences("obstruct", {}, [
        field(pathOf("barbs"), "带刺／加固", "boolean", {
            help: "开启带刺：接触降防 +1，但拒马量 ×0.75、持续 ×0.85，收招 6 刻。关闭加固：拒马量 ×1.2、持续 ×1.15，降防不额外加，收招 10 刻。"
        }),
        field(pathOf("ai.range"), "立拒马距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才立拒马。越大越早摆好，越可能空立；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
