/**
 * 睡觉 / Rest —— 执行组织。
 *
 * 核心念头：就地睡进一个可被打断的窗口；睡满才彻底恢复，中途被打醒只能按睡到的比例回，还带着一身起床气。
 *
 * 出手：共享节奏。windup 播放下沉的睡意；ready 在提交前拒绝「已经睡着」和「没什么可恢复」。
 * 结果：提交后施加共享睡眠（真实 MC 效果 world_combat:sleep，宝可梦层同步为原生异常），随后逐刻守着：
 *   睡满则按 heal 回复缺失生命、治愈全部有害状态效果，并在沉睡档获得「神清气爽」；被任何伤害惊醒则按
 *   elapsed/duration 的比例回复、追加 minecraft:slowness。睡着期间无法行动。
 * 反制：准备期可被打断且不花 PP；睡着后任意一次伤害就能惊醒，砍掉回复并让施法者迟缓；小憩档更快但报酬更低。
 * 表现：不画任何保护圈；脚边与头顶的呼吸泡随已睡比例放慢变大，被惊醒只留一记短破裂，回血与清状态按实际
 *   结算数值浮字。
 */
namespace PokemonSkills {
    const restScene = "world_combat:move_rest";
    const restTextSleep = "world_combat.move.rest.text.sleep";
    const restTextWake = "world_combat.move.rest.text.wake";
    const restTextGroggy = "world_combat.move.rest.text.groggy";
    const restTextRefreshed = "world_combat.move.rest.text.refreshed";
    const restRefreshedEffect = "world_combat:refreshed";

    function restAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.7, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal，其他战斗者直接写 MC 生命。 */
    function restApplyHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number): number {
        var amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            var pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, "rest");
        } else {
            healed = world.health(self, amount, "world_combat:rest");
        }
        var after = world.observe(self);
        if (healed > 0 && after) feedback(world, self, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    function restCure(world: CombatWorld, self: CombatActor): number {
        return CombatStatus.cureHarmful(world, self);
    }

    /** 睡姿表现：ratio 是已睡比例，驱动「呼吸泡」随进度放慢变大，让玩家从画面读出回血比例。 */
    function restSleepBody(self: CombatActor, duration: number, shortNap: boolean, ratio: number) {
        var progress = Math.max(0, Math.min(1, ratio));
        return { moment: "sleep", target: String(self.ref()), deep: !shortNap, ratio: progress,
            breath: Math.max(3, Math.round(9 - 5 * progress)), breathSize: Math.round((0.1 + 0.1 * progress) * 100) / 100 };
    }

    define({
        freeMovement: true,
        id: restId, name: "睡觉",
        description: "就地睡下，睡着期间无法行动；睡满后回复全部缺失的生命、治愈身上全部异常并获得移动加速，中途被任何伤害打醒只按睡到的比例回复，但异常仍会治愈、还会迟缓一阵。",
        uses: ["在安全窗口里回满", "清掉身上的异常状态", "睡满后带着加速重新投入战斗"],
        kind: "self", range: 0, prepare: 12, active: 0, recover: 10, cooldown: 300, style: "rest", maximumTicks: 400,
        defaults: { shortNap: false },
        fields: [flag("shortNap", "浅眠小憩")],
        indicator: function (config) { return { radius: 1, style: "rest", label: config.shortNap === true ? "小憩" : "沉睡" }; },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[restId], detail: { values: config }, world: world || null, actor: actor || null };
            var shortNap = config.shortNap === true;
            return {
                prepare: p(restId, "prepare", context),
                recover: Math.max(0, p(restId, "recover", context) - (shortNap ? 2 : 0)),
                cooldown: Math.round(p(restId, "cooldown", context) * (shortNap ? 0.8 : 1)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (CombatStatus.has(world, self, "sleep")) return "already-asleep";
            if (body.health() >= body.maxHealth() - 0.01 && !CombatStatus.hasHarmful(world, self)) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("rest:windup", restScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var shortNap = config.shortNap === true;
            var duration = Math.max(20, Math.round(p(restId, "sleepTicks", action) * (shortNap ? 0.55 : 1)));
            var healFraction = p(restId, "heal", action);
            var missing = Math.max(0, body.maxHealth() - body.health());
            sound(action, "minecraft:block.beacon.deactivate");
            if (!CombatStatus.inflict(world, self, "sleep", duration)) {
                var early = restApplyHeal(world, self, missing, healFraction * 0.5);
                WorldFeedback.emit(world, restScene, 1, body.position(),
                    { moment: "wake", target: String(self.ref()), complete: false, ratio: 0.5,
                        healed: Math.round(early * 10) / 10, cured: 0, burst: 10 }, 26);
                WorldFeedback.text(world, restAbove(body.position()), restTextGroggy, [Math.round(early * 10) / 10, 0], 30);
                done(action);
                return;
            }
            WorldFeedback.emit(world, restScene, 1, body.position(), restSleepBody(self, duration, shortNap, 0), duration);
            WorldFeedback.text(world, restAbove(body.position()), restTextSleep, [], 30);
            var start = world.tick(), settled = false;
            function step(current: CombatAction): void {
                if (settled) return;
                var access = current.world();
                if (!access.valid(self)) { settled = true; done(current); return; }
                var now = access.observe(self);
                if (!now) { settled = true; done(current); return; }
                var elapsed = access.tick() - start;
                if (CombatStatus.has(access, self, "sleep") && elapsed < duration + 2) {
                    if (elapsed % 8 === 0)
                        access.present("rest:sleep", restScene, 1, now.position(),
                            JSON.stringify(restSleepBody(self, duration, shortNap, Math.max(0, Math.min(1, elapsed / duration)))));
                    current.after(1, step);
                    return;
                }
                settled = true;
                var ratio = Math.max(0, Math.min(1, elapsed / Math.max(1, duration)));
                var healed = restApplyHeal(access, self, missing, healFraction * ratio);
                var cured = restCure(access, self);
                var complete = ratio >= 0.98;
                var amount = Math.round(healed * 10) / 10;
                if (complete && !shortNap) {
                    MobEffects.apply(access, self, restRefreshedEffect, Math.round(p(restId, "refreshTicks", current)), 0);
                    sound(current, "minecraft:entity.player.levelup");
                    WorldFeedback.emit(access, restScene, 1, now.position(), { moment: "refreshed", target: String(self.ref()), burst: 24 }, 36);
                    WorldFeedback.text(access, restAbove(now.position()), restTextRefreshed, [], 30);
                }
                if (!complete)
                    MobEffects.apply(access, self, "minecraft:slowness", Math.round(p(restId, "wakeSlowTicks", current)), 0);
                WorldFeedback.emit(access, restScene, 1, now.position(),
                    { moment: "wake", target: String(self.ref()), complete: complete, ratio: ratio,
                        healed: amount, cured: cured, burst: Math.round(8 + 40 * ratio) }, 30);
                WorldFeedback.text(access, restAbove(now.position()), complete ? restTextWake : restTextGroggy, [amount, cured], 30);
                done(current);
            }
            action.after(1, step);
        }
    });
}
