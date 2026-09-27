/**
 * 王者盾牌 / kingsshield 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有钢盾时立起；贴脸又残血时抬到 105 抢在共享顺序前——
 * 钢盾最厚，正是吃下致命一击的那一下。残血时优先立威仪（降攻），血厚时磐固硬挡由配置决定，AI 只按血量调优先级。
 * 变化招式会穿过钢盾，所以它不为挡变化招而起意；理由与说明一致。
 * 只剩本招时：威胁一进 `ai.range` 就会立盾。
 */
namespace PokemonSkills {
    /** 正在朝自己飞来的敌对弹体位置：读真实 projectiles 快照，速度方向与「弹体→自己」一致才算。 */
    function kingShieldInbound(context: WorldBehavior.Context, range: number): number[] | null {
        const key = "kingsshield:inbound";
        const cache = context.scratch[key] as { tick: number; actor: string; value: number[] | null } | undefined;
        if (cache && cache.tick === context.tick && cache.actor === context.actor) return cache.value;
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        let value: number[] | null = null;
        try {
            const list = JSON.parse(String(world.projectiles(CompanionBehavior.point(self.point), range)));
            if (Array.isArray(list)) for (let i = 0; i < list.length; i++) {
                const shot = list[i];
                if (!shot || !shot.hostile || !Array.isArray(shot.position) || !Array.isArray(shot.velocity)) continue;
                const from = shot.position, velocity = shot.velocity;
                const to = [self.point[0] - from[0], self.point[1] - from[1], self.point[2] - from[2]];
                const tl = Math.sqrt(to[0] * to[0] + to[1] * to[1] + to[2] * to[2]);
                const vl = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
                if (!(tl > 1e-3) || !(vl > 1e-3)) continue;
                if ((to[0] * velocity[0] + to[1] * velocity[1] + to[2] * velocity[2]) / (tl * vl) > 0.6) { value = from.slice(); break; }
            }
        } catch (error) { value = null; }
        context.scratch[key] = { tick: context.tick, actor: context.actor, value: value };
        return value;
    }

    CompanionBehavior.registerUse("kingsshield", {
        protocols: ["world_combat:survive"],
        target: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            const inbound = kingShieldInbound(context, Math.max(6, CompanionBehavior.ai<number>(capability, "range", 5)));
            const facing = JSON.parse(JSON.stringify(target));
            // 有弹体正朝自己飞来就朝它立盾；否则面向威胁。
            if (inbound) facing.point = inbound;
            else if (threat) facing.point = threat.point.slice();
            return facing;
        },
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), KingShieldRule)) return false;
            // 飞弹已经进入正面范围时也值得立盾，不再只看仇恨对象与距离。
            if (kingShieldInbound(context, Math.max(6, CompanionBehavior.ai<number>(capability, "range", 5)))) return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            const self = CompanionBehavior.source(context);
            const range = CompanionBehavior.ai<number>(capability, "range", 5);
            let score = 0;
            // 真正的攻击/飞弹已经进入正面：举盾抢在落地前。
            if (kingShieldInbound(context, Math.max(6, range))) score = Math.max(score, 104);
            if (threat && threat.attacking === self.ref
                && CompanionBehavior.distance(self.point, threat.point) <= Math.max(4, range)) score = Math.max(score, 102);
            if (threat && CompanionBehavior.distance(self.point, threat.point) <= range) score = Math.max(score, 60);
            // 贴脸残血时最厚的一面留给致命一击。
            if (threat && CompanionBehavior.ratio(self) < 0.5 && CompanionBehavior.distance(self.point, threat.point) <= 4) score = Math.max(score, 105);
            return score;
        }
    });

    addPreferences("kingsshield", {}, [
        field(pathOf("majesty"), "威仪／磐固", "boolean", {
            help: "开启威仪：接触削攻 +1 级，但钢盾总量 ×0.8、持续 ×0.85、收招 7 刻——削得狠，挡得薄。关闭磐固：总量 ×1.25、持续 ×1.15、收招 5 刻，但削攻不额外加——挡得厚，削得轻。"
        }),
        field(pathOf("ai.range"), "立盾距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才立钢盾。越大越早摆好，也越可能空立；越小越省，但可能来不及。"
        })
    ]);
}
