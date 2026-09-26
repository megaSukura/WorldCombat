/**
 * 踢倒 / lowkick 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内，体量达到 `ai.minMass`（默认 0＝总是可以）。
 * 对谁出手：**只对双脚着地的目标**（扫不到腾空者的腿），且优先重的目标；已经带着 `tripped` 身份的目标跳过。
 * 够不到怎么办：距离交给 `reach`，共享任务贴身；这是一记贴身快踢，不负责远程。
 * 放完接什么：交回共享交战计划；`ai.finish` 开启时，残血目标会让它抢先补这一脚。
 */
namespace PokemonSkills {
    

    function lowkickMassOf(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const mass = CompanionBehavior.mass(context, target);
        if (typeof mass === "number" && mass > 0) return mass;
        if (typeof target.width === "number" && typeof target.height === "number")
            return target.width * target.width * target.height * 1000;
        return 0;
    }

    CompanionBehavior.registerUse("lowkick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            return lowkickMassOf(context, target) >= CompanionBehavior.ai<number>(capability, "minMass", 0) * 10;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const mass = lowkickMassOf(context, target);
            let score = 22;
            if (mass >= 1000) score += 26;
            else if (mass >= 500) score += 14;
            if (target.grounded === false) score -= 18;
            if (CompanionBehavior.status(context, target, "tripped")) score -= 14;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 30;
            // 扫堂式只有真的有人落在这一脚的侧前方腿弧里才值得偏好；背后的人带不到。
            if (CompanionBehavior.ai<boolean>(capability, "reap", false)) {
                const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
                const length = Math.sqrt(dx * dx + dz * dz) || 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    const ox = other.point[0] - target.point[0], oz = other.point[2] - target.point[2];
                    if (Math.sqrt(ox * ox + oz * oz) > 1.7) continue;
                    if ((ox * dx + oz * dz) / length < -0.2) continue;
                    score += 12;
                    break;
                }
            }
            return score;
        }
    });

    addPreferences("lowkick", {}, [
        field(pathOf("reap"), "扫堂式", "boolean", {
            help: "开启：突进更远，扫踢会顺手带倒目标身旁的另一名敌人，但单发威力略低、收招与冷却更久。关闭：一记更重更快的单体扫踢。"
        }),
        field(pathOf("ai.maxChase"), "贴身距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手进入这个距离内才考虑踢倒；调大愿意主动贴上去，调小只在近身时踢。"
        }),
        field(pathOf("ai.minMass"), "只踢重物", "number", {
            min: 0, max: 400, step: 10,
            help: "目标体重低于这个值（单位 kg）时不主动发起踢倒；0＝总是可以。调高能把这一招专门留给笨重的对手。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一脚；关闭：只按普通近身候选参与排序。"
        })
    ]);
}
