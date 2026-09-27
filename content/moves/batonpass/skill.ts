/** batonpass：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 当前能力等级：宝可梦读原生阶梯，其他生物读共享 CombatStages 的同一把梯子。 */
    function batonpassStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    /** 真正能被这条路递出去的项目：五能力等级，或可转的原生增益。精度／闪避不在交接清单里。 */
    export function batonpassCanGive(world: CombatWorld, actor: CombatActor, positiveOnly = false): boolean {
        const stages = batonpassStages(world, actor);
        const stat = batonpassStats.some(name => positiveOnly ? (stages[name] || 0) > 0 : (stages[name] || 0) !== 0);
        return stat || MobEffects.native(world, actor, "beneficial").length > 0;
    }

    export interface BatonpassEntry { stat: string; amount: number; }

    /** 保留原 signed 顺序：绝对级数大的能力先转，剩余额度再转原生增益。 */
    export function batonpassPlan(world: CombatWorld, actor: CombatActor, recipient: CombatActor, carry: number): BatonpassEntry[] {
        const stages = batonpassStages(world, actor), entries: { stat: string; stage: number }[] = [];
        for (let index = 0; index < batonpassStats.length; index++) {
            const stage = stages[batonpassStats[index]] || 0;
            if (stage !== 0) entries.push({ stat: batonpassStats[index], stage: stage });
        }
        entries.sort(function (a, b) { return Math.abs(b.stage) - Math.abs(a.stage); });
        const plan: BatonpassEntry[] = [];
        let left = carry;
        for (let index = 0; index < entries.length && left > 0; index++) {
            const other = NativeEffects.effectiveStage(world, recipient, entries[index].stat);
            const room = entries[index].stage > 0 ? Math.max(0, 6 - other) : Math.max(0, other + 6);
            const amount = Math.min(Math.abs(entries[index].stage), left, room);
            if (amount <= 0) continue;
            plan.push({ stat: entries[index].stat, amount: entries[index].stage > 0 ? amount : -amount });
            left -= amount;
        }
        return plan;
    }

    /** 按实际转出顺序得到的正负项目，供 AI 判断接收者的净收益；不预演原生增益。 */
    export function batonpassValue(world: CombatWorld, actor: CombatActor, recipient: CombatActor, carry: number): { gains: number; losses: number } {
        const plan = batonpassPlan(world, actor, recipient, carry);
        let gains = 0, losses = 0;
        for (let index = 0; index < plan.length; index++) {
            if (plan[index].amount > 0) gains += plan[index].amount; else losses -= plan[index].amount;
        }
        let left = Math.max(0, carry - gains - losses);
        MobEffects.native(world, actor, "beneficial").forEach(effect => {
            const cost = Math.max(1, effect.amplifier() + 1), current = MobEffects.read(world, recipient, effect.id());
            if (cost > left || current && (current.amplifier() > effect.amplifier() || current.amplifier() === effect.amplifier()
                && (current.duration() < 0 || effect.duration() >= 0 && current.duration() >= effect.duration()))) return;
            gains += cost; left -= cost;
        });
        return { gains: gains, losses: losses };
    }

    function batonpassPartner(action: CombatAction): CombatActor | null {
        const world = action.sense(), target = action.target();
        if (!target || !world.valid(target) || !world.friendly(target) || String(target.ref()) === String(action.actor().ref())) return null;
        const body = world.observe(target);
        return body && world.closestPoint(target, action.origin()).minus(action.origin()).length() <= p(batonpassId, "handoffRange", action)
            && world.clear(action.origin(), body.position()) ? target : null;
    }

    /** 退步：逐步查真实支撑，撞墙或到悬崖边沿就停；画面每刻只报当前真实子段。 */
    function batonpassStep(action: CombatAction, awayFrom: CombatPoint, distance: number, scenes: WorldFeedback.ActionScenes, scale: number, done: (current: CombatAction) => void): void {
        const start = action.origin(), delta = WorldCombat.point(start.x() - awayFrom.x(), 0, start.z() - awayFrom.z());
        if (delta.length() < .01 || !(distance > 0)) { done(action); return; }
        const direction = delta.unit();
        let left = distance, previous = start;
        function step(current: CombatAction): void {
            const world = current.world(), here = world.observe(current.actor());
            if (here === null) { done(current); return; }
            const leg = Math.min(.35, left), feet = partyFeet(here);
            const route = SurfacePaths.advance(world, feet, direction, leg, { up: .1, down: .35, spacing: .15, samples: 3 });
            if (route.travelled < .02) { done(current); return; }
            const moved = world.displace(current.actor(), route.point.minus(feet));
            left -= moved;
            const after = world.observe(current.actor());
            if (after !== null) {
                const now = after.position();
                scenes.show(current, "step", now, { moment: "step", path: [[previous.x(), previous.y(), previous.z()], [now.x(), now.y(), now.z()]],
                    direction: [direction.x(), 0, direction.z()], withdraw: distance, scale: scale });
                previous = now;
            }
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
            if (action.target() !== null) {
                const recipient = batonpassPartner(action);
                if (!recipient) return "no-partner";
                const value = batonpassValue(world, self, recipient, Math.max(1, Math.round(p(batonpassId, "carry", action))));
                return value.gains + value.losses > 0 ? "" : "nothing-to-pass";
            }
            const saved = action.data("world_combat:batonpass/reserve"), roster = partyRoster(world, self);
            if (saved) { const expected = JSON.parse(saved); return roster.some(member => member.id === expected.id && member.slot === expected.slot && !member.active && !member.fainted && member.state === "inactive") ? "" : "reserve-changed"; }
            return partyReserve(roster, partyActiveId(world, self)) ? "" : "no-partner";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), self = action.actor();
            if (action.target() === null) {
                const reserve = partyReserve(partyRoster(world, self), partyActiveId(world, self));
                if (reserve) action.data("world_combat:batonpass/reserve", JSON.stringify({ slot: reserve.slot, id: reserve.id }));
            }
            const stages = batonpassStages(world, self);
            let items = 0;
            for (let index = 0; index < batonpassStats.length; index++) if ((stages[batonpassStats[index]] || 0) !== 0) items++;
            items += MobEffects.native(world, self, "beneficial").length;
            action.present("world_combat:move_batonpass:gather", batonpassScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", relay: config && config.relay ? 1 : 0, items: items,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            const recipient = batonpassPartner(action), carry = Math.max(1, Math.round(p(batonpassId, "carry", action)));
            const preview: { [id: string]: number } = {};
            if (recipient) batonpassPlan(world, self, recipient, carry).forEach(entry => { preview[entry.stat] = entry.amount; });
            else batonpassStats.forEach(stat => { preview[stat] = stages[stat] || 0; });
            action.present("batonpass:preview", "world_combat:feedback", 1, action.origin().plus(WorldCombat.point(0, 1, 0)),
                JSON.stringify({ kind: "world-text", start: world.tick(), duration: Math.max(1, prepare),
                    key: "world_combat.move.batonpass.text.preview", args: batonpassStats.map(stat => {
                        const value = preview[stat] || 0; return value > 0 ? "+" + value : String(value);
                    }) }));
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
            const scenes = WorldFeedback.actionScenes(batonpassScene, 1);
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }
            function lone(): void {
                WorldFeedback.emit(world, batonpassScene, 1, origin, { moment: "lone", motes: motes, scale: scale }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), batonpassLoneText, [], 24);
                world.sound("minecraft:entity.player.attack.nodamage", origin, 14, "{}");
            }

            let recipient = target === null ? null : batonpassPartner(action), switched = false;
            if (target !== null && !recipient) { lone(); finish(action); return; }
            if (target === null) {
                const raw = action.data("world_combat:batonpass/reserve"), expected = raw && JSON.parse(raw);
                const reserve = expected && partyRoster(world, self).filter(member => member.id === expected.id && member.slot === expected.slot
                    && !member.active && !member.fainted && member.state === "inactive")[0];
                if (!reserve) { lone(); finish(action); return; }
                const sent = partySendOut(world, self, reserve.slot, partyFeet(selfBody));
                if (sent.ok && sent.ref) recipient = world.actor(sent.ref);
                if (!recipient) { lone(); finish(action); return; }
                switched = true;
            }
            if (!recipient || !world.valid(recipient)) { lone(); finish(action); return; }
            const allyStart = world.observe(recipient);
            if (allyStart === null) { lone(); finish(action); return; }
            const to = allyStart.position();

            // 递棒：短棒沿施法者与接收者的真实端点逐刻推进，抵达后才真正转交。
            const distance = to.minus(origin).length();
            const steps = Math.max(3, Math.min(8, Math.round(distance)));
            let travelled = 0, previous = origin;

            function handoff(current: CombatAction): void {
                const scope = current.world();
                scenes.stop(current, "stream");
                if (!scope.valid(recipient!) || !scope.friendly(recipient!)) { finish(current); return; }
                const plan = batonpassPlan(scope, self, recipient!, carry);
                let gains = 0, losses = 0, moved = 0;
                for (let index = 0; index < plan.length; index++) {
                    const carried = NativeEffects.transferStage(scope, self, recipient!, plan[index].stat, plan[index].amount, switched);
                    if (carried <= 0) continue;
                    if (plan[index].amount > 0) gains += carried; else losses += carried;
                    moved += carried;
                }
                const left = Math.max(0, carry - moved);
                if (left > 0) { const buffs = MobEffects.transfer(scope, self, recipient!, left); gains += buffs; moved += buffs; }
                if (moved <= 0) {
                    if (switched) partyRecall(scope, recipient!);
                    lone(); finish(current); return;
                }
                const ally = scope.observe(recipient!);
                const point = ally === null ? to : ally.position();
                const intensity = Math.max(0.7, Math.min(2, 0.7 + moved / 3));
                MobEffects.apply(scope, recipient!, batonpassEffect, mark, 0);
                if (switched) {
                    // The old actor is recalled below: hand the visuals to bounded receipts that survive it.
                    scope.presentFor("batonpass:lend:" + current.id(), batonpassScene, 1, point,
                        JSON.stringify({ moment: "lend", target: String(recipient!.ref()), motes: motes, moved: moved, intensity: intensity, scale: scale }), 28);
                    scope.presentFor("batonpass:text:" + current.id(), "world_combat:feedback", 1, point.plus(WorldCombat.point(0, 1.3, 0)),
                        JSON.stringify({ kind: "world-text", start: scope.tick(), duration: 30, key: batonpassText, args: [gains, losses] }), 30);
                    scope.sound("minecraft:entity.allay.item_given", point, 16, "{}");
                    if (partyRecall(scope, self)) { settled = true; return; }
                    finish(current); return;
                }
                scenes.show(current, "lend", point, { moment: "lend", target: String(recipient!.ref()), motes: motes, moved: moved, intensity: intensity, scale: scale });
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), batonpassText, [gains, losses], 30);
                scope.sound("minecraft:entity.allay.item_given", point, 16, "{}");
                if (withdraw > 0) { batonpassStep(current, point, withdraw, scenes, scale, finish); return; }
                finish(current);
            }

            function travel(current: CombatAction): void {
                const scope = current.world(), at = scope.observe(recipient!);
                if (at === null || !batonpassPartner(current)) { finish(current); return; }
                const end = at.position();
                const now = origin.plus(end.minus(origin).scale(Math.min(1, (travelled + 1) / steps)));
                scenes.show(current, "stream", origin, { moment: "stream", target: String(recipient!.ref()),
                    path: [[previous.x(), previous.y(), previous.z()], [now.x(), now.y(), now.z()]], motes: motes, scale: scale });
                previous = now; travelled++;
                if (travelled < steps) { current.after(1, travel); return; }
                handoff(current);
            }
            // 后备已召出：同一回调完成转交/失败撤回，动作取消不能留下半次交接。
            if (switched) handoff(action); else travel(action);
        }
    });
}
