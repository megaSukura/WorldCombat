/**
 * 潜灵奇袭 / phantomforce —— 世界内的动作。
 *
 * 核心念头：从原地撕开一道影子裂隙滑进灵界，短暂从世界上消失；再从目标身后的裂隙里现身，越过它的守护
 * 一刀劈下——守护在灵体穿过的那一刻碎掉。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（提交前 windup）：身周聚起收束的影，可免费打断、不花 PP。
 *   潜（execute 前半）：滑进裂隙——身上挂着真实的 `world_combat:phantomforce_veil`（共享身份
 *       world_combat:status/phantomforce）与一层整段吸收的守护（GuardEffects 池，身份 world_combat:phantomforce），
 *       同时隐去身形；这段时间看不出也打不着。
 *   现（execute 后半）：在目标身后撕开裂隙现身，先把目标身上所有守护一并震碎（最多 wardBreak 层），
 *       再结算这一记接触伤害。目标走开就扑空。
 *
 * 与同族分开：挖洞是锁点破土的范围掀飞，潜灵奇袭是贴着敌人、穿过守护的单体劈击；与暗影球/暗影之骨这类
 * 直接打的幽灵招也不同，它是「先消失、再从守护里穿出来」的两拍。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、位移（world.displace）与
 * 守护（GuardEffects → world_combat:damage_incoming）都走同一条路。
 */
namespace PokemonSkills {
    /** 消失期间的影罩：只挡敌对来源，自身来源（灼伤、坠落）不消耗它。 */
    GuardEffects.register(phantomforceRule, {
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            WorldFeedback.keep(world, "phantomforce:veil:" + String(effect.target().ref()), phantomforceScene, 1, body.position(),
                { moment: "veil", target: String(effect.target().ref()) }, 18);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const source = incoming.source && world.observe(incoming.source);
            WorldFeedback.emit(world, phantomforceScene, 1, body.position(),
                { moment: "phase", target: String(effect.target().ref()),
                    from: source === null ? "" : String(incoming.source!.ref()) }, 20);
            world.sound("minecraft:entity.vex.hurt", body.position(), 14, "{}");
        }
    });

    define({
        freeMovement: true,
        id: phantomforceId,
        cooldownParameter: "recharge", name: "潜灵奇袭",
        description: "撕开一道影子裂隙滑进灵界、短暂消失，再从目标身后的裂隙里现身劈下：现身那一刻把目标身上的守护震碎，再劈出这一记接触伤害。消失期间看不出也打不着。",
        uses: ["穿过守住／看破／广域防守／硬化这类守护", "消失一拍躲开点名，再贴身反击", "从防守者身后开刀"],
        kind: "enemy", range: 7, maxRange: 9, prepare: 8, active: 1, recover: 8, cooldown: 34,
        style: "ghost", stationary: true, maximumTicks: 200,
        defaults: { deep: false, ai: { maxChase: 12, breakGuard: true, leaveStation: false } },
        fields: [field(pathOf("deep"), "深潜式", "boolean", {
            help: "开启（深潜式）：在裂隙里多停近七成时间，多震碎一层守护，但现身威力 ×0.85、起手与冷却更长——更安全，也更给对手走位的时间；关闭（掠影式）：出入更快、这一刀更重，但消失的窗口更短。"
        })],
        indicator: function (config) {
            return { radius: 0.9, geometry: "line", style: "ghost", color: 0x6B4FA8,
                label: config && config.deep === true ? "潜灵奇袭 · 深潜" : "潜灵奇袭 · 掠影" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[phantomforceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(phantomforceId, "tempo", context)),
                recover: Math.round(p(phantomforceId, "settle", context)),
                cooldown: Math.round(p(phantomforceId, "recharge", context)),
                active: 1,
                range: skills[phantomforceId].range
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("phantomforce-fade", phantomforceScene, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "fade", deep: config && config.deep === true ? 1 : 0, source: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const target = action.target();
            const vanishTicks = Math.max(4, Math.round(p(phantomforceId, "vanishTicks", action)));
            const window = vanishTicks + 24;
            const radius = p(phantomforceId, "strikeRadius", action);
            const power = p(phantomforceId, "rift", action);
            const behind = p(phantomforceId, "behindOffset", action);
            const budget = Math.max(1, Math.round(p(phantomforceId, "wardBreak", action)));
            const scale = radius / phantomforceReferenceRadius;
            const home = body.position();
            let finished = false;

            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                MobEffects.consume(current.world(), actor, phantomforceVeil);
                done(current);
            }
            function strike(current: CombatAction): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const victimBody = target !== null && live.observe(target) !== null ? live.observe(target) : null;
                const at = victimBody !== null ? victimBody.position() : action.targetPosition();
                const from = self.position(), gap = at.minus(from);
                const flat = WorldCombat.point(gap.x(), 0, gap.z());
                const heading = flat.length() < 0.01 ? current.direction() : flat.unit();
                // 现身点：目标身后 behind 格；被挡住就退回原地，伤害仍以 hurt 结算。
                const exit = at.plus(WorldCombat.point(heading.x() * behind, 0, heading.z() * behind));
                if (!live.teleport(actor, exit)) live.displace(actor, exit.minus(from));
                let broken = 0;
                if (target !== null && victimBody !== null && live.valid(target)) {
                    const guards = GuardEffects.barriers(live, target);
                    for (let index = 0; index < guards.length && broken < budget; index++) {
                        if (live.operation(guards[index].id(), "world_combat:dispel", "{}")) broken++;
                    }
                }
                let landed = false;
                if (target !== null && victimBody !== null && live.valid(target) && !live.friendly(target)) {
                    landed = hurt(current, target, phantomforceId, power, { damage: damageSpec(phantomforceId, "rift"), contact: true });
                }
                WorldFeedback.emit(live, phantomforceScene, 1, at, { moment: landed ? "strike" : "whiff",
                    target: target === null ? "" : String(target.ref()), scale: scale, broken: broken,
                    intensity: 1 + Math.min(1.2, broken * 0.35) }, 34);
                if (broken > 0) {
                    WorldFeedback.emit(live, phantomforceScene, 1, at, { moment: "shatter", target: target === null ? "" : String(target.ref()),
                        scale: scale, broken: broken, wards: Math.max(4, broken * 6) }, 28);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.2, 0)), phantomforcePierceText, [broken], 34);
                    live.sound("minecraft:block.glass.break", at, 14, "{}");
                } else if (landed) {
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.15, 0)), phantomforceStrikeText, [], 28);
                } else {
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), phantomforceWhiffText, [], 26);
                }
                live.sound(landed ? "cobblemon:impact.ghost" : "minecraft:entity.enderman.teleport", at, 16, "{}");
                finish(current);
            }

            sound(action, "minecraft:entity.enderman.teleport");
            WorldFeedback.emit(world, phantomforceScene, 1, home, { moment: "fade", vanish: vanishTicks, scale: scale }, 30);
            GuardEffects.apply(world, actor, { rule: phantomforceRule, mode: "pool", capacity: 1000000000, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0 }, window);
            MobEffects.apply(world, actor, phantomforceVeil, window, 0);
            MobEffects.apply(world, actor, "minecraft:invisibility", vanishTicks + 10, 0);
            action.after(vanishTicks, function (next) { strike(next); });
        }
    });
}
