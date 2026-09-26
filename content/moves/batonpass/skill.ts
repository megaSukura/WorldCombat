/** batonpass：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 当前能力等级：宝可梦读原生阶梯，其他生物读共享 CombatStages 的同一把梯子。 */
    function batonpassStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    export function batonpassCanGive(world: CombatWorld, actor: CombatActor, positiveOnly = false): boolean {
        const stages = batonpassStages(world, actor);
        return Object.keys(stages).some(stat => positiveOnly ? stages[stat] > 0 : stages[stat] !== 0) || MobEffects.native(world, actor, "beneficial").length > 0;
    }
    function batonpassPartner(action: CombatAction): CombatActor | null {
        const world = action.sense(), target = action.target();
        if (!target || !world.valid(target) || !world.friendly(target) || String(target.ref()) === String(action.actor().ref())) return null;
        const body = world.observe(target);
        return body && world.closestPoint(target, action.origin()).minus(action.origin()).length() <= p(batonpassId, "handoffRange", action)
            && world.clear(action.origin(), body.position()) ? target : null;
    }
    function batonpassStep(action: CombatAction, awayFrom: CombatPoint, distance: number, done: (current: CombatAction) => void): void {
        const from = action.origin(), delta = WorldCombat.point(from.x() - awayFrom.x(), 0, from.z() - awayFrom.z());
        if (delta.length() < .01 || !(distance > 0)) { done(action); return; }
        const direction = delta.unit(); let left = distance;
        function step(current: CombatAction): void {
            const moved = current.world().displace(current.actor(), direction.scale(Math.min(.35, left)));
            left -= moved;
            if (moved < .02 || left < .02) { done(current); return; }
            current.after(1, step);
        }
        step(action);
    }

    define({
        freeMovement: true,
        id: batonpassId,
        cooldownParameter: "recharge",
        name: "Baton Pass",
        description: "把自己的能力变化和增益递给伙伴。优先交给明确选定的场内友方；未选实体时让合法后备在交棒点登场，实际转交后自己退开或收回。",
        uses: ["把攒起来的能力等级整体交给队友", "被削弱前把自己的成长交给别人带走", "残血时把接力棒递出去，自己脱身"],
        kind: "aim",
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
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!batonpassCanGive(world, self)) return "nothing-to-pass";
            if (action.target() !== null) return batonpassPartner(action) ? "" : "no-partner";
            const saved = action.data("world_combat:batonpass/reserve"), roster = partyRoster(world, self);
            if (saved) { const expected = JSON.parse(saved); return roster.some(member => member.id === expected.id && member.slot === expected.slot && !member.active && !member.fainted && member.state === "inactive") ? "" : "reserve-changed"; }
            return partyReserve(roster, partyActiveId(world, self)) ? "" : "no-partner";
        },
        windup: function (action, config, prepare) {
            if (action.target() === null) {
                const reserve = partyReserve(partyRoster(action.sense(), action.actor()), partyActiveId(action.sense(), action.actor()));
                if (reserve) action.data("world_combat:batonpass/reserve", JSON.stringify({ slot: reserve.slot, id: reserve.id }));
            }
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

            let recipient = target === null ? null : batonpassPartner(action), switched = false;
            if (target !== null && !recipient) { lone(); done(action); return; }
            if (target === null) {
                const raw = action.data("world_combat:batonpass/reserve"), expected = raw && JSON.parse(raw);
                const reserve = expected && partyRoster(world, self).filter(member => member.id === expected.id && member.slot === expected.slot
                    && !member.active && !member.fainted && member.state === "inactive")[0];
                if (!reserve) { lone(); done(action); return; }
                const sent = partySendOut(world, self, reserve.slot, partyFeet(selfBody));
                if (sent.ok && sent.ref) recipient = world.actor(sent.ref);
                if (!recipient) { lone(); done(action); return; }
                switched = true;
            }
            if (!recipient || !world.valid(recipient)) { lone(); done(action); return; }

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
                const carried = NativeEffects.transferStage(world, self, recipient, entries[index].stat, take, switched);
                left -= carried; moved += carried;
            }

            moved += MobEffects.transfer(world, self, recipient, left);

            if (moved <= 0) {
                if (switched) partyRecall(world, recipient);
                lone(); done(action); return;
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
                if (partyRecall(world, self)) return;
                done(action); return;
            }
            if (ally !== null && withdraw > 0) {
                const flat = origin.minus(ally.position());
                const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                WorldFeedback.emit(world, batonpassScene, 1, origin,
                    { moment: "step", direction: [direction.x(), 0, direction.z()], withdraw: withdraw, scale: scale }, 20);
                batonpassStep(action, ally.position(), withdraw, done); return;
            }
            done(action);
        }
    });
}
