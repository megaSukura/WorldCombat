/**
 * 接棒 / batonpass 的出手方式。
 *
 * 核心念头：把此刻身上积累的能力变化打包成一根发光的接力棒，递到身边最近的伙伴手里，自己退开一步——「我这一程跑完了，
 *   接下来交给你」。这是这一族里唯一一招**把好处从自己身上搬给别人**：棒里装的是施法者此刻真实的等级阶梯。
 *
 * 两幕：
 *   起（gather，提交前）：压身把散在身上的劲收拢，脚边与手边聚起细光，只播预告。
 *   递（stream → lend／lone，提交后）：一根接力棒沿施法者到伙伴的连线飞过去；伙伴接手同样的等级（按 `carry` 上限，
 *     取绝对值最大的几项），施法者对应清空；随后自己背离伙伴退开 `withdraw`。伙伴不在时棒落在原地（lone）。
 *
 * 与同族分开：急速折返撞一下再走、断尾留物引敌、瞬间移动只挪自己；只有接棒**把自己的能力等级交到别人身上**。
 * 提交前只观察、只 present；连级、退步与粒子都在提交后写。
 */
namespace PokemonSkills {
    /** 当前能力等级：宝可梦读原生阶梯，其他生物读共享 CombatStages 的同一把梯子。 */
    function batonpassStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (String(actor.domain()) === "cobblemon") return NativeEffects.read(world, actor).stages || {};
        return CombatStages.read(world, actor);
    }

    /** 背离 awayFrom 退开 distance；优先瞬移到落点，失败就一步步位移。返回实际移动量。 */
    function batonpassStep(world: CombatWorld, actor: CombatActor, awayFrom: CombatPoint, distance: number): number {
        const body = world.observe(actor);
        if (body === null || !(distance > 0)) return 0;
        const from = body.position();
        const flat = WorldCombat.point(from.x() - awayFrom.x(), 0, from.z() - awayFrom.z());
        if (flat.length() < 0.01) return 0;
        const step = flat.unit().scale(distance);
        const feet = WorldCombat.point(from.x(), from.y() - body.height() / 2, from.z());
        if (world.teleport(actor, feet.plus(step))) return distance;
        return world.displace(actor, step);
    }

    define({
        id: batonpassId,
        name: "Baton Pass",
        description: "把自己此刻的能力等级打包递给待命的一只或身边最近的伙伴，自己清空；有后备时由接棒者上场，否则退开一步。",
        uses: ["把攒起来的能力等级整体交给队友", "被削弱前把自己的成长交给别人带走", "残血时把接力棒递出去再脱身"],
        kind: "friend",
        range: 5,
        maxRange: 9,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "relay",
        defaults: { relay: true, ai: { maxChase: 12, leaveStation: false } },
        fields: [flag("relay", "接力式")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[batonpassId], detail: { values: config } };
            return {
                radius: p(batonpassId, "handoffRange", context), geometry: "circle", style: "relay", color: 0x9FE6A0,
                label: config && config.relay ? "接棒·接力式" : "接棒·独走式"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[batonpassId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(batonpassId, "tempo", context)),
                recover: Math.round(p(batonpassId, "aftercast", context)),
                cooldown: Math.round(p(batonpassId, "recharge", context)),
                active: 0,
                range: p(batonpassId, "handoffRange", context)
            };
        },
        ready: function (action, config) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-partner";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_batonpass:gather", batonpassScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", relay: config && config.relay ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const selfBody = world.observe(self);
            if (selfBody === null) { done(action); return; }
            const origin = selfBody.position();
            const carry = Math.max(1, Math.round(p(batonpassId, "carry", action)));
            const motes = Math.max(8, Math.round(p(batonpassId, "motes", action)));
            const mark = Math.max(40, Math.round(p(batonpassId, "markTicks", action)));
            const withdraw = p(batonpassId, "withdraw", action);
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));

            function lone(): void {
                WorldFeedback.emit(world, batonpassScene, 1, origin, { moment: "lone", motes: motes, scale: scale }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), batonpassLoneText, [], 24);
                world.sound("minecraft:entity.player.attack.nodamage", origin, 14, "{}");
            }

            // 真实换人：有合法后备时先让它在原地登场，把所选等级交接给它，再收回自己——交棒之后旧作用域不再使用。
            // 没有后备时退回到既有的「把棒递给身边最近的伙伴」。
            const reserve = partyReserve(partyRoster(world, self), partyActiveId(world, self));
            let recipient: CombatActor | null = null, switched = false;
            if (reserve !== null) {
                const sent = partySendOut(world, self, reserve.slot, partyFeet(selfBody));
                if (sent.ok && sent.ref) {
                    const incoming = world.actor(sent.ref);
                    if (incoming !== null) { recipient = incoming; switched = true; }
                }
            }
            if (recipient === null) {
                if (target === null || !world.valid(target) || !world.friendly(target) || String(target.ref()) === String(self.ref())) {
                    lone(); done(action); return;
                }
                recipient = target;
            }
            // If the native send-out already recalled the caster, the old scope is spent; finish on the native result alone.
            if (switched && !world.valid(self)) { done(action); return; }

            // 取绝对值最大的几项，直到 `carry` 用完；没递出的等级留在自己身上。
            const stages = batonpassStages(world, self);
            const entries: { stat: string; stage: number }[] = [];
            for (let index = 0; index < batonpassStats.length; index++) {
                const stage = stages[batonpassStats[index]] || 0;
                if (stage !== 0) entries.push({ stat: batonpassStats[index], stage: stage });
            }
            entries.sort(function (a, b) { return Math.abs(b.stage) - Math.abs(a.stage); });
            let left = carry, moved = 0;
            for (let index = 0; index < entries.length && left > 0; index++) {
                const magnitude = Math.min(Math.abs(entries[index].stage), left);
                const take = entries[index].stage < 0 ? -magnitude : magnitude;
                if (take === 0) continue;
                NativeEffects.boost(world, recipient, entries[index].stat, take);
                NativeEffects.boost(world, self, entries[index].stat, -take);
                left -= magnitude; moved += magnitude;
            }

            const path: (string | number[])[] = [String(self.ref()), String(recipient.ref())];
            WorldFeedback.emit(world, batonpassScene, 1, origin,
                { moment: "stream", path: path, target: String(recipient.ref()), motes: motes, moved: moved, scale: scale }, 26);
            const ally = world.observe(recipient);
            if (ally !== null) {
                MobEffects.apply(world, recipient, batonpassEffect, mark, 0);
                WorldFeedback.emit(world, batonpassScene, 1, ally.position(),
                    { moment: "lend", target: String(recipient.ref()), motes: motes, moved: moved,
                        intensity: Math.max(0.7, Math.min(2, 0.7 + moved / 3)), scale: scale }, 28);
                WorldFeedback.text(world, ally.position().plus(WorldCombat.point(0, 1.3, 0)), batonpassText, [moved], 30);
                world.sound("minecraft:entity.allay.item_given", ally.position(), 16, "{}");
            } else {
                lone();
            }
            if (switched) {
                // 交棒已经完成；收回旧个体，此后只依赖原生结果，不再使用旧的动作／世界作用域。
                partyRecall(world, self);
                done(action); return;
            }
            if (ally !== null && withdraw > 0) {
                const flat = origin.minus(ally.position());
                const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                batonpassStep(world, self, ally.position(), withdraw);
                WorldFeedback.emit(world, batonpassScene, 1, origin,
                    { moment: "step", direction: [direction.x(), 0, direction.z()], withdraw: withdraw, scale: scale }, 20);
            }
            done(action);
        }
    });
}
