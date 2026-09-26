/**
 * 扎根 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己血量低于 ai.healBelow（默认 0.75）、还没有扎根、且踩着地、脚下安全。
 *   脚下安全由 ai.safeFooting（默认开）把关：站在岩浆／火／营火／细雪／仙人掌／水这类会持续伤害或没有实心支撑的地方时不扎。
 * 什么时候最想出手：开启 ai.rootGuard（默认）时，威胁进入 ai.maxChase（默认 12）以内、且没有贴到 ai.minGap（默认 2）以内才扎根：
 *   把自己钉住需要一个理由，但敌人已经贴脸时先应付眼前、不在脚下扎死自己。危险在近中距离、血线低时优先。
 * 对谁出手：只有自己（kind self），不需要接近。
 * 放完之后：共享 rooted 把自己钉住、根须按 interval 抽血；脚下失去支撑、根被拔掉、被清除或走完都自动拔根，伙伴回到共享计划。
 * 说明：共享的只读世界入口不提供「主动结束自己效果」的操作，因此「经营结束撤离」这一条暂缺（见报告 needs）。
 */
namespace CompanionBehavior {
    const ingrainBelow = PokemonSkills.number("ai.healBelow", "扎根血量", 0.3, 1, 0.05);
    ingrainBelow.help = "自身生命低于这个比例时，伙计把扎根排进续航计划；调低更倾向先打，调高则一受伤就扎根。";
    const ingrainChase = PokemonSkills.number("ai.maxChase", "守根距离", 3, 24, 1);
    ingrainChase.help = "开启「只守不逃」时，威胁进入这个距离内才扎根；越大越愿意在远处先扎下。";
    const ingrainGap = PokemonSkills.number("ai.minGap", "贴身下限", 1, 8, 1);
    ingrainGap.help = "威胁近于这个距离时不再扎根，先应付贴脸的敌人；调大让伙计在更远之前就放弃扎根。";
    const ingrainGuard = PokemonSkills.flag("ai.rootGuard", "只守不逃");
    ingrainGuard.help = "开启：只在威胁进入守根距离时扎根，把自己钉住前先确认有人要打；关闭：只要受伤就扎根，不在意外面有没有威胁。";
    const ingrainSafe = PokemonSkills.flag("ai.safeFooting", "脚下安全才扎");
    ingrainSafe.help = "开启：站在岩浆、火、营火、细雪、仙人掌或水里时拒绝扎根；关闭：脚下有没有危险都照扎。";

    /** 脚下有没有会持续伤害或没有实心支撑的方块；只读世界入口，读不到就当不安全。 */
    function ingrainHazardous(context: WorldBehavior.Context): boolean {
        try {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context), p = self.point;
            const hazard = function (block: any): boolean {
                if (block === null) return true;
                const id = String(block.id());
                return id === "minecraft:lava" || id === "minecraft:fire" || id === "minecraft:soul_fire"
                    || id === "minecraft:magma_block" || id === "minecraft:campfire" || id === "minecraft:soul_campfire"
                    || id === "minecraft:powder_snow" || id === "minecraft:cactus" || id === "minecraft:sweet_berry_bush"
                    || id === "minecraft:wither_rose" || id === "minecraft:water";
            };
            return hazard(world.block(CompanionBehavior.point([p[0], p[1] + 0.1, p[2]])))
                || hazard(world.block(CompanionBehavior.point([p[0], p[1] - 0.6, p[2]])));
        } catch (ignored) { return true; }
    }

    /** 威胁是否已在守根距离内、且没有贴到贴身下限以内。 */
    function ingrainWindow(context: WorldBehavior.Context, item: WorldBehavior.Capability): { inside: boolean; threat: boolean } {
        const threat = context.senses["world_combat:threat"], self = source(context);
        if (!threat) return { inside: false, threat: false };
        const gap = distance(self.point, threat.point);
        return { inside: gap <= ai<number>(item, "maxChase", 12) && gap >= ai<number>(item, "minGap", 2), threat: true };
    }

    registerUse("ingrain", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function (context) { return !status(context, source(context), "ingrain"); },
        available: function (context, item) {
            const self = source(context);
            if (context.facts.mounted || status(context, self, "ingrain")) return false;
            if (ratio(self) >= ai<number>(item, "healBelow", 0.75)) return false;
            if (self.grounded === false) return false;
            if (ai<boolean>(item, "safeFooting", true) && ingrainHazardous(context)) return false;
            if (!ai<boolean>(item, "rootGuard", true)) return true;
            return ingrainWindow(context, item).inside;
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item) {
            const self = source(context);
            if (status(context, self, "ingrain")) return 0;
            if (ratio(self) >= ai<number>(item, "healBelow", 0.75)) return 0;
            if (!ai<boolean>(item, "rootGuard", true)) return 50;
            return ingrainWindow(context, item).inside ? 50 : 0;
        }
    });

    // 松开根基：把当前这次扎根连同它的标记一起收回。零 PP、零冷却，不占原生招式槽，属于本招附带的独立动作。
    const ingrainReleaseAction = "world_combat:move_ingrain/release";
    const ingrainReleaseUse = "world_combat:move_ingrain/release";
    const ingrainMarkId = "world_combat:ingrain_mark";

    WorldCombat.registerAction(ingrainReleaseAction, "1", 8, "self", 0, function (action) {
        const sense = action.sense(), actor = action.actor();
        let owned: CombatEffectView | null = null;
        const marks = sense.effects(actor, ingrainMarkId);
        for (let i = 0; i < marks.length; i++) {
            const view = marks[i];
            // 只认本行动者自己那一次扎根：source 与 target 都必须是它本人；不碰别人的根，也不新开 id 顶替。
            if (String(view.source().key()) === String(actor.key()) && String(view.target().key()) === String(actor.key())) owned = view;
        }
        if (owned === null) { action.reject("no-ingrain-root"); return; }
        action.commit(0);
        // 提交后再在可写作用域复核同一枚仍 active、且归属仍是本人的标记，精确结束它（end 会同步松根、收身份、播瞬时松根表现）。
        const live = action.world().effects(actor, ingrainMarkId);
        let still = false;
        for (let i = 0; i < live.length; i++) {
            const view = live[i];
            if (view.id() === owned.id() && String(view.source().key()) === String(actor.key())
                && String(view.target().key()) === String(actor.key())) still = true;
        }
        if (still) action.world().operation(owned.id(), "world_combat:dispel", "{}");
        action.finish();
    });

    // 只给本帧一张「松开根基」的凭据；提案阶段只读，真正的解除在注册动作的 action.world 里。
    CompanionBehavior.readFacts("world_combat:move_ingrain/release-fact", function (frame, access) {
        const actor = access.source();
        if (!CombatStatus.has(access, actor, "ingrain")) return;
        const marks = access.effects(actor, ingrainMarkId);
        const owned = marks.some(function (view) {
            return String(view.source().key()) === String(actor.key()) && String(view.target().key()) === String(actor.key());
        });
        if (!owned) return;
        WorldAbilities.grant(frame, { id: ingrainReleaseUse, action: ingrainReleaseAction, use: ingrainReleaseUse,
            protocols: ["world_combat:heal"], kind: "self", range: 0 });
    });

    /** 本次决定帧里本招的凭据：用来读它已有的 ai 偏好，不另立数值。 */
    function ingrainCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = context.capabilities;
        for (let i = 0; i < items.length; i++) if (items[i].data && items[i].data.use === "ingrain") return items[i];
        return null;
    }

    /** 有具体撤离需求时才松开：脚下危险、贴脸需撤离、已恢复却要跟随。 */
    function ingrainReleaseNeeded(context: WorldBehavior.Context, release: WorldBehavior.Capability): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        const ingrain = ingrainCapability(context) || release;
        // 脚下已经危险：继续钉在会害人的地面上只会白挨（复用扎根自己的落脚点判断与开关）。
        if (ai<boolean>(ingrain, "safeFooting", true) && ingrainHazardous(context)) return true;
        const threat = context.senses["world_combat:threat"];
        // 贴脸且需要撤离：威胁已经进入贴身下限，继续扎根等于站在原地挨打。
        if (threat && distance(self.point, threat.point) < ai<number>(ingrain, "minGap", 2)) return true;
        // 已恢复足够、又在跟随命令下被钉着：血线回到扎根门槛以上，松开好跟上去。
        if (context.facts.intent === "follow" && ratio(self) >= ai<number>(ingrain, "healBelow", 0.75)
            && context.facts.anchor && distance(self.point, context.facts.anchor) > 2.5) return true;
        return false;
    }

    CompanionBehavior.registerUse(ingrainReleaseUse, {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        available: function (context, item) { return ingrainReleaseNeeded(context, item); },
        priority: function (context, item) { return ingrainReleaseNeeded(context, item) ? 110 : 0; }
    });

    PokemonSkills.addPreferences("ingrain", { deep: false, ai: { healBelow: 0.75, maxChase: 12, minGap: 2, rootGuard: true, safeFooting: true } }, [
        PokemonSkills.flag("deep", "深扎"),
        ingrainBelow,
        ingrainChase,
        ingrainGap,
        ingrainGuard,
        ingrainSafe
    ]);
}
