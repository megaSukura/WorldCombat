/**
 * 必杀门牙 / hyperfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；它是短近身招，够不到交给共享接近逻辑。
 * 排序：目标还没被甩懵时加分（第一次震慑最值），已经懵了就压低；`ai.press`（默认开）在目标正被钉住或压住时再加分，
 * 趁它动不了再补一口；目标已经很低时也略微抬价，当收尾用。
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
            return value;
        }
    });

    addPreferences("hyperfang", {}, [
        field(pathOf("shake"), "摆甩式", "boolean", {
            help: "开启：甩得更狠、钉得更久、畏缩几率更高，但单口威力 ×0.9、起手与冷却更长；关闭：钳咬式，单口威力 ×1.1、出手更快，但位移、钉住与畏缩都更小。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑咬，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.press"), "压住目标", "boolean", {
            help: "开启：目标正被钉住时优先补一口；关闭：不特意追钉住的目标，当普通近身重咬排序。"
        })
    ]);
}
