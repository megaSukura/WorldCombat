/**
 * 逆鳞 / outrage 的出手方式。
 *
 * 核心念头：认准一个对手，低头一次一次地真撞过去，越撞越凶，最后一撞把怒气全压进去；撞完自己晕头转向。
 *   它持续追逐锁定的对手；身体真的推出去、真的到得了才伤，其他敌人挡在冲撞走廊里就截下这一撞；墙把这一撞挡停。
 *   目标不在了，剩下的次数沿玩家当刻自由 aim 继续撞空，不自动吸向远处的陌生敌人。
 *
 * 出手（`kind: "aim"`）：可锁定一个敌人追击，也可朝方向／世界点空连撞；提交后按住技能键可在撞间重新瞄准。
 *   提交前只观察与预告；目标离场或空放都合法，命中权限仍由命中层判断。
 *
 * 三幕（execute 自管节奏）：
 *   起（windup，提交前）：低头蓄势、龙气向内收拢，只播预告。
 *   撞（execute，提交后）：`strikes` 次。每一撞先在当刻锁定目标／当刻 aim 方向，并把身体快转向该方向，再用
 *       `sweepStep` 让身体真推出去 `reach` 以内的一整段，停在首个身体或墙上；撞到的目标吃一记 `claw` 接触伤害
 *       并被顶开 `push` 格，最后一撞另乘 `finisher` 并在命中处补一圈只有终结才有的环。撞到的是墙就用它真实的
 *       接触点收尾、撞到的是同伴就在那里明确停住，都不再向墙内延伸；空撞照样耗掉本次次数。两撞之间隔 `gap` 刻。
 *   晕（结束）：撞完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect，时长按首次写入的
 *       `dazeTicks`，反噬不再续时）；只有真正挂上才播代价，持续眩晕画面绑在这份载体上随它清理。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害、状态、位移都走同一条路。
 */
namespace PokemonSkills {
    /** 水平朝向：从 from 指向 to，纯 x/z；三点重叠时返回 null。 */
    function outrageAim(from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const delta = WorldCombat.point(to.x() - from.x(), 0, to.z() - from.z());
        return delta.length() < 1e-4 ? null : delta.unit();
    }

    /** 当刻自由瞄准：按住技能键时读控制点（逐撞可转向），否则用当刻输入方向。 */
    function outrageInput(action: CombatAction): CombatPoint | null {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const delta = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(action.origin());
                if (delta.length() >= 0.05) return delta.unit();
            }
        } catch (error) { }
        try {
            const fallback = action.targetPosition().minus(action.origin());
            if (fallback.length() >= 0.05) return fallback.unit();
        } catch (error) { }
        const direction = action.direction();
        return direction.length() < 1e-6 ? null : direction.unit();
    }

    interface OutrageState { ref: string | null; left: number; strikes: number; index: number; }

    // 恍惚存续的托管载体：头顶眩晕气流绑在真实恍惚效果的剩余时间与当前 key 上。
    // 自然到期、牛奶／/effect clear、换上新载体（key 变化）都随它一起停，不靠自己的计时，也不留残影。
    const outrageDazeMark = "world_combat:move_outrage/daze_mark";
    WorldCombat.effect(outrageDazeMark, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid outrage daze carrier key");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function outrageDazeWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        const value = JSON.parse(effect.state());
        const carrier = CombatStatus.representative(world, target, "confusion");
        if (body === null || carrier === null || String(carrier.id()) !== outrageDaze || String(carrier.key()) !== value.key) {
            effect.end(); return;
        }
        WorldFeedback.onEffect(world, effect.id(), "dizzy", outrageScene, 1, body.position(),
            { moment: "dizzy", target: String(target.ref()), fumble: carrier.amplifier() });
        const remaining = carrier.duration() < 0 ? 600 : Math.max(1, Math.min(600, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(outrageDazeMark, "start", outrageDazeWatch);
    WorldCombat.effectHandler(outrageDazeMark, "watch", outrageDazeWatch);
    WorldCombat.effectHandler(outrageDazeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 恍惚被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等下一次巡检。
    WorldCombat.on("world_combat:move_outrage/daze-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== outrageDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, outrageDazeMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    /** 撞完的恍惚：只有这次写入真的挂上才播代价与持续画面；反噬不再续时。 */
    function outrageSpent(current: CombatAction, state: OutrageState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(outrageId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(outrageId, "fumble", current))) * 100);
        if (body !== null) {
            const applied = CombatStatus.apply(world, actor, "confusion", outrageDaze, ticks, fumble, { unique: true });
            if (!applied) return;
            WorldFeedback.emit(world, outrageScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), outrageDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
            const carrier = CombatStatus.representative(world, actor, "confusion");
            const carrierKey = carrier === null ? "" : String(carrier.key());
            world.effects(actor, outrageDazeMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            if (carrierKey) world.effect(outrageDazeMark, actor, JSON.stringify({ key: carrierKey }), ticks);
        }
    }

    function outrageStrike(current: CombatAction, state: OutrageState, scenes: WorldFeedback.ActionScenes, done: (action: CombatAction) => void): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { scenes.finish(current, done); return; }
        const radius = Math.max(0.45, Math.min(0.95, p(outrageId, "radius", current)));
        const reach = Math.max(1.0, p(outrageId, "reach", current));
        const lunge = Math.max(0, p(outrageId, "lunge", current));
        const push = Math.max(0, p(outrageId, "push", current));
        const grains = Math.max(6, Math.round(p(outrageId, "grains", current)));
        const final = state.left <= 1;
        const power = p(outrageId, "claw", current) * (final ? p(outrageId, "finisher", current) : 1);
        const intensity = Math.max(0.6, Math.min(2.6, power / 40));
        const scale = Math.max(0.7, Math.min(1.9, radius / 0.6));

        // 锁定：优先认住已记下的那个对手；它不在了才在当刻目标与当前 aim 之间取方向。
        let victim: CombatActor | null = null;
        if (state.ref !== null) {
            const held = world.actor(state.ref);
            if (held !== null && world.valid(held) && !world.friendly(held)) victim = held;
        }
        if (victim === null) {
            const current0 = current.target();
            if (current0 !== null && world.valid(current0) && !world.friendly(current0)) victim = current0;
        }
        const victimBody = victim !== null ? world.observe(victim) : null;
        let direction = victimBody !== null ? outrageAim(self.position(), victimBody.position()) : outrageInput(current);
        if (direction === null) direction = outrageAim(self.position(), self.position().plus(current.direction()));
        if (direction === null) direction = WorldCombat.point(0, 0, 1);
        state.ref = victim !== null ? String(victim.ref()) : null;
        // 转身与位移协同：先把身体快转向这一撞的方向，再沿同一方向推出去，避免目标绕后时身体未转就反向冲。
        current.face(self.position().plus(direction), 60, 60);

        // 真实冲距：目标在，就一路推到首个身体前；没目标就垫进 `lunge`。不再用小步加无形走廊。
        let charge = lunge;
        if (victimBody !== null) {
            const distance = self.position().minus(victimBody.position()).length();
            charge = Math.max(lunge, Math.min(reach, distance - radius));
        }
        charge = Math.max(0, Math.min(reach, charge));
        if (charge <= 0.05) charge = Math.max(0.4, Math.min(reach, radius + 0.5));

        const before = self.position();
        // 真实推进到首个身体或墙：分段调用 moveSweep（单次上限 4 格），撞到就停，最多一次 contact。
        // 墙的 BLOCK Impact 单独保存，用它的真实接触点收尾，不再从停止点向前延伸。
        let contact: CombatImpact | null = null, wall: CombatImpact | null = null, stopped = false, travelled = 0;
        for (let guard = 0; guard < 8 && travelled < charge - 1e-6; guard++) {
            const leg = Math.min(3.5, charge - travelled);
            const swept = sweepStep(current, direction.scale(leg), radius);
            travelled += swept.moved;
            if (swept.hit.hitEntity()) { contact = swept.hit; break; }
            if (swept.hit.blocked()) { wall = swept.hit; break; }
            if (swept.moved < leg - 1e-6) { stopped = true; break; }
        }
        const after = current.origin();
        const path: number[][] = [[before.x(), before.y() + 0.4, before.z()], [after.x(), after.y() + 0.4, after.z()]];

        sound(current, "cobblemon:move.dragonclaw.actor");

        let struck = false, allyBlocked = false;
        let hitPoint: CombatPoint = after;
        let hitRef = "";
        if (contact !== null) {
            const target = contact.target();
            if (target !== null && world.valid(target) && String(target.key()) !== String(actor.key()) && !world.friendly(target)) {
                if (hurt(current, target, outrageId, power, { damage: damageSpec(outrageId, "claw"), contact: true })) {
                    struck = true; hitPoint = contact.position(); hitRef = String(target.ref());
                    if (world.valid(target)) world.hitDisplace(target, direction.scale(push));
                }
            } else if (target !== null) {
                // 首个身体是同伴：这一撞被它截下，明确停在这里，不再穿过去。
                allyBlocked = true; hitPoint = contact.position(); hitRef = String(target.ref());
            }
        }

        scenes.stop(current, "charge");
        scenes.show(current, "charge", before,
            { moment: "charge", target: state.ref === null ? String(actor.ref()) : state.ref, index: state.index,
                left: state.left, strikes: state.strikes, path: path, direction: [direction.x(), direction.y(), direction.z()],
                grains: grains, scale: scale, intensity: intensity });
        if (struck) {
            WorldFeedback.emit(world, outrageScene, 1, hitPoint,
                { moment: "claw", target: hitRef, final: final ? 1 : 0,
                    grains: grains, scale: scale, intensity: intensity }, 26);
            // 终结额外环只在最后一撞触发，和普通撞击一眼分得开。
            if (final) WorldFeedback.emit(world, outrageScene, 1, hitPoint,
                { moment: "finisher", target: hitRef, grains: grains, scale: scale, intensity: intensity }, 30);
            WorldFeedback.text(world, hitPoint.plus(WorldCombat.point(0, 1.4, 0)),
                final ? outrageFinisherText : outrageHitText, [Math.round(power)], 28);
            sound(current, "cobblemon:impact.dragon");
            sound(current, "minecraft:entity.player.attack.strong");
        } else if (allyBlocked) {
            WorldFeedback.emit(world, outrageScene, 1, hitPoint,
                { moment: "blocked", ally: 1, target: hitRef, grains: grains, scale: scale, intensity: intensity * 0.7,
                    moved: Math.round(travelled * 100) / 100 }, 20);
            WorldFeedback.text(world, before.plus(WorldCombat.point(0, 1.3, 0)), outrageChargeText, [], 22);
        } else if (wall !== null) {
            WorldFeedback.emit(world, outrageScene, 1, wall.position(),
                { moment: "blocked", ally: 0, face: wall.blockFace(), grains: grains, scale: scale, intensity: intensity * 0.7,
                    moved: Math.round(travelled * 100) / 100 }, 20);
            WorldFeedback.text(world, before.plus(WorldCombat.point(0, 1.3, 0)), outrageChargeText, [], 22);
        } else {
            WorldFeedback.emit(world, outrageScene, 1, after,
                { moment: "whiff", index: state.index, grains: grains, scale: scale, intensity: intensity * 0.7,
                    blocked: stopped ? 1 : 0, moved: Math.round(travelled * 100) / 100 }, 20);
            WorldFeedback.text(world, before.plus(WorldCombat.point(0, 1.3, 0)), outrageChargeText, [], 22);
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(6, Math.round(p(outrageId, "gap", current)));
            current.after(pause, function (next: CombatAction) { outrageStrike(next, state, scenes, done); });
        } else {
            outrageSpent(current, state);
            scenes.finish(current, done);
        }
    }

    define({
        freeMovement: true,
        id: outrageId,
        cooldownParameter: "recharge",
        name: "Outrage",
        description: "锁定一个对手，低头一次一次真撞过去：每撞真实推进到首个身体或墙，撞到的目标吃接触伤害并被顶开，最后一撞另乘终结倍率；目标没了就沿当前瞄准继续撞空，撞完自己陷入恍惚，出手可能被打散。",
        uses: ["黏住一个关键目标，把它连续顶离阵形", "在目标残血时用终结撞收尾", "用高额连续接触伤害压低一个对手"],
        kind: "aim",
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
        windup: function (action, config, prepare) {
            const relentless = !!(config && config.relentless);
            action.present(outrageId + ":windup", outrageScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", relentless: relentless ? 1 : 0 }));
            return Math.max(3, Math.round(p(outrageId, "tempo", action)));
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(outrageScene);
            const world = action.world(), actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const strikes = Math.max(2, Math.min(3, Math.round(p(outrageId, "strikes", action))));
            const target = action.target();
            const state: OutrageState = { ref: target !== null ? String(target.ref()) : null, left: strikes, strikes: strikes, index: 0 };
            sound(action, "minecraft:entity.ender_dragon.growl");
            outrageStrike(action, state, scenes, done);
        }
    });

    // 失手反应：共享门禁把出手判给混乱时，按本单元自己的载体身份反噬一次；不续时、不重复。
    CombatStatus.rejected.define({ id: outrageId + "/fumble", apply: function (context) {
        if (context.status !== "confusion") return;
        const carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        if (carrier && carrier !== outrageDaze) return;
        const world = context.world, actor = context.actor;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== outrageDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00012));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                WorldFeedback.emit(world, outrageScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), outrageChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    } });

    // 提交后按住技能键可在撞间重新瞄准；松手结束这次投入。
    WorldCombat.preview("world_combat:" + outrageId, JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
