/**
 * 必杀门牙 / hyperfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；它是短近身招，够不到交给共享接近逻辑。
 * 排序：目标还没被甩懵时加分（第一次震慑最值），已经懵了就压低；`ai.press`（默认开）在目标正被钉住或压住时再加分，
 * 趁它动不了再补一口；目标已经很低时也略微抬价，当收尾用。
 * `ai.clearLine`（默认开）：甩向由招式配置的左／右偏好决定，AI 读同一配置，若那一侧正对着队友就压低这招的优先级，
 * 优先等一个不会把敌人甩向队友的位置再出手；配置为「未知」时按配置本身使用。
 * `ai.press` 是玩家能预见的取舍：开启＝专挑动不了的目标补刀；关闭＝不追钉住的目标，当普通近身重咬排序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("hyperfang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let value = 22;
            if (!CompanionBehavior.status(context, target, "flinch")) value += 8;
            if (CompanionBehavior.ai<boolean>(capability, "press", true)
                && CompanionBehavior.effect(context, target, "world_combat:rooted")) value += 6;
            if (CompanionBehavior.ratio(target) <= 0.3) value += 4;
            if (!CompanionBehavior.ai<boolean>(capability, "clearLine", true)) return value;
            // 招式按配置的侧偏好甩出；若队友正好在那一侧，这把敌人推向队友，压低优先级等更好的位置。
            const sideConfig = capability.data.config && capability.data.config.side === "left" ? -1 : 1;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const heading = Math.sqrt(dx * dx + dz * dz) || 1;
            const sx = -dz / heading * sideConfig, sz = dx / heading * sideConfig;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (!other.friendly || !(other.health > 0) || other.ref === self.ref) continue;
                const ox = other.point[0] - target.point[0], oz = other.point[2] - target.point[2];
                const along = ox * sx + oz * sz;
                if (along > 0.5 && along < 6) { value -= 10; break; }
            }
            return value;
        }
    });

    addPreferences("hyperfang", {}, [
        field(pathOf("shake"), "摆甩式", "boolean", {
            help: "开启：甩得更狠、钉得更久、畏缩几率更高，但单口威力 ×0.9、起手与冷却更长；关闭：钳咬式，单口威力 ×1.1、出手更快，但位移、钉住与畏缩都更小。"
        }),
        field(pathOf("side"), "甩出方向", "choice", {
            options: [{ value: "right", label: "向右" }, { value: "left", label: "向左" }],
            help: "咬住后固定在释放方向的这一侧甩出：向右或向左。同一方向连续使用不会再随机换边，方便把敌人让出队友的射线。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑咬，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.press"), "压住目标", "boolean", {
            help: "开启：目标正被钉住时优先补一口；关闭：不特意追钉住的目标，当普通近身重咬排序。"
        }),
        field(pathOf("ai.clearLine"), "让出队友射线", "boolean", {
            help: "开启：甩出方向正对着队友时压低这招，优先等一个能把敌人甩离队友的位置；关闭：不检查队友位置，按普通重咬排序。"
        })
    ]);
}
