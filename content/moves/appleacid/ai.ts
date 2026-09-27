/**
 * 苹果酸 / appleacid —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 13）格内；这是中远程的一发投掷。
 * 对谁出手：`ai.stackSour`（默认开）打开时，优先对**本施法者自己留下发酵**、且特防还没触底、剩余窗口
 *   还够再扔一颗命中的目标补第二颗——那一发更狠（−2）并耗掉发酵；别人的同身份 sour 不算本招窗口。
 *   目标特防已经触底（≤ −6）就降档，别把窗口浪费在无法再降的目标上；对疾走目标也降档。
 * 不空叠：本招只结算单体、不留场，不针对空池做判断。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再扔；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；若目标还带本招发酵、特防未触底且窗口赶得上，伙伴可优先补第二颗。
 *
 * 手动输入不受这些推荐限制：`kind: "aim"` 允许玩家自由抛向任意关系实体或落点。
 */
namespace PokemonSkills {
    /** 只读本施法者留在目标身上的发酵载体剩余刻数（-1 表示无限）；别人的同身份 sour 不算本招窗口。 */
    CompanionBehavior.registerFact("world_combat:move_appleacid/sour", function (access: CombatWorld, actor: CombatActor, _argument: any): number {
        if (!access.valid(actor)) return 0;
        const owner = String(access.source().ref());
        const views = access.effects(actor, appleacidFermentWindow);
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().ref()) !== owner) continue;
            let anchor: any;
            try { anchor = JSON.parse(views[i].data()); } catch (error) { continue; }
            if (!MobEffects.validAnchor(anchor) || !MobEffects.matches(access, actor, anchor)) continue;
            const carrier = MobEffects.read(access, actor, anchor.id);
            if (carrier !== null) return carrier.duration() < 0 ? -1 : carrier.duration();
        }
        return 0;
    });

    /** 从现在起再扔一颗到命中的出手预算（起手 + 到目标的常规弹程）；剩余窗口短于此就赶不上第二口。 */
    function appleacidSecondCanLand(context: WorldBehavior.Context, capability: WorldBehavior.Capability, remaining: number, distance: number): boolean {
        if (remaining < 0) return true;
        const raw = Number(context.facts.speed);
        const speed = isFinite(raw) ? raw : 50;
        const ferment = !!(capability.data.config && capability.data.config.ferment);
        const tempo = Math.max(6, Math.min(14, 10 - (speed - 50) * 0.04));
        const glob = Math.max(0.7, Math.min(1.5,
            (0.95 + Math.max(-0.12, Math.min(0.4, (speed - 50) * 0.006))) * (ferment ? 0.85 : 1)));
        const reach = Math.min(capability.data.range, Math.max(0, distance));
        return remaining >= tempo + reach / Math.max(0.2, glob);
    }

    CompanionBehavior.registerUse("appleacid", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let base = distance <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "stackSour", true)) return base;
            const remaining = CompanionBehavior.fact<number>(context, "world_combat:move_appleacid/sour", target) || 0;
            const dropped = CompanionBehavior.stage(context, target, "spd");
            // 窗口剩得够不够再扔到这一颗：剩余非零但赶不上的（例如只剩 1 刻）不再优先。
            if (remaining !== 0 && dropped > -6 && appleacidSecondCanLand(context, capability, remaining, distance)) base += 12;
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
            if (speed > 0.12) base -= 6;
            if (dropped <= -6) base -= 8;
            return base;
        }
    });

    addPreferences("appleacid", {}, [
        field(pathOf("ferment"), "发酵式", "boolean", {
            help: "开启：苹果飞得更慢、砸击更轻、射程略短，但发酵窗口 ×1.6，更容易对同一目标接上第二口；关闭（爆汁式）：一发更痛、飞得更快、射得更远，但窗口短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不扔苹果，先走近；越大越愿意从远处先手。"
        }),
        field(pathOf("ai.stackSour"), "叠酸优先", "boolean", {
            help: "开启：优先对已带自己发酵、特防还没触底、剩余窗口赶得上第二颗的目标再补一颗（第二口更狠，−2），对疾走目标降档、特防触底的目标降档；关闭：当普通远程攻击排序。"
        })
    ]);
}
