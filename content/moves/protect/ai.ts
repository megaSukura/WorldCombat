/**
 * 守住 / protect 的 AI 用途。
 *
 * 什么局面下出手：有威胁、距离进入 `ai.trigger`、且自己身上还没有穹顶时撑罩。
 * 排序按「这一下值不值得挡」：真正朝自己出手（`threat.attacking === self`）的一击最急，抬到 100 以上抢在共享顺序前；
 * 刚挨过打（`hurtAgo < 20`）只作次级证据；只是站在远处的敌人排最低。再用当前护盾量占最大生命的比例加减——
 * 罩够厚才赚，残血时罩薄收益下降——并按本次连用失误率折算，避免连撑白罩。
 * 没有威胁时不出手；撑罩期间定身，所以出手是个真实的取舍。
 * “只剩本招可选”时：威胁一进 `ai.trigger` 就会起罩，不依赖别的招先出手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("protect", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), ProtectRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "trigger", 10);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const world = CompanionBehavior.world(context), actor = world.source(), values = capability.data.config;
            const args: any = { world: world, actor: actor, skill: skills["protect"], detail: { values: values } };
            // 用本次真正会掷的有效时窗连用计数（与 ready 同一份），再据此折算失败风险。
            const effective = GuardEffects.stall(state(world, actor, GuardEffects.stallKey), world.tick(), p("protect", "stallReset", args));
            const variables: any = {}; variables["state." + GuardEffects.stallKey + "#stall"] = effective;
            args.variables = variables;
            const fizzle = p("protect", "fizzle", args);
            const distance = CompanionBehavior.distance(self.point, threat.point);
            // 已经有一击瞄准自己才最急；刚挨打是次级证据；只是附近的敌人排最低，不再一律 60。
            const aimed = threat.attacking === self.ref;
            const recentlyHurt = typeof self.hurtAgo === "number" && self.hurtAgo < 20;
            let value = aimed ? 100 : recentlyHurt ? 55 : 25;
            // 当前护盾量占最大生命的比例：罩够挡一下才赚；残血时罩薄，收益随之下降。
            const capacity = p("protect", "capacity", args);
            const maximum = self.maximum > 0 ? self.maximum : 1;
            value += Math.max(-15, Math.min(15, (capacity / maximum - 0.3) * 40));
            if (distance <= 4) value += 8; else if (distance >= 9) value -= 10;
            return Math.max(0, Math.min(105, Math.round(value * (1 - Math.min(0.9, fizzle)))));
        }
    });

    addPreferences("protect", {}, [
        field(pathOf("braced"), "守据／瞬罩", "boolean", {
            help: "开启守据：屏障 ×1.3、护盾量 ×1.15，但收招 10 刻、冷却 ×1.15，且整段定身。关闭瞬罩：屏障 ×0.8、护盾量 ×0.8，收招只要 4 刻、冷却 ×0.85，撑罩期间还能走动。"
        }),
        field(pathOf("ai.trigger"), "反应距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离就考虑撑罩。越大越早预判，也越可能白撑；越小越省，但可能来不及。"
        })
    ]);
}
