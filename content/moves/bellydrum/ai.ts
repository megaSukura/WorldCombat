/**
 * 腹鼓 的伙伴 AI：这是开战期的自我强化，不该在没敌人时空放。
 *
 * 何时考虑：场上有威胁、自身生命高于 ai.healthFloor（默认 0.65，保证压到一半后还站得住），且身上没有
 *   正在生效的同名力量窗口。
 * 对谁出手：只有自己（kind self），reach 0。
 * 优先级：有威胁时抬到 20，让它在共用顺序里优先于普通交战，作为开打前的准备；生命见底时不满足下限自然跳过。
 * 配置：endure 布尔切换「持久鼓劲」——保留生命更低、力量窗口更长。
 */
namespace CompanionBehavior {
    const bellydrumHealthFloor = PokemonSkills.number("ai.healthFloor", "起鼓下限", 0.4, 0.9, 0.05);
    bellydrumHealthFloor.help = "自身生命高于该比例才起鼓；调低更敢用半条命去换，调高则只在满血附近强化。";

    PokemonSkills.addPreferences("bellydrum", { endure: false, ai: { healthFloor: 0.65 } }, [bellydrumHealthFloor]);

    registerUse("bellydrum", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function (context, item) { return ratio(source(context)) > ai<number>(item, "healthFloor", 0.65); },
        priority: function (context) { return context.senses["world_combat:threat"] ? 20 : 0; },
        available: function (context, item) {
            var self = source(context);
            return !!context.senses["world_combat:threat"] && ratio(self) > ai<number>(item, "healthFloor", 0.65)
                && !status(context, self, "bellydrum");
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
