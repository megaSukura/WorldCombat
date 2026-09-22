/**
 * 屏障猛攻 / psyshieldbash 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。开启 `ai.shellFirst`（默认开）时，
 * **身上还没有护盾**（不带 `world_combat:status/psyshield`）的情况下排得更前——先把这一级防御拿到手；
 * 已经带壳时只按普通近身候选排。够不到交给共享接近逻辑。壳在提交时就生效，所以它也是一记可以残血硬打的招。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("psyshieldbash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            if (!close) return 0;
            const shelled = CompanionBehavior.status(context, CompanionBehavior.source(context), "psyshield");
            if (CompanionBehavior.ai<boolean>(capability, "shellFirst", true) && !shelled) return 44;
            return shelled ? 14 : 26;
        }
    });

    addPreferences("psyshieldbash", {}, [
        field(pathOf("harden"), "深凝式", "boolean", {
            help: "开启：护盾编得更厚，防御 +2、壳更持久，但威力更低、冲得更慢、冷却更久；关闭：速攻式，防御 +1、撞得更重。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起屏障猛攻，先走近。越大追击越执着。"
        }),
        field(pathOf("ai.shellFirst"), "没壳时优先", "boolean", {
            help: "开启：身上还没有护盾时优先放这一招，先把防御拿到手；关闭：只按普通近身候选排序。"
        })
    ]);
}
