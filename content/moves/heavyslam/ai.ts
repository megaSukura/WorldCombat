/**
 * 重磅冲撞 / heavyslam 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内，且自己相对对手的体重比达到 `ai.minRatio`（默认 0＝总是可以）。
 * 对谁出手：**优先压得过（体重比高）的目标**；`ai.crowd` 开启时，目标身旁挤着人会把这一砸排到前面（落点范围能一起震开）。
 * 够不到怎么办：距离交给 `reach`，共享任务把身位收进射程。
 * 放完接什么：交回共享交战计划；它是一记开路的落点重击，不负责追残。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_heavyslam/mass", function (_access, actor) {
        return String(actor.domain()) === "cobblemon" ? CobblemonCombat.pokemon(actor).weight() : null;
    });

    function heavyslamMassOf(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const mass = CompanionBehavior.fact<number>(context, "world_combat:move_heavyslam/mass", target);
        if (typeof mass === "number" && mass > 0) return mass;
        if (typeof target.width === "number" && typeof target.height === "number")
            return target.width * target.width * target.height * 1000;
        return 0;
    }

    CompanionBehavior.registerUse("heavyslam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            const targetMass = Math.max(1, heavyslamMassOf(context, target));
            const ratio = heavyslamMassOf(context, self) / targetMass;
            return ratio >= CompanionBehavior.ai<number>(capability, "minRatio", 0);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const targetMass = Math.max(1, heavyslamMassOf(context, target));
            const ratio = heavyslamMassOf(context, CompanionBehavior.source(context)) / targetMass;
            let score = 20;
            if (ratio >= 3) score += 30;
            else if (ratio >= 2) score += 18;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                let crowd = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 2.4) crowd++;
                }
                if (crowd >= 2) score += 18;
            }
            return score;
        }
    });

    addPreferences("heavyslam", {}, [
        field(pathOf("anchor"), "沉坠式", "boolean", {
            help: "开启：跃得近、单点威力更高、砸出的坑更大，但顶开更少、收招与冷却更久。关闭：冲跳式，跃得远、顶得更开，单发更轻。"
        }),
        field(pathOf("ai.maxChase"), "起跳距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手进入这个距离内才考虑起跳；调大愿意从远处扑下来，也越容易在腾空期被闪开。"
        }),
        field(pathOf("ai.crowd"), "优先压人群", "boolean", {
            help: "开启：目标身旁挤着两个以上敌人时优先砸落（落点范围一发罩住多个）；关闭：只按体重比选目标。"
        }),
        field(pathOf("ai.minRatio"), "只压轻的", "number", {
            min: 0, max: 5, step: 0.5,
            help: "只有自己体重达到目标的这个倍数时才主动发起重磅冲撞；0＝总是可以。调高能让它只在明显压过对手时才砸。"
        })
    ]);
}
