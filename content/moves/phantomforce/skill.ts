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
 *       同时隐去身形；影罩表现在这条守护效果上，相位一结束（或被提前驱散）一起收。
 *   现（execute 后半）：`kind: "aim"`——指定敌人时，在它身后一处 freeSpace 认可的可站位置现身，
 *       先把目标身上所有守护一并震碎（最多 wardBreak 层），再于真实接触位置结算这一记接触伤害；
 *       落点放不下、隔墙或够不着就留在原地挥空，不破守护、不结算。只给一个点时朝它短闪一段空斩，同样不结算。
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
            // 影罩表现绑在这条真实守护效果本身：它自然到期或被驱散时一起收，不会多播一段。
            WorldFeedback.onEffect(world, effect.id(), "phantomforce:veil:" + String(effect.target().ref()), phantomforceScene, 1,
                body.position(), { moment: "veil", target: String(effect.target().ref()) });
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
        description: "撕开一道影子裂隙滑进灵界、短暂消失，再从目标身后的可站立位置现身劈下：现身那一刻把目标身上的守护震碎，再劈出这一记接触伤害——落点被挡住、或目标不在实际接触范围内就只挥空。只朝一个点发动时，相位结束后朝那个方向短闪一段、挥空收势，不破守护也不结算伤害。消失期间看不出也打不着。",
        uses: ["穿过守住／看破／广域防守／硬化这类守护", "消失一拍躲开点名，再贴身反击", "从防守者身后开刀", "朝一个点短闪空斩、拉开身位"],
        kind: "aim", range: 7, maxRange: 9, prepare: 8, active: 1, recover: 8, cooldown: 34,
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
            const aimPoint = action.targetPosition();
            const vanishTicks = Math.max(4, Math.round(p(phantomforceId, "vanishTicks", action)));
            const window = vanishTicks + 24;
            const radius = p(phantomforceId, "strikeRadius", action);
            const power = p(phantomforceId, "rift", action);
            const behind = p(phantomforceId, "behindOffset", action);
            const blink = p(phantomforceId, "blink", action);
            const budget = Math.max(1, Math.round(p(phantomforceId, "wardBreak", action)));
            const scale = radius / phantomforceReferenceRadius;
            const home = body.position();
            let finished = false, guardEffect = 0;

            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                const live = current.world();
                MobEffects.consume(live, actor, phantomforceVeil);
                // 相位结束就收回这一层守护，veil 表现随之一起清理。
                if (guardEffect) live.operation(guardEffect, "world_combat:dispel", "{}");
                done(current);
            }
            /** 现身失败或只朝点发动：留在可站的落点挥空，不破守护、不结算伤害。 */
            function airSlash(current: CombatAction, at: CombatPoint, reason: string): void {
                const live = current.world();
                WorldFeedback.emit(live, phantomforceScene, 1, at,
                    { moment: reason === "no-target" ? "air" : "whiff",
                        target: target === null ? "" : String(target.ref()), scale: scale, reason: reason }, 30);
                WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), phantomforceWhiffText, [], 24);
                live.sound("minecraft:entity.enderman.teleport", at, 14, "{}");
                finish(current);
            }
            function strike(current: CombatAction): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const victimBody = target !== null && live.observe(target) !== null ? live.observe(target) : null;
                const selfFeet = self.position().minus(WorldCombat.point(0, self.height() * 0.5, 0));
                let desired: CombatPoint, aimAt: CombatPoint;
                if (victimBody !== null) {
                    // 锁在目标身后一步，取脚底高度落在可站地面上。
                    const at = victimBody.position();
                    aimAt = at;
                    const flat = WorldCombat.point(at.x() - self.position().x(), 0, at.z() - self.position().z());
                    const heading = flat.length() < 0.01 ? WorldGeometry.flatUnit(current.direction()) : flat.unit();
                    desired = at.minus(WorldCombat.point(0, victimBody.height() * 0.5, 0))
                        .plus(WorldCombat.point(heading.x() * behind, 0, heading.z() * behind));
                } else {
                    // 没有实体：只朝瞄点短闪一段做空斩，不破守护也不结算伤害。
                    aimAt = aimPoint;
                    const flat = WorldCombat.point(aimPoint.x() - self.position().x(), 0, aimPoint.z() - self.position().z());
                    const heading = flat.length() < 0.01 ? WorldGeometry.flatUnit(current.direction()) : flat.unit();
                    const lead = Math.min(Math.max(0, flat.length()), blink);
                    desired = selfFeet.plus(WorldCombat.point(heading.x() * lead, 0, heading.z() * lead));
                }
                // 现身只能在 freeSpace 认可的位置；放不下就留在原处挥空。
                const spot = LivingActions.freeSpot(live, desired, self.width(), self.height(), 2);
                if (spot === null) { airSlash(current, victimBody !== null ? aimAt : desired, "no-room"); return; }
                if (!live.teleport(actor, spot)) { airSlash(current, home, "blocked"); return; }
                const moved = live.observe(actor);
                const landing = moved === null ? spot : moved.position();
                if (victimBody === null || target === null || !live.valid(target)) { airSlash(current, landing, "no-target"); return; }
                const at = victimBody.position();
                // 破守护与伤害都发生在真实接触位置：现身点到目标要通视，且这一刀够得着。
                const contact = live.clear(landing, at) && landing.minus(at).length() <= behind + radius + 0.6;
                if (!contact) { airSlash(current, landing, "no-contact"); return; }
                let broken = 0;
                const guards = GuardEffects.barriers(live, target);
                for (let index = 0; index < guards.length && broken < budget; index++) {
                    if (live.operation(guards[index].id(), "world_combat:dispel", "{}")) broken++;
                }
                if (broken > 0) {
                    WorldFeedback.emit(live, phantomforceScene, 1, at, { moment: "shatter", target: String(target.ref()),
                        scale: scale, broken: broken, wards: Math.max(4, broken * 6) }, 28);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.2, 0)), phantomforcePierceText, [broken], 34);
                    live.sound("minecraft:block.glass.break", at, 14, "{}");
                }
                const landed = hurt(current, target, phantomforceId, power, { damage: damageSpec(phantomforceId, "rift"), contact: true });
                WorldFeedback.emit(live, phantomforceScene, 1, at, { moment: landed ? "strike" : "whiff",
                    target: String(target.ref()), scale: scale, broken: broken,
                    intensity: 1 + Math.min(1.2, broken * 0.35) }, 34);
                if (landed && broken === 0) WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.15, 0)), phantomforceStrikeText, [], 28);
                else if (!landed && broken === 0) WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), phantomforceWhiffText, [], 26);
                live.sound(landed ? "cobblemon:impact.ghost" : "minecraft:entity.enderman.teleport", at, 16, "{}");
                finish(current);
            }

            sound(action, "minecraft:entity.enderman.teleport");
            WorldFeedback.emit(world, phantomforceScene, 1, home, { moment: "fade", vanish: vanishTicks, scale: scale }, 30);
            guardEffect = GuardEffects.apply(world, actor, { rule: phantomforceRule, mode: "pool", capacity: 1000000000, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0 }, window);
            MobEffects.apply(world, actor, phantomforceVeil, window, 0);
            MobEffects.apply(world, actor, "minecraft:invisibility", vanishTicks + 10, 0);
            action.after(vanishTicks, function (next) { strike(next); });
        }
    });
}
