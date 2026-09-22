/**
 * 贝壳刃 / razorshell 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * `ai.crowd`（默认开）实际改变候选排序：开启时，若身前扇面里挤着两个以上的敌人，把它抬到优先——
 * 宽弧一次削一排护甲才是它的价值；只有单个目标时按普通中近程斩击排序。关闭则不数人头，当单点招排。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("razorshell", {
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
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return 22;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let inArc = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.friendly || !(other.health > 0)) continue;
                if (CompanionBehavior.distance(self.point, other.point) <= capability.data.range) inArc++;
            }
            return inArc >= 2 ? 40 : 22;
        }
    });

    addPreferences("razorshell", {}, [
        field(pathOf("wide"), "揽月式", "boolean", {
            help: "开启：扇面更宽、削甲几率更高、湿身更久、顶得更开，代价是单下威力 ×0.88、冷却 +6；关闭：凿刃式，扇面收窄但单下威力 ×1.15、冷却更短、削甲几率略低，对单点更狠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动横扫，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.crowd"), "横扫一群", "boolean", {
            help: "开启：身前扇面里挤着两个以上敌人时优先横扫，一次削一排护甲；关闭：不数人头，当普通中近程斩击排序。"
        })
    ]);
}
