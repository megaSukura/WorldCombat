/**
 * 逆鳞 / outrage 的出手方式。
 *
 * 核心念头：认准一个对手，低头一次一次地撞过去，越撞越凶，最后一撞把怒气全压进去；撞完自己晕头转向。
 *   它的身份是「锁定」——只认最初盯上的那个对手，把它顶飞了也要再追上去撞；撞不到别的目标不是失误，是它根本不看别人。
 *
 * 三幕（run 自管节奏，提交前只观察与预告）：
 *   起（提交前）：低头蓄势、龙气向内收拢，只播预告；目标不在了就当场作废，不花 PP。
 *   撞（提交后）：`strikes` 次冲撞。每一撞先垫进 `lunge` 格、沿朝向扫出一条与判定同顶点的走廊，
 *       走廊里最近的一名敌人吃一记 `claw` 接触伤害并被顶开 `push` 格；最后一撞另乘 `finisher`。
 *       两撞之间隔 `gap` 刻，期间龙气不断变亮，玩家能读出还剩几次。
 *   晕（结束）：撞完给自己挂共享身份世界 combat:status/confusion（载体本单元自己的 effect），
 *       恍惚期间每次想出手都可能被打散、还被怒气反噬掉一点血——这是乱撞的代价。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、状态（真实 MobEffect）、位移
 * （displace）都走同一条路。
 */
namespace PokemonSkills {
    /** 一次冲撞扫过的走廊四角：origin 起、朝 direction 长 length、半宽 half；判定与表现共用。 */
    function outrageLane(origin: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(length));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 水平朝向：从 from 指向 to，纯 x/z；三点重叠时返回 null。 */
    function outrageAim(from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const delta = WorldCombat.point(to.x() - from.x(), 0, to.z() - from.z());
        return delta.length() < 1e-4 ? null : delta.unit();
    }

    /** 锁定的对手：先认住记下的那个，它不在了才在 14 格内重新挑最近的可见敌人。 */
    function outrageFoe(world: CombatWorld, actor: CombatActor, ref: string | null): CombatActor | null {
        if (ref) {
            const held = world.actor(ref);
            if (held !== null && world.valid(held) && !world.friendly(held)) {
                const facts = world.observe(held);
                if (facts !== null && facts.visible() && facts.health() > 0) return held;
            }
        }
        const self = world.observe(actor);
        if (self === null) return null;
        const near = world.query(self.position(), 14, false);
        let best: CombatActor | null = null, bestDistance = 1e9;
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || !facts.visible() || facts.health() <= 0) continue;
            const distance = facts.position().minus(self.position()).length();
            if (distance < bestDistance) { bestDistance = distance; best = other; }
        }
        return best;
    }

    interface OutrageState { ref: string | null; left: number; strikes: number; index: number; }

    function outrageSpent(current: CombatAction, state: OutrageState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(outrageId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(outrageId, "fumble", current))) * 100);
        if (body !== null) {
            CombatStatus.apply(world, actor, "confusion", outrageDaze, ticks, fumble, { unique: true });
            WorldFeedback.emit(world, outrageScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), outrageDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
        current.finish();
    }

    function outrageStrike(current: CombatAction, state: OutrageState): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { current.finish(); return; }
        const radius = Math.max(0.45, Math.min(0.95, p(outrageId, "radius", current)));
        const reach = Math.max(1.0, p(outrageId, "reach", current));
        const lunge = Math.max(0, p(outrageId, "lunge", current));
        const push = Math.max(0, p(outrageId, "push", current));
        const grains = Math.max(6, Math.round(p(outrageId, "grains", current)));
        const final = state.left <= 1;
        const power = p(outrageId, "claw", current) * (final ? p(outrageId, "finisher", current) : 1);
        const intensity = Math.max(0.6, Math.min(2.6, power / 40));
        const scale = Math.max(0.7, Math.min(1.9, radius / 0.6));

        const victim = outrageFoe(world, actor, state.ref);
        const victimBody = victim !== null ? world.observe(victim) : null;
        let direction = victimBody !== null ? outrageAim(self.position(), victimBody.position()) : null;
        if (direction === null) direction = outrageAim(self.position(), self.position().plus(current.direction()));
        if (direction === null) direction = WorldCombat.point(0, 0, 1);
        state.ref = victim !== null ? String(victim.ref()) : null;

        // 垫前一步：最多贴到判定边缘，避免一步冲过头。
        const gap = victimBody !== null ? Math.max(0, self.position().minus(victimBody.position()).length() - radius - 0.25) : 0;
        const forward = Math.min(lunge, gap);
        if (forward > 0.05) world.displace(actor, direction.scale(forward));
        const moved = world.observe(actor);
        const origin = moved !== null ? moved.position() : self.position();
        const laneLength = victimBody !== null
            ? Math.max(radius + 0.5, Math.min(reach, origin.minus(victimBody.position()).length() + radius + 0.35))
            : reach;
        const path = outrageLane(origin, direction, laneLength, radius);

        WorldFeedback.keep(world, outrageId + ":fury:" + String(actor.ref()), outrageScene, 1, origin,
            { moment: "fury", target: state.ref === null ? String(actor.ref()) : state.ref, index: state.index,
                left: state.left, strikes: state.strikes, grains: grains, scale: scale, intensity: intensity }, 6);
        WorldFeedback.emit(world, outrageScene, 1, origin,
            { moment: "charge", target: state.ref === null ? String(actor.ref()) : state.ref, index: state.index,
                left: state.left, path: path, direction: [direction.x(), direction.y(), direction.z()],
                grains: grains, scale: scale, intensity: intensity }, 20);
        sound(current, "cobblemon:move.dragonclaw.actor");

        let struck = false;
        let hitPoint: CombatPoint = origin;
        WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, laneLength, radius, { below: 1.6, above: 2.4 }),
            function (target, facts) {
                if (struck) return;
                if (hurt(current, target, outrageId, power, { damage: damageSpec(outrageId, "claw"), contact: true })) {
                    struck = true; hitPoint = facts.position();
                    world.displace(target, direction.scale(push));
                }
            });

        if (struck) {
            WorldFeedback.emit(world, outrageScene, 1, hitPoint,
                { moment: "claw", target: state.ref === null ? String(actor.ref()) : state.ref, final: final ? 1 : 0,
                    grains: grains, scale: scale, intensity: intensity }, 26);
            WorldFeedback.text(world, hitPoint.plus(WorldCombat.point(0, 1.4, 0)),
                final ? outrageFinisherText : outrageHitText, [Math.round(power)], 28);
            sound(current, "cobblemon:impact.dragon");
            sound(current, "minecraft:entity.player.attack.strong");
        } else {
            WorldFeedback.emit(world, outrageScene, 1, origin.plus(direction.scale(radius + 0.4)),
                { moment: "whiff", index: state.index, grains: grains, scale: scale, intensity: intensity * 0.7 }, 20);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), outrageChargeText, [], 22);
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(6, Math.round(p(outrageId, "gap", current)));
            current.after(pause, function (next: CombatAction) { outrageStrike(next, state); });
        } else {
            outrageSpent(current, state);
        }
    }

    define({
        id: outrageId,
        name: "Outrage",
        description: "锁定一个对手，低头一次一次撞过去：每撞造成接触伤害并把目标顶开，最后一撞另乘终结倍率；撞完自己陷入恍惚，出手可能被打散。穷追式冲得更远、终结更重，但更慢、恍惚更久。",
        uses: ["黏住一个关键目标，把它连续顶离阵形", "在目标残血时用终结撞收尾", "用高额连续接触伤害压低一个对手"],
        kind: "enemy",
        range: 4.6,
        maxRange: 7.0,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 42,
        maximumTicks: 260,
        style: "rush",
        interruptible: false,
        defaults: { relentless: false, ai: { maxChase: 10, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(outrageId, "reach", pokemon), geometry: "line", style: "rush", color: 0xD2453A,
                label: config && config.relentless === true ? "逆鳞·穷追" : "逆鳞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[outrageId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(outrageId, "tempo", context)),
                recover: Math.round(p(outrageId, "recover", context)),
                cooldown: Math.round(p(outrageId, "recharge", context)),
                active: 0,
                range: p(outrageId, "reach", context)
            };
        },
        run: function (action, move, config) {
            const relentless = !!(config && config.relentless);
            const prepare = Math.max(3, Math.round(p(outrageId, "tempo", action)));
            action.present(outrageId + ":windup", outrageScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", relentless: relentless ? 1 : 0 }));
            action.after(prepare, function (current: CombatAction) {
                const target = current.target();
                if (target === null || !current.sense().valid(target)) { current.reject("target-left"); return; }
                const cooldown = Math.max(1, Math.round(p(outrageId, "recharge", current)));
                current.commit(cooldown);
                const strikes = Math.max(2, Math.min(3, Math.round(p(outrageId, "strikes", current))));
                const state: OutrageState = { ref: String(target.ref()), left: strikes, strikes: strikes, index: 0 };
                sound(current, "minecraft:entity.ender_dragon.growl");
                outrageStrike(current, state);
            });
        }
    });

    // 失手反应：共享门禁掷中后出手作废；怒气反噬、恍惚续上（本单元的失败反应）。
    WorldCombat.on(outrageId + ":fumble", "world_combat:action_rejected", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "confused" && String(data.details && data.details.status) !== "confusion") return;
        const world = event.world(), actor = event.actor();
        // The rejection details name the exact carrier that rolled the fumble, so a stack of confusion sources
        // cannot make one rejection fire several units' punishments.
        const carrier = data.details && data.details.effect !== undefined ? String(data.details.effect) : "";
        if (carrier && carrier !== outrageDaze) return;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== outrageDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00012));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                const remaining = Math.max(0, effect.duration() - world.tick());
                CombatStatus.apply(world, actor, "confusion", outrageDaze, Math.max(60, remaining), effect.amplifier(), { unique: true });
                WorldFeedback.emit(world, outrageScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), outrageChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，让出本体视线。
    WorldCombat.on(outrageId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== outrageDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, outrageId + ":dizzy:" + String(actor.ref()), outrageScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
